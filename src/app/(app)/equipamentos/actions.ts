"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, equipamentos } from "@/db";
import { CATEGORIAS_EQUIPAMENTO, STATUS_EQUIPAMENTO } from "@/lib/opcoes";

const t = z.string().trim().max(300).default("");
const dataOpcional = z
  .string()
  .trim()
  .transform((s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null));

const Equip = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(200),
  categoria: z.enum(Object.keys(CATEGORIAS_EQUIPAMENTO) as [keyof typeof CATEGORIAS_EQUIPAMENTO]),
  marca: t,
  modelo: t,
  numeroSerie: t,
  dataCompra: dataOpcional,
  valor: z
    .string()
    .trim()
    .transform((s) => (s ? Number(s.replace(/\./g, "").replace(",", ".")) || null : null)),
  proximaVerificacao: dataOpcional,
  status: z.string().refine((s) => s in STATUS_EQUIPAMENTO),
  observacoes: z.string().trim().max(3000).default(""),
});

export async function salvarEquipamento(_: string | null, form: FormData) {
  const dados = Equip.safeParse(Object.fromEntries(form));
  if (!dados.success) return dados.error.issues[0]?.message ?? "Dados inválidos";
  const id = Number(form.get("id")) || null;
  if (id) await db.update(equipamentos).set(dados.data).where(eq(equipamentos.id, id));
  else await db.insert(equipamentos).values(dados.data);
  revalidatePath("/equipamentos");
  return null;
}

export async function excluirEquipamento(id: number) {
  await db.delete(equipamentos).where(eq(equipamentos.id, id));
  revalidatePath("/equipamentos");
}
