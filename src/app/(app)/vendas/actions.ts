"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, orcamentos, perfil, tarefasMarketing } from "@/db";

const Id = z.number().int().positive();

/** Registra que um follow-up foi enviado pelo WhatsApp. */
export async function registrarFollowup(id: number) {
  const oid = Id.parse(id);
  await db
    .update(orcamentos)
    .set({ followups: sql`${orcamentos.followups} + 1`, ultimoFollowupEm: new Date() })
    .where(eq(orcamentos.id, oid));
  revalidatePath("/vendas", "layout");
}

/** Marca a resposta do cliente a um orçamento enviado. */
export async function marcarResposta(id: number, status: "aprovado" | "recusado") {
  const oid = Id.parse(id);
  const st = z.enum(["aprovado", "recusado"]).parse(status);
  await db
    .update(orcamentos)
    .set({ status: st, respondidoEm: new Date() })
    .where(eq(orcamentos.id, oid));
  revalidatePath("/vendas", "layout");
  revalidatePath("/orcamentos");
}

/** Salva o valor da hora técnica no perfil (cria a linha do perfil se ainda não existir). */
export async function salvarValorHora(valor: number) {
  const v = z.number().positive().max(100_000).parse(Math.round(valor * 100) / 100);
  await db
    .insert(perfil)
    .values({ id: 1, valorHora: v })
    .onConflictDoUpdate({ target: perfil.id, set: { valorHora: v } });
  revalidatePath("/vendas/precos");
  revalidatePath("/perfil");
}

export async function alternarTarefa(id: number, concluida: boolean) {
  const tid = Id.parse(id);
  await db
    .update(tarefasMarketing)
    .set({ concluida, concluidaEm: concluida ? new Date() : null })
    .where(eq(tarefasMarketing.id, tid));
  revalidatePath("/vendas/plano");
}

const NovaTarefa = z.object({
  titulo: z.string().trim().min(1, "Escreva a tarefa").max(200),
  descricao: z.string().trim().max(1000).default(""),
  fase: z.coerce.number().refine((f) => [30, 60, 90].includes(f), "Fase inválida"),
});

export async function adicionarTarefa(_: string | null, form: FormData) {
  const dados = NovaTarefa.safeParse(Object.fromEntries(form));
  if (!dados.success) return dados.error.issues[0]?.message ?? "Dados inválidos";
  await db.insert(tarefasMarketing).values({ ...dados.data, ordem: 1000 });
  revalidatePath("/vendas/plano");
  return null;
}

/** Só tarefas criadas pelo usuário (sem chave) podem ser excluídas. */
export async function excluirTarefa(id: number) {
  const tid = Id.parse(id);
  await db
    .delete(tarefasMarketing)
    .where(and(eq(tarefasMarketing.id, tid), isNull(tarefasMarketing.chave)));
  revalidatePath("/vendas/plano");
}
