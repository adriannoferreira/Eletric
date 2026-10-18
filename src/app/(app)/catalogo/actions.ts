"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { catalogo, db } from "@/db";
import { CATALOGO_INICIAL } from "./sugestoes";

const Item = z.object({
  tipo: z.enum(["servico", "material"]),
  categoria: z.string().trim().max(100).default("Geral"),
  nome: z.string().trim().min(1, "Informe o nome").max(300),
  unidade: z.string().trim().min(1).max(20).default("un"),
  preco: z.coerce.number().min(0, "Preço inválido"),
});

export async function salvarItem(_: string | null, form: FormData) {
  const raw = Object.fromEntries(form);
  const dados = Item.safeParse({ ...raw, preco: String(raw.preco ?? "0").replace(",", ".") });
  if (!dados.success) return dados.error.issues[0]?.message ?? "Dados inválidos";
  const id = Number(form.get("id")) || null;
  const valores = { ...dados.data, categoria: dados.data.categoria || "Geral" };
  if (id) await db.update(catalogo).set(valores).where(eq(catalogo.id, id));
  else await db.insert(catalogo).values(valores);
  revalidatePath("/catalogo");
  return null;
}

export async function excluirItem(id: number) {
  await db.delete(catalogo).where(eq(catalogo.id, id));
  revalidatePath("/catalogo");
}

export async function carregarCatalogoInicial() {
  await db.insert(catalogo).values(CATALOGO_INICIAL);
  revalidatePath("/catalogo");
}
