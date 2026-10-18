"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { conversas, db } from "@/db";
import type { Assistente } from "@/lib/ia/prompts";

export async function criarConversa(assistente: Assistente) {
  const [c] = await db.insert(conversas).values({ assistente }).returning({ id: conversas.id });
  return c.id;
}

export async function excluirConversa(id: number, basePath: string) {
  await db.delete(conversas).where(eq(conversas.id, id));
  revalidatePath(basePath);
  redirect(basePath);
}
