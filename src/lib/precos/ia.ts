import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { OfertaPesquisa } from "@/db/schema-precos";
import { anthropic, iaConfigurada, MODELO } from "@/lib/ia/claude";
import {
  type Especificacao,
  confere,
  converterPreco,
  especificacaoCompleta,
  especificacaoDoItem,
  FAMILIAS,
  inferirVariante,
  limparAtributos,
  nomeVariante,
  resolverVariante,
  textoEspecificacao,
} from "./variantes";

const BETAS = ["server-side-fallback-2026-07-01"];

export class ErroIA extends Error {}

function exigirIA() {
  if (!iaConfigurada()) throw new ErroIA("A IA não está configurada (falta ANTHROPIC_API_KEY).");
}

function mensagemErro(e: unknown) {
  if (e instanceof ErroIA) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return "Chave da API do Claude inválida.";
  if (e instanceof Anthropic.RateLimitError) return "Limite de uso da IA atingido. Tente daqui a pouco.";
  if (e instanceof Anthropic.APIError) return `Erro da IA (${e.status}). Tente de novo.`;
  return "Erro ao falar com a IA. Tente de novo.";
}

/* ---------------------------- Pesquisa de preço --------------------------- */

const Resultado = z.object({
  encontrado: z.boolean().describe("false se não achou preços confiáveis"),
  unidade: z.string().describe("unidade a que os preços se referem, ex.: m, un, rolo 100 m"),
  minimo: z.number().nullable(),
  mediano: z.number().nullable().describe("preço típico/mediano por unidade em R$"),
  maximo: z.number().nullable(),
  fontes: z
    .array(
      z.object({
        loja: z.string(),
        url: z.string(),
        preco: z.number().nullable().describe("preço em R$ na unidade em que a loja vende (campo unidade)"),
        unidade: z.string().describe("unidade da oferta: un, m, rolo 100 m, caixa c/ 10…"),
        produto: z.string().describe("descrição completa do produto como aparece na loja (marca, polos, curva, corrente, seção, cor…)"),
        atributos: z
          .array(z.object({ chave: z.string(), valor: z.string() }))
          .describe("atributos técnicos vistos na oferta, com as mesmas chaves pedidas (ex.: polos=1, curva=C, corrente=20)"),
      }),
    )
    .describe("ofertas encontradas, uma por produto/loja"),
  observacao: z.string().describe("comentário curto em português: premissas, conversões, ressalvas"),
});

export type ResultadoPesquisa = z.infer<typeof Resultado>;

export type PesquisaVariante = {
  encontrado: boolean;
  minimo: number | null;
  mediano: number | null;
  maximo: number | null;
  /** Todas as ofertas, com `confere` indicando se batem com a variante pesquisada. */
  ofertas: OfertaPesquisa[];
  observacao: string;
  especificacao: string;
};

const mediana = (v: number[]) => {
  const o = [...v].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};
const arred2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Confere cada oferta com a variante pedida (família + atributos críticos) e converte a
 * unidade para a do catálogo. Faixa de preço só com as ofertas que conferem.
 */
export function avaliarOfertas(
  r: ResultadoPesquisa,
  pedido: Especificacao | null,
  unidadeItem: string,
): Omit<PesquisaVariante, "observacao" | "especificacao"> {
  const ofertas: OfertaPesquisa[] = r.fontes.map((f) => {
    const vistos = Object.fromEntries(f.atributos.map((a) => [a.chave, a.valor]));
    let atributos: Record<string, string | number> = {};
    let ok = true;
    let divergencias: string[] = [];
    if (pedido) {
      const inferida = inferirVariante(`${f.produto} ${f.loja}`);
      const daIA = limparAtributos(pedido.familia, vistos);
      atributos = { ...(inferida?.familia === pedido.familia ? inferida.atributos : {}), ...daIA };
      const c = confere(pedido, { familia: pedido.familia, atributos });
      ok = c.ok;
      divergencias = c.divergencias;
    }
    const precoConvertido = f.preco == null ? null : converterPreco(f.preco, f.unidade || r.unidade, unidadeItem) ?? (f.unidade ? null : f.preco);
    if (precoConvertido == null && f.preco != null) {
      ok = false;
      divergencias = [...divergencias, "unidade"];
    }
    return { loja: f.loja, url: f.url, preco: f.preco, unidade: f.unidade, precoConvertido, atributos, confere: ok, divergencias };
  });
  const validos = ofertas.filter((o) => o.confere && o.precoConvertido != null && o.precoConvertido > 0).map((o) => o.precoConvertido!);
  if (!validos.length) return { encontrado: false, minimo: null, mediano: null, maximo: null, ofertas };
  return {
    encontrado: true,
    minimo: arred2(Math.min(...validos)),
    mediano: arred2(mediana(validos)),
    maximo: arred2(Math.max(...validos)),
    ofertas,
  };
}

