import { and, asc, desc, eq } from "drizzle-orm";
import { MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { conversas, db, mensagens } from "@/db";
import { iaConfigurada } from "@/lib/ia/claude";
import type { Assistente } from "@/lib/ia/prompts";
import { dataCurta } from "@/lib/formato";
import { ChatIA } from "./chat-ia";
import { Historico } from "./historico";

/** Página completa de chat (histórico + conversa) reaproveitada pela IA e pelo consultor de vendas. */
export async function PaginaChat({
  assistente,
  basePath,
  conversaId,
  titulo,
  subtitulo,
  sugestoes,
}: {
  assistente: Assistente;
  basePath: string;
  conversaId?: number;
  titulo: string;
  subtitulo: string;
  sugestoes: string[];
}) {
  const lista = await db
    .select()
    .from(conversas)
    .where(eq(conversas.assistente, assistente))
    .orderBy(desc(conversas.atualizadoEm))
    .limit(50);

  let iniciais: { papel: "user" | "assistant"; conteudo: string }[] = [];
  if (conversaId) {
    const [c] = await db
      .select()
      .from(conversas)
      .where(and(eq(conversas.id, conversaId), eq(conversas.assistente, assistente)));
    if (!c) notFound();
    const msgs = await db
      .select()
      .from(mensagens)
      .where(eq(mensagens.conversaId, conversaId))
      .orderBy(asc(mensagens.id));
    iniciais = msgs.map((m) => ({
      papel: m.papel === "assistant" ? "assistant" : "user",
      conteudo: m.conteudo,
    }));
  }

  const itens = lista.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    quando: dataCurta(c.atualizadoEm),
  }));

  return (
    <div className="flex gap-6">
      <aside className="hidden w-64 shrink-0 lg:block">
        <Link href={basePath} className="btn btn-primary mb-3 w-full">
          <MessageSquarePlus className="size-4" /> Nova conversa
        </Link>
        <Historico itens={itens} basePath={basePath} atual={conversaId} />
      </aside>
      <div className="min-w-0 flex-1">
        <ChatIA
          key={conversaId ?? "nova"}
          assistente={assistente}
          basePath={basePath}
          conversaId={conversaId}
          iniciais={iniciais}
          titulo={titulo}
          subtitulo={subtitulo}
          sugestoes={sugestoes}
          configurada={iaConfigurada()}
          historico={itens}
        />
      </div>
    </div>
  );
}
