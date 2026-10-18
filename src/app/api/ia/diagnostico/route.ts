import type Anthropic from "@anthropic-ai/sdk";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { conversas, db, mensagens } from "@/db";
import { respostaEmStream } from "@/lib/ia/claude";
import { PROMPT_DIAGNOSTICO } from "@/lib/servicos/prompt-diagnostico";

const IMAGEM = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

const Entrada = z.object({
  conversaId: z.number().int().positive(),
  mensagem: z.string().trim().min(1).max(20_000),
  /** Fotos reduzidas no navegador (data URL). Até 4 por mensagem, ~1 MB cada. */
  imagens: z.array(z.string().max(1_400_000).regex(IMAGEM)).max(4).default([]),
});

/** Diagnóstico de defeitos: conversa salva + fotos opcionais na mensagem atual. */
export async function POST(req: Request) {
  const dados = Entrada.safeParse(await req.json().catch(() => null));
  if (!dados.success) return new Response("Dados inválidos (máx. 4 fotos por mensagem).", { status: 400 });
  const { conversaId, mensagem, imagens } = dados.data;

  const [conversa] = await db
    .select()
    .from(conversas)
    .where(and(eq(conversas.id, conversaId), eq(conversas.assistente, "diagnostico")));
  if (!conversa) return new Response("Diagnóstico não encontrado", { status: 404 });

  const historico = await db.select().from(mensagens).where(eq(mensagens.conversaId, conversaId)).orderBy(asc(mensagens.id));

  // As fotos não ficam salvas no histórico: registramos só a indicação de que foram enviadas.
  const textoSalvo = imagens.length ? `${mensagem}\n\n📷 ${imagens.length} foto(s) enviada(s)` : mensagem;
  await db.insert(mensagens).values({ conversaId, papel: "user", conteudo: textoSalvo });
  if (historico.length === 0) {
    await db
      .update(conversas)
      .set({ titulo: mensagem.slice(0, 60) + (mensagem.length > 60 ? "…" : "") })
      .where(eq(conversas.id, conversaId));
  }

  const conteudoAtual: Anthropic.Beta.BetaContentBlockParam[] = [
    ...imagens.map((url) => {
      const m = IMAGEM.exec(url)!;
      return {
        type: "image" as const,
        source: { type: "base64" as const, media_type: m[1] as "image/jpeg" | "image/png" | "image/webp", data: m[2] },
      };
    }),
    { type: "text", text: mensagem },
  ];

  return respostaEmStream({
    system: PROMPT_DIAGNOSTICO,
    esforco: "medium",
    messages: [
      ...historico.map((m) => ({
        role: m.papel === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.conteudo,
      })),
      { role: "user", content: conteudoAtual },
    ],
    aoTerminar: async (texto) => {
      await db.insert(mensagens).values({ conversaId, papel: "assistant", conteudo: texto });
      await db.update(conversas).set({ atualizadoEm: new Date() }).where(eq(conversas.id, conversaId));
    },
  });
}
