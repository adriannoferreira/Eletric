"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clientes, db } from "@/db";
import { ORIGENS_CLIENTE, TIPOS_CLIENTE } from "@/lib/opcoes";

const texto = z.string().trim().max(500).default("");

const Cliente = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(200),
  telefone: texto,
  email: texto,
  documento: texto,
  endereco: texto,
  bairro: texto,
  cidade: texto,
  tipo: z.enum(Object.keys(TIPOS_CLIENTE) as [keyof typeof TIPOS_CLIENTE]),
  origem: z.enum(Object.keys(ORIGENS_CLIENTE) as [keyof typeof ORIGENS_CLIENTE]),
  observacoes: z.string().trim().max(5000).default(""),
});

export async function salvarCliente(_: string | null, form: FormData) {
  const id = Number(form.get("id")) || null;
  const dados = Cliente.safeParse(Object.fromEntries(form));
  if (!dados.success) return dados.error.issues[0]?.message ?? "Dados inválidos";

  let clienteId = id;
  if (id) {
    await db.update(clientes).set(dados.data).where(eq(clientes.id, id));
  } else {
    const [c] = await db.insert(clientes).values(dados.data).returning({ id: clientes.id });
    clienteId = c.id;
  }
  revalidatePath("/clientes");
  const voltarPara = String(form.get("voltar") ?? "");
  redirect(voltarPara === "orcamento" ? `/orcamentos/novo?cliente=${clienteId}` : `/clientes/${clienteId}`);
}

export async function excluirCliente(id: number) {
  try {
    await db.delete(clientes).where(eq(clientes.id, id));
  } catch {
    return "Este cliente tem orçamentos. Exclua os orçamentos antes.";
  }
  revalidatePath("/clientes");
  redirect("/clientes");
}
