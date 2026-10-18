import Anthropic from "@anthropic-ai/sdk";

export const MODELO = "claude-opus-5-5";

let cliente: Anthropic | null = null;
export function anthropic() {
  cliente ??= new Anthropic();
  return cliente;
}

export function iaConfigurada() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

type Esforco = "low" | "medium" | "high";

/**
 * Chama o Claude em streaming e devolve uma Response de texto puro,
 * para o navegador ir mostrando a resposta enquanto ela é escrita.
 * `aoTerminar` recebe o texto completo (para salvar no banco).
 */
export function respostaEmStream({
  system,
  messages,
  esforco = "medium",
  aoTerminar,
}: {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  esforco?: Esforco;
  aoTerminar?: (texto: string) => Promise<void>;
}) {
  if (!iaConfigurada()) {
    return new Response(
      "A IA ainda não está configurada. Coloque sua chave em ANTHROPIC_API_KEY no arquivo .env.local (veja o README).",
      { status: 503 },
    );
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let texto = "";
      const enviar = (t: string) => {
        texto += t;
        controller.enqueue(encoder.encode(t));
      };
      try {
        const stream = anthropic().beta.messages.stream({
          model: MODELO,
          max_tokens: 32000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          cache_control: { type: "ephemeral" },
          output_config: { effort: esforco },
          system,
          messages,
        });
        for await (const ev of stream) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            enviar(ev.delta.text);
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          enviar("\n\n_Não consegui responder a esse pedido. Tente reformular a pergunta._");
        } else if (final.stop_reason === "max_tokens") {
          enviar("\n\n_(resposta cortada por ser muito longa — peça para continuar)_");
        }
        if (aoTerminar && texto.trim()) await aoTerminar(texto);
      } catch (erro) {
        console.error("Erro na IA:", erro);
        let msg = "Erro ao falar com a IA. Tente de novo em instantes.";
        if (erro instanceof Anthropic.AuthenticationError) msg = "Chave da API do Claude inválida.";
        else if (erro instanceof Anthropic.RateLimitError) msg = "Limite de uso da IA atingido. Aguarde um pouco.";
        else if (erro instanceof Anthropic.APIError) msg = `Erro da IA (${erro.status}). Tente de novo.`;
        enviar(`\n\n⚠️ ${msg}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
