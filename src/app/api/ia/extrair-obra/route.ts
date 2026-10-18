import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CONCESSIONARIAS } from "@/lib/eletrica/concessionarias";
import { PRESETS_CARGA } from "@/lib/eletrica/projeto";
import { iaConfigurada, MODELO } from "@/lib/ia/claude";
import { TIPOS_AMBIENTE } from "@/lib/eletrica/tipos";

const chaves = <T extends object>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

/** Formato que a IA devolve (sem restrições numéricas — validamos depois). */
const ObraExtraida = z.object({
  tipoImovel: z.enum(["casa", "sobrado", "apartamento", "comercio", "outro"]),
  concessionaria: z.enum(CONCESSIONARIAS.map((c) => c.id) as [string, ...string[]]),
  tensoes: z.enum(["127/220", "220/380", "desconhecida"]),
  fornecimentoExistente: z.enum(["desconhecido", "monofasico", "bifasico", "trifasico"]),
  ambientes: z.array(
    z.object({
      nome: z.string(),
      tipo: z.enum(chaves(TIPOS_AMBIENTE)),
      areaM2: z.number(),
      perimetroM: z.number(),
      distanciaM: z.number(),
    }),
  ),
  cargas: z.array(
    z.object({
      nome: z.string(),
      tipo: z.enum(PRESETS_CARGA.map((p) => p.id) as [string, ...string[]]),
      potenciaW: z.number(),
      tensaoV: z.number(),
      trifasico: z.boolean(),
      quantidade: z.number(),
      ambiente: z.string(),
    }),
  ),
  premissas: z.array(z.string()),
});

const Entrada = z.object({ descricao: z.string().trim().min(10).max(8000) });

const SISTEMA = `Você converte a descrição de uma obra residencial/comercial (escrita por um eletricista brasileiro, às vezes com erros de digitação) em dados estruturados para um pré-projeto elétrico.

Regras:
- Liste cada ambiente separadamente (ex.: "2 quartos" vira "Quarto 1" e "Quarto 2"; suíte = quarto + banheiro).
- Se área/perímetro não forem informados, estime valores típicos brasileiros (ex.: quarto 10 m²/13 m, sala 16 m²/16 m, banheiro 3,5 m²/7,5 m, cozinha 8 m²/12 m) e registre a estimativa em "premissas".
- distanciaM = distância estimada do ambiente até o quadro de distribuição (5 a 20 m numa casa comum).
- Cargas de uso específico: use os tipos disponíveis. Ar-condicionado: converta BTU em W (9000≈1000 W, 12000≈1400 W, 18000≈2000 W, 24000≈2700 W). Chuveiro sem potência informada: 7500 W 220 V (ou 5500 W 127 V se disser 127 V). "ambiente" = nome exato de um dos ambientes listados, ou "" se não souber.
- tensaoV da carga: tensão nominal do aparelho (127, 220 ou 380).
- Concessionária: identifique pelo nome ou pela cidade/estado; se não der, use "outra". Tensões: pela concessionária/cidade, ou "desconhecida".
- Não invente equipamentos que não foram mencionados.`;

/** Extrai ambientes e cargas de uma descrição livre da obra (structured outputs). */
export async function POST(req: Request) {
  const dados = Entrada.safeParse(await req.json().catch(() => null));
  if (!dados.success) return Response.json({ erro: "Descreva a obra com pelo menos uma frase." }, { status: 400 });
  if (!iaConfigurada()) {
    return Response.json(
      { erro: "A IA ainda não está ligada (falta ANTHROPIC_API_KEY). Preencha os ambientes e cargas manualmente — o resto funciona normalmente." },
      { status: 503 },
    );
  }

  try {
    const client = new Anthropic();
    const resp = await client.beta.messages.parse({
      model: MODELO,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(ObraExtraida) },
      system: SISTEMA,
      messages: [{ role: "user", content: dados.data.descricao }],
    });
    if (resp.stop_reason === "refusal") {
      return Response.json({ erro: "A IA não conseguiu interpretar essa descrição. Reformule e tente de novo." }, { status: 422 });
    }
    const obra = ObraExtraida.safeParse(resp.parsed_output);
    if (!obra.success) {
      return Response.json({ erro: "A resposta da IA veio incompleta. Tente de novo." }, { status: 502 });
    }
    return Response.json({ obra: obra.data });
  } catch (erro) {
    console.error("Erro ao extrair obra:", erro);
    let msg = "Erro ao falar com a IA. Tente de novo em instantes.";
    if (erro instanceof Anthropic.AuthenticationError) msg = "Chave da API do Claude inválida.";
    else if (erro instanceof Anthropic.RateLimitError) msg = "Limite de uso da IA atingido. Aguarde um pouco.";
    else if (erro instanceof Anthropic.APIError) msg = `Erro da IA (${erro.status}). Tente de novo.`;
    return Response.json({ erro: msg }, { status: 502 });
  }
}

export type ObraExtraidaT = z.infer<typeof ObraExtraida>;
