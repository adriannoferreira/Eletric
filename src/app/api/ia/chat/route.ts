import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { conversas, db, mensagens, perfil } from "@/db";
import { respostaEmStream } from "@/lib/ia/claude";
import { PROMPT_ELETRICA, promptVendas } from "@/lib/ia/prompts";

const Entrada = z.object({
  conversaId: z.number().int().positive(),
  mensagem: z.string().trim().min(1).max(20_000),
});

/** Envia uma mensagem numa conversa salva e devolve a resposta em streaming. */
export async function POST(req: Request) {
  const dados = Entrada.safeParse(await req.json().catch(() => null));
  if (!dados.success) return new Response("Dados inválidos", { status: 400 });
  const { conversaId, mensagem } = dados.data;

  const [conversa] = await db.select().from(conversas).where(eq(conversas.id, conversaId));
  if (!conversa) return new Response("Conversa não encontrada", { status: 404 });

  const historico = await db
    .select()
    .from(mensagens)
    .where(eq(mensagens.conversaId, conversaId))
    .orderBy(asc(mensagens.id));

  await db.insert(mensagens).values({ conversaId, papel: "user", conteudo: mensagem });
  if (historico.length === 0) {
    await db
      .update(conversas)
      .set({ titulo: mensagem.slice(0, 60) + (mensagem.length > 60 ? "…" : "") })
      .where(eq(conversas.id, conversaId));
  }

  let system = PROMPT_ELETRICA;
  if (conversa.assistente === "vendas") {
    const [p] = await db.select().from(perfil).limit(1);
    system = promptVendas(p);
  }

  return respostaEmStream({
    system,
    messages: [
      ...historico.map((m) => ({
        role: m.papel === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.conteudo,
      })),
      { role: "user", content: mensagem },
    ],
    aoTerminar: async (texto) => {
      await db.insert(mensagens).values({ conversaId, papel: "assistant", conteudo: texto });
      await db.update(conversas).set({ atualizadoEm: new Date() }).where(eq(conversas.id, conversaId));
    },
  });
}