const FERRAMENTA_REGISTRO: Anthropic.Beta.BetaTool = {
  name: "registrar_preco",
  description:
    "Registra o resultado final da pesquisa de preço. Chame exatamente uma vez, no final, depois de pesquisar.",
  strict: true,
  input_schema: (() => {
    const schema: Record<string, unknown> = { ...z.toJSONSchema(Resultado, { target: "draft-7" }) };
    delete schema.$schema;
    return schema as Anthropic.Beta.BetaTool.InputSchema;
  })(),
};

export async function pesquisarPrecoIA(
  item: { nome: string; especificacao: string; unidade: string; tipo: string },
  local: { cidade: string; uf: string },
  variante: Especificacao | null = null,
): Promise<PesquisaVariante> {
  exigirIA();
  const servico = item.tipo === "servico";
  const espec = variante ? textoEspecificacao(variante) : "";
  const chaves = variante ? [...FAMILIAS[variante.familia].criticos, ...FAMILIAS[variante.familia].opcionais].join(", ") : "";
  const regraVariante = variante
    ? `\n\nATENÇÃO: o preço deste material muda com a especificação. Pesquise EXATAMENTE "${nomeVariante(variante)}" (${espec}). Ignore ofertas de outra corrente, polos, curva, seção, classe ou tensão. Para cada oferta, informe em "atributos" as chaves ${chaves} com o valor que aparece no anúncio (deixe de fora o que o anúncio não informa) e copie a descrição do produto em "produto".`
    : "";
  const pedido = servico
    ? `Pesquise quanto eletricistas cobram em ${local.cidade}/${local.uf} (e região metropolitana) pelo serviço: "${item.nome}"${item.especificacao ? ` (${item.especificacao})` : ""}, por ${item.unidade}, só mão de obra. Use sites de orçamento de serviços, tabelas de preço publicadas e anúncios locais. Considere preços de 2025-2026.`
    : `Pesquise o preço atual de varejo, em lojas de material elétrico/construção que entregam em ${local.cidade}/${local.uf} (ou lojas online nacionais se não houver locais), de: "${variante ? nomeVariante(variante) : item.nome}"${item.especificacao ? ` (${item.especificacao})` : ""}. Preço por ${item.unidade}. Em cada oferta informe o preço NA UNIDADE EM QUE A LOJA VENDE (rolo de 100 m, caixa, unidade…) no campo "unidade" — a conversão é feita depois.${regraVariante}`;

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: `${pedido}\n\nFaça poucas buscas objetivas. Ao terminar, chame a ferramenta registrar_preco com mínimo, mediano e máximo em R$ por unidade, e as fontes (loja, URL, preço). Se não encontrar nada confiável, chame com encontrado=false.`,
    },
  ];
  const urlsVistas: { loja: string; url: string }[] = [];

  try {
    for (let rodada = 0; rodada < 5; rodada++) {
      const res = await anthropic().beta.messages.create({
        model: MODELO,
        max_tokens: 16000,
        betas: BETAS,
        fallbacks: "default",
        output_config: { effort: "medium" },
        system:
          "Você é um comprador técnico de material elétrico no Brasil. Responda com dados reais encontrados na web, nunca invente preços ou URLs.",
        tools: [
          {
            type: "web_search_20260209",
            name: "web_search",
            max_uses: 5,
            user_location: { type: "approximate", city: local.cidade, region: "Pará", country: "BR", timezone: "America/Belem" },
          },
          FERRAMENTA_REGISTRO,
        ],
        tool_choice: { type: "auto" },
        messages,
      });

      for (const b of res.content) {
        if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
          for (const r of b.content) {
            if (r.type === "web_search_result") urlsVistas.push({ loja: r.title, url: r.url });
          }
        }
      }

      if (res.stop_reason === "refusal") throw new ErroIA("A IA não conseguiu pesquisar este item.");

      const registro = res.content.find((b) => b.type === "tool_use" && b.name === "registrar_preco");
      if (registro && registro.type === "tool_use") {
        const ok = Resultado.safeParse(registro.input);
        if (ok.success) {
          const r = ok.data;
          if (r.fontes.length === 0) {
            r.fontes = urlsVistas.slice(0, 5).map((u) => ({ ...u, preco: null, unidade: "", produto: u.loja, atributos: [] }));
          }
          const observacao = [r.unidade && `Unidade: ${r.unidade}.`, r.observacao].filter(Boolean).join(" ");
          if (servico || !variante) {
            const precos = r.fontes.map((f) => f.preco).filter((p): p is number => p != null);
            return {
              encontrado: r.encontrado && r.mediano != null,
              minimo: r.minimo,
              mediano: r.mediano,
              maximo: r.maximo,
              ofertas: r.fontes.map((f) => ({
                loja: f.loja,
                url: f.url,
                preco: f.preco,
                unidade: f.unidade,
                precoConvertido: f.preco,
                atributos: {},
                confere: true,
                divergencias: [],
              })),
              observacao: precos.length ? observacao : observacao,
              especificacao: "",
            };
          }
          return { ...avaliarOfertas(r, variante, item.unidade), observacao, especificacao: espec };
        }
        throw new ErroIA("A IA devolveu um resultado inválido. Tente de novo.");
      }

      if (res.stop_reason === "pause_turn") {
        // Pesquisa ainda em andamento no servidor: reenviar para continuar.
        messages.push({ role: "assistant", content: res.content });
        continue;
      }
      if (res.stop_reason === "max_tokens") throw new ErroIA("A resposta da IA foi cortada. Tente de novo.");

      // Terminou sem registrar: pedir o registro explicitamente.
      messages.push({ role: "assistant", content: res.content });
      messages.push({ role: "user", content: "Agora chame registrar_preco com o que você encontrou." });
    }
    throw new ErroIA("A IA não concluiu a pesquisa. Tente de novo.");
  } catch (e) {
    console.error("pesquisarPrecoIA", e);
    throw new ErroIA(mensagemErro(e));
  }
}

