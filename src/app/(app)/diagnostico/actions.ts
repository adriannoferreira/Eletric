"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { conversas, db } from "@/db";

export async function criarDiagnostico() {
  const [c] = await db.insert(conversas).values({ assistente: "diagnostico", titulo: "Novo diagnóstico" }).returning({ id: conversas.id });
  return c.id;
}

export async function excluirDiagnostico(id: number) {
  await db.delete(conversas).where(and(eq(conversas.id, id), eq(conversas.assistente, "diagnostico")));
  revalidatePath("/diagnostico");
  redirect("/diagnostico");
}
