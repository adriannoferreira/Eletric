"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, quadros } from "@/db";
import { MODELOS_QUADRO } from "@/lib/eletrica/pecas";
import { quadroExemplo } from "@/lib/eletrica/exemplos";
import { gerarQuadro } from "@/lib/eletrica/projeto";
import { lerQuadro, novoQuadro, ProjetoObraSchema, QuadroDadosSchema } from "@/lib/eletrica/tipos";

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

// ---------------------------------------------------------------------------
// Projeto a partir da obra
// ---------------------------------------------------------------------------

/** Gera o quadro a partir dos dados da obra (no servidor) e cria ou atualiza o registro. */
export async function salvarProjetoObra(
  quadroId: number | null,
  nome: string,
  clienteId: number | null,
  projeto: unknown,
) {
  const r = ProjetoObraSchema.safeParse(projeto);
  if (!r.success) return { ok: false as const, erro: "Dados da obra inválidos." };
  if (r.data.ambientes.length === 0 && r.data.cargas.length === 0) {
    return { ok: false as const, erro: "Informe ao menos um ambiente ou uma carga." };
  }
  const { dados } = gerarQuadro(r.data);
  const nomeOk = nome.trim() || "Projeto da obra";
  let id = quadroId;
  if (id) {
    const [atual] = await db.select({ dados: quadros.dados }).from(quadros).where(eq(quadros.id, id));
    if (!atual) return { ok: false as const, erro: "Quadro não encontrado." };
    await db.update(quadros).set({ nome: nomeOk, clienteId, dados }).where(eq(quadros.id, id));
  } else {
    const [q] = await db.insert(quadros).values({ nome: nomeOk, clienteId, dados }).returning({ id: quadros.id });
    id = q.id;
  }
  revalidatePath("/quadros");
  revalidatePath(`/quadros/${id}`);
  return { ok: true as const, id };
}

/** Guarda o último memorial gerado pela IA dentro dos dados do quadro. */
export async function salvarMemorial(id: number, texto: string) {
  const memorial = { texto: texto.slice(0, 100_000), geradoEm: new Date().toISOString() };
  await db
    .update(quadros)
    .set({ dados: sql`jsonb_set(${quadros.dados}, '{memorial}', ${JSON.stringify(memorial)}::jsonb, true)` })
    .where(eq(quadros.id, id));
  return memorial;
}

// ---------------------------------------------------------------------------
// Modelos de quadro
// ---------------------------------------------------------------------------

export async function salvarComoModelo(nome: string, descricao: string, dados: unknown) {
  const r = QuadroDadosSchema.safeParse(dados);
  if (!r.success) return { ok: false as const, erro: "Dados do quadro inválidos." };
  const n = nome.trim();
  if (!n) return { ok: false as const, erro: "Dê um nome ao modelo." };
  await db.insert(quadros).values({
    nome: n.slice(0, 120),
    descricao: descricao.trim().slice(0, 300),
    clienteId: null,
    modelo: true,
    dados: { ...r.data, memorial: null },
  });
  revalidatePath("/quadros");
  return { ok: true as const };
}

export async function usarModelo(modeloId: number, nome: string, clienteId: number | null) {
  const [m] = await db
    .select()
    .from(quadros)
    .where(and(eq(quadros.id, modeloId), eq(quadros.modelo, true)));
  if (!m) return "Modelo não encontrado.";
  const dados = { ...lerQuadro(m.dados), memorial: null };
  const [q] = await db
    .insert(quadros)
    .values({ nome: nome.trim() || m.nome, clienteId, dados })
    .returning({ id: quadros.id });
  revalidatePath("/quadros");
  redirect(`/quadros/${q.id}`);
}

export async function renomearModelo(id: number, nome: string, descricao: string) {
  const n = nome.trim();
  if (!n) return;
  await db
    .update(quadros)
    .set({ nome: n.slice(0, 120), descricao: descricao.trim().slice(0, 300) })
    .where(and(eq(quadros.id, id), eq(quadros.modelo, true)));
  revalidatePath("/quadros");
}

export async function excluirModelo(id: number) {
  await db.delete(quadros).where(and(eq(quadros.id, id), eq(quadros.modelo, true)));
  revalidatePath("/quadros");
}

/** Carrega um dos modelos de exemplo na lista de modelos do usuário. */
export async function carregarExemplo(exemploId: string) {
  const ex = quadroExemplo(exemploId);
  if (!ex) return;
  await db.insert(quadros).values({ nome: ex.nome, descricao: ex.descricao, modelo: true, dados: ex.dados });
  revalidatePath("/quadros");
}