/* ---------------------------- Leitura de cotação --------------------------- */

const Cotacao = z.object({
  loja: z.string().describe("nome da loja, se aparecer; senão vazio"),
  itens: z.array(
    z.object({
      descricao: z.string(),
      quantidade: z.number().nullable(),
      unidade: z.string(),
      precoUnitario: z.number().nullable().describe("R$ por unidade (divida o total pela quantidade se só houver total)"),
      atributos: z
        .array(z.object({ chave: z.string(), valor: z.string() }))
        .describe("especificação técnica da linha: polos, curva, corrente, idnMa, classe, ucV, imaxKa, secao, cor, diametro, modulos…"),
      catalogoId: z.number().nullable().describe("id do item do catálogo equivalente, ou null se nenhum for equivalente"),
    }),
  ),
  observacao: z.string(),
});

export type CotacaoExtraida = z.infer<typeof Cotacao>;

type ItemCatalogoCotacao = { id: number; nome: string; unidade: string; tipo?: string; preco?: number; familia?: string | null; atributos?: Record<string, unknown> | null };

/**
 * Garante que cada linha da cotação só aponte para a variante EXATA do catálogo:
 * desfaz associações com outra corrente/seção e, quando a IA não associou, tenta
 * achar a variante pelos atributos lidos.
 */
