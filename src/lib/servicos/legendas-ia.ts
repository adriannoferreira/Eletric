import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { anthropic, iaConfigurada, MODELO } from "@/lib/ia/claude";

const Legendas = z.object({
  legendas: z.array(z.object({ indice: z.number().int(), legenda: z.string() })),
});

const ROTULO_ETAPA: Record<string, string> = { antes: "ANTES", durante: "DURANTE", depois: "DEPOIS" };

/**
 * Pede ao Claude uma legenda técnica curta para cada foto (vista pela visão do modelo).
 * Recebe as fotos em data URL (JPEG/PNG/WebP) e devolve a legenda na mesma ordem.
 */
export async function gerarLegendas(
  servico: string,
  fotos: { etapa: string; dados: string }[],
): Promise<{ legendas: string[] } | { erro: string }> {
  if (!iaConfigurada()) return { erro: "A IA ainda não está configurada (ANTHROPIC_API_KEY)." };
  if (fotos.length === 0) return { legendas: [] };

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  fotos.forEach((f, i) => {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(f.dados);
    if (!m) return;
    content.push({ type: "text", text: `Foto ${i} — etapa ${ROTULO_ETAPA[f.etapa] ?? f.etapa}:` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: m[1] as "image/jpeg" | "image/png" | "image/webp", data: m[2] },
    });
  });
  content.push({
    type: "text",
    text: `Serviço executado: "${servico}". Escreva uma legenda para cada foto acima, para um relatório fotográfico técnico entregue ao cliente. Cada legenda: português do Brasil, 1 frase de até 120 caracteres, objetiva, descrevendo o que a foto mostra (componente, situação, problema encontrado ou serviço concluído). Não comece com o nome da etapa (\"Antes:\", \"Depois:\"), pois ela já aparece no relatório. Não invente o que não está visível. Responda com o "indice" de cada foto.`,
  });

  try {
    const resp = await anthropic().beta.messages.parse({
      model: MODELO,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Legendas) },
      system: "Você é um eletricista experiente redigindo relatórios fotográficos de obras elétricas prediais.",
      messages: [{ role: "user", content }],
    });
    if (resp.stop_reason === "refusal") return { erro: "A IA não conseguiu legendar essas fotos." };
    const r = Legendas.safeParse(resp.parsed_output);
    if (!r.success) return { erro: "A resposta da IA veio incompleta. Tente de novo." };
    const limpar = (t: string) => t.trim().replace(/^(antes|durante|depois)\s*[:\-–—]\s*/i, "").slice(0, 200);
    const porIndice = new Map(r.data.legendas.map((l) => [l.indice, limpar(l.legenda)]));
    return { legendas: fotos.map((_, i) => porIndice.get(i) ?? "") };
  } catch (erro) {
    console.error("Erro ao legendar fotos:", erro);
    if (erro instanceof Anthropic.AuthenticationError) return { erro: "Chave da API do Claude inválida." };
    if (erro instanceof Anthropic.RateLimitError) return { erro: "Limite de uso da IA atingido. Aguarde um pouco." };
    return { erro: "Erro ao falar com a IA. Tente de novo em instantes." };
  }
}
