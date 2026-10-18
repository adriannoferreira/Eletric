import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { anthropic, iaConfigurada, MODELO } from "@/lib/ia/claude";

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
        preco: z.number().nullable(),
      }),
    )
    .describe("lojas/sites consultados com o preço visto, em R$ por unidade"),
  observacao: z.string().describe("comentário curto em português: premissas, conversões, ressalvas"),
});

export type ResultadoPesquisa = z.infer<typeof Resultado>;

const FERRAMENTA_REGISTRO: Anthropic.Beta.BetaTool = {
  name: "registrar_preco",
  description:
    "Registra o resultado final da pesquisa de preço. Chame exatamente uma vez, no final, depois de pesquisar.",
  strict: true,
  input_schema: (() => {
    const { $schema: _, ...schema } = z.toJSONSchema(Resultado, { target: "draft-7" });
    return schema as Anthropic.Beta.BetaTool.InputSchema;
  })(),
};

export async function pesquisarPrecoIA(
  item: { nome: string; especificacao: string; unidade: string; tipo: string },
  local: { cidade: string; uf: string },
): Promise<ResultadoPesquisa> {
  exigirIA();
  const servico = item.tipo === "servico";
  const pedido = servico
    ? `Pesquise quanto eletricistas cobram em ${local.cidade}/${local.uf} (e região metropolitana) pelo serviço: "${item.nome}"${item.especificacao ? ` (${item.especificacao})` : ""}, por ${item.unidade}, só mão de obra. Use sites de orçamento de serviços, tabelas de preço publicadas e anúncios locais. Considere preços de 2025-2026.`
    : `Pesquise o preço atual de varejo, em lojas de material elétrico/construção que entregam em ${local.cidade}/${local.uf} (ou lojas online nacionais se não houver locais), de: "${item.nome}"${item.especificacao ? ` (${item.especificacao})` : ""}. Preço por ${item.unidade}. Se a loja vende em rolo/caixa, converta para a unidade pedida e explique na observação.`;

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
          if (r.fontes.length === 0) r.fontes = urlsVistas.slice(0, 5).map((u) => ({ ...u, preco: null }));
          return r;
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
      catalogoId: z.number().nullable().describe("id do item do catálogo equivalente, ou null se nenhum for equivalente"),
    }),
  ),
  observacao: z.string(),
});

export type CotacaoExtraida = z.infer<typeof Cotacao>;

export async function extrairCotacaoIA(
  entrada: { texto?: string; arquivo?: { mediaType: string; base64: string } },
  catalogo: { id: number; nome: string; unidade: string }[],
): Promise<CotacaoExtraida> {
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

Para cada item, informe descrição, quantidade, unidade e preço unitário em R$. Depois associe ao item equivalente do meu catálogo (mesmo produto e especificação — bitola, corrente, polos etc.); se não houver equivalente, catalogoId = null.

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
    const ids = new Set(catalogo.map((c) => c.id));
    return {
      ...res.parsed_output,
      itens: res.parsed_output.itens.map((i) => ({
        ...i,
        catalogoId: i.catalogoId != null && ids.has(i.catalogoId) ? i.catalogoId : null,
      })),
    };
  } catch (e) {
    console.error("extrairCotacaoIA", e);
    throw new ErroIA(mensagemErro(e));
  }
}