export function casarLinhasCotacao<T extends { descricao: string; atributos: { chave: string; valor: string }[]; catalogoId: number | null }>(
  itens: T[],
  catalogo: ItemCatalogoCotacao[],
): (T & { especificacao: string })[] {
  const porId = new Map(catalogo.map((c) => [c.id, c]));
  const materiais = catalogo.map((c) => ({ ...c, tipo: c.tipo ?? "material", preco: c.preco ?? 0 }));
  return itens.map((i) => {
    const inferida = inferirVariante(i.descricao);
    const linha: Especificacao | null = inferida
      ? { familia: inferida.familia, atributos: { ...inferida.atributos, ...limparAtributos(inferida.familia, Object.fromEntries(i.atributos.map((a) => [a.chave, a.valor]))) } }
      : null;
    let catalogoId = i.catalogoId != null && porId.has(i.catalogoId) ? i.catalogoId : null;
    if (linha && catalogoId != null) {
      const alvo = especificacaoDoItem(materiais.find((c) => c.id === catalogoId)!);
      if (alvo && alvo.familia === linha.familia && especificacaoCompleta(alvo) && !confere(alvo, linha).ok) catalogoId = null;
    }
    if (linha && catalogoId == null && especificacaoCompleta(linha)) {
      const r = resolverVariante(materiais, linha);
      if (r.status === "ok") catalogoId = r.item.id;
    }
    return { ...i, catalogoId, especificacao: linha ? textoEspecificacao(linha) : "" };
  });
}

export async function extrairCotacaoIA(
  entrada: { texto?: string; arquivo?: { mediaType: string; base64: string } },
  catalogo: ItemCatalogoCotacao[],
): Promise<CotacaoExtraida & { itens: (CotacaoExtraida["itens"][number] & { especificacao: string })[] }> {
  exigirIA();
  const lista = catalogo.map((c) => `${c.id} | ${c.nome} | ${c.unidade}`).join("\n");
  const conteudo: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (entrada.arquivo) {
    if (entrada.arquivo.mediaType === "application/pdf") {
      conteudo.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: entrada.arquivo.base64 },
      });
    } else {
      conteudo.push({
        type: "image",
        source: {
          type: "base64",
          media_type: entrada.arquivo.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: entrada.arquivo.base64,
        },
      });
    }
  }
  conteudo.push({
    type: "text",
    text: `Extraia os itens desta cotação de loja de material elétrico${entrada.texto ? ":\n\n" + entrada.texto : " (anexo acima)."}

Para cada item, informe descrição, quantidade, unidade, preço unitário em R$ e os atributos técnicos (polos, curva, corrente, IΔn, classe, Uc, Imax, seção, cor, diâmetro…). Depois associe ao item equivalente do meu catálogo SOMENTE se for exatamente a mesma especificação (um disjuntor de 20 A não equivale a um de 16 A ou 63 A; cabo de 2,5 mm² não equivale a 4 mm²); se não houver equivalente exato, catalogoId = null.

Meu catálogo (id | nome | unidade):
${lista || "(vazio)"}`,
  });

  try {
    const res = await anthropic().beta.messages.parse({
      model: MODELO,
      max_tokens: 16000,
      betas: BETAS,
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Cotacao) },
      messages: [{ role: "user", content: conteudo }],
    });
    if (res.stop_reason === "refusal") throw new ErroIA("A IA não conseguiu ler esta cotação.");
    if (!res.parsed_output) throw new ErroIA("Não consegui entender a cotação. Tente outra foto ou cole o texto.");
    return { ...res.parsed_output, itens: casarLinhasCotacao(res.parsed_output.itens, catalogo) };
  } catch (e) {
    console.error("extrairCotacaoIA", e);
    throw new ErroIA(mensagemErro(e));
  }
}
