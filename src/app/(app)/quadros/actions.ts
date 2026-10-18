"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, quadros } from "@/db";
import { MODELOS_QUADRO } from "@/lib/eletrica/pecas";
import { novoQuadro, QuadroDadosSchema } from "@/lib/eletrica/tipos";

const NovoQuadro = z.object({
  nome: z.string().trim().min(1, "Dê um nome ao quadro").max(120),
  clienteId: z.coerce.number().int().positive().optional().catch(undefined),
  tipo: z.enum(["monofasico", "bifasico", "trifasico"]),
  tensoes: z.enum(["127/220", "220/380", "220/220"]),
  esquema: z.enum(["TN-S", "TN-C-S", "TT"]),
  modelo: z.string(),
  instalacao: z.enum(["embutir", "sobrepor"]),
});

export async function criarQuadro(_: string | null, form: FormData) {
  const r = NovoQuadro.safeParse(Object.fromEntries(form));
  if (!r.success) return r.error.issues[0]?.message ?? "Dados inválidos";
  const d = r.data;
  const modelo = MODELOS_QUADRO.find((m) => m.id === d.modelo) ?? MODELOS_QUADRO[3];
  const [fn, ff] = d.tensoes.split("/").map(Number);
  const dados = novoQuadro(
    { tipo: d.tipo, tensaoFN: fn, tensaoFF: d.tipo === "monofasico" ? fn : ff, esquema: d.esquema },
    { fileiras: modelo.fileiras, modulosPorFileira: modelo.modulosPorFileira, instalacao: d.instalacao },
  );
  const [q] = await db
    .insert(quadros)
    .values({ nome: d.nome, clienteId: d.clienteId ?? null, dados })
    .returning({ id: quadros.id });
  revalidatePath("/quadros");
  redirect(`/quadros/${q.id}`);
}

export async function salvarQuadro(id: number, nome: string, clienteId: number | null, dados: unknown) {
  const r = QuadroDadosSchema.safeParse(dados);
  if (!r.success) return { ok: false as const, erro: "Dados do quadro inválidos." };
  await db
    .update(quadros)
    .set({ nome: nome.trim() || "Quadro", clienteId, dados: r.data })
    .where(eq(quadros.id, id));
  revalidatePath("/quadros");
  return { ok: true as const };
}

export async function excluirQuadro(id: number) {
  await db.delete(quadros).where(eq(quadros.id, id));
  revalidatePath("/quadros");
  redirect("/quadros");
}

export async function duplicarQuadro(id: number) {
  const [q] = await db.select().from(quadros).where(eq(quadros.id, id));
  if (!q) return;
  const [novo] = await db
    .insert(quadros)
    .values({ nome: `${q.nome} (cópia)`, clienteId: q.clienteId, dados: q.dados })
    .returning({ id: quadros.id });
  revalidatePath("/quadros");
  redirect(`/quadros/${novo.id}`);
}
