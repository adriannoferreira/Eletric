import { and, asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { conversas, db, mensagens } from "@/db";
import { dataCurta } from "@/lib/formato";
import { iaConfigurada } from "@/lib/ia/claude";
import { ChatDiagnostico } from "./chat-diagnostico";

export async function PaginaDiagnostico({ id }: { id?: number }) {
  const lista = await db
    .select()
    .from(conversas)
    .where(eq(conversas.assistente, "diagnostico"))
    .orderBy(desc(conversas.atualizadoEm))
    .limit(50);
  let iniciais: { papel: "user" | "assistant"; conteudo: string }[] = [];
  if (id) {
    const [c] = await db.select().from(conversas).where(and(eq(conversas.id, id), eq(conversas.assistente, "diagnostico")));
    if (!c) notFound();
    const msgs = await db.select().from(mensagens).where(eq(mensagens.conversaId, id)).orderBy(asc(mensagens.id));
    iniciais = msgs.map((m) => ({ papel: m.papel === "assistant" ? "assistant" : "user", conteudo: m.conteudo }));
  }
  return (
    <ChatDiagnostico
      key={id ?? "novo"}
      conversaId={id}
      iniciais={iniciais}
      historico={lista.map((c) => ({ id: c.id, titulo: c.titulo, quando: dataCurta(c.atualizadoEm) }))}
      configurada={iaConfigurada()}
    />
  );
}
