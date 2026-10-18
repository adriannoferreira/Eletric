"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, perfil } from "@/db";

const t = z.string().trim().max(300).default("");
const Perfil = z.object({
  nome: t,
  empresa: t,
  documento: t,
  telefone: t,
  email: t,
  cidade: t,
  chavePix: t,
  instagram: t,
  registroProfissional: t,
});

export async function salvarPerfil(_: string | null, form: FormData) {
  const dados = Perfil.safeParse(Object.fromEntries(form));
  if (!dados.success) return "Dados inválidos";
  await db
    .insert(perfil)
    .values({ id: 1, ...dados.data })
    .onConflictDoUpdate({ target: perfil.id, set: dados.data });
  revalidatePath("/", "layout");
  return "ok";
}
