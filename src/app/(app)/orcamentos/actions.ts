"use server";

import { randomBytes } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, orcamentoItens, orcamentos } from "@/db";

const novoToken = () => randomBytes(12).toString("base64url");

export async function criarOrcamento(_: string | null, form: FormData) {
  const clienteId = Number(form.get("clienteId"));
  const titulo = String(form.get("titulo") ?? "").trim();
  if (!clienteId) return "Escolha o cliente.";
  if (!titulo) return "Dê um título ao orçamento.";
  const [o] = await db
    .insert(orcamentos)
    .values({ clienteId, titulo, tokenPublico: novoToken() })
    .returning({ id: orcamentos.id });
  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${o.id}`);
}

const Dados = z.object({
  titulo: z.string().trim().min(1).max(200),
  validadeDias: z.number().int().min(1).max(365),
  desconto: z.number().min(0),
  condicoesPagamento: z.string().max(2000),
  prazoExecucao: z.string().max(500),
  garantia: z.string().max(500),
  observacoes: z.string().max(5000),
  itens: z
    .array(
      z.object({
        tipo: z.enum(["servico", "material"]),
        descricao: z.string().trim().min(1).max(500),
        quantidade: z.number().positive(),
        unidade: z.string().max(20),
        precoUnitario: z.number().min(0),
      }),
    )
    .max(300),
});

export type DadosOrcamento = z.infer<typeof Dados>;

export async function salvarOrcamento(id: number, dados: DadosOrcamento) {
  const ok = Dados.safeParse(dados);
  if (!ok.success) return { erro: "Confira os itens: descrição, quantidade e preço são obrigatórios." };
  const { itens, ...resto } = ok.data;
  await db.update(orcamentos).set(resto).where(eq(orcamentos.id, id));
  await db.delete(orcamentoItens).where(eq(orcamentoItens.orcamentoId, id));
  if (itens.length) {
    await db.insert(orcamentoItens).values(itens.map((i, ordem) => ({ ...i, orcamentoId: id, ordem })));
  }
  revalidatePath(`/orcamentos/${id}`);
  revalidatePath("/orcamentos");
  return { erro: null };
}

const STATUS = ["rascunho", "enviado", "aprovado", "recusado", "executado"] as const;

export async function mudarStatus(id: number, status: (typeof STATUS)[number]) {
  if (!STATUS.includes(status)) return;
  const agora = new Date();
  const [atual] = await db.select().from(orcamentos).where(eq(orcamentos.id, id));
  if (!atual) return;
  await db
    .update(orcamentos)
    .set({
      status,
      enviadoEm: status === "enviado" ? (atual.enviadoEm ?? agora) : atual.enviadoEm,
      respondidoEm: status === "aprovado" || status === "recusado" ? agora : atual.respondidoEm,
    })
    .where(eq(orcamentos.id, id));
  revalidatePath(`/orcamentos/${id}`);
  revalidatePath("/orcamentos");
}

export async function duplicarOrcamento(id: number) {
  const [o] = await db.select().from(orcamentos).where(eq(orcamentos.id, id));
  if (!o) return;
  const itens = await db
    .select()
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, id))
    .orderBy(asc(orcamentoItens.ordem));
  const [novo] = await db
    .insert(orcamentos)
    .values({
      clienteId: o.clienteId,
      titulo: `${o.titulo} (cópia)`,
      validadeDias: o.validadeDias,
      desconto: o.desconto,
      condicoesPagamento: o.condicoesPagamento,
      prazoExecucao: o.prazoExecucao,
      garantia: o.garantia,
      observacoes: o.observacoes,
      tokenPublico: novoToken(),
    })
    .returning({ id: orcamentos.id });
  if (itens.length) {
    await db.insert(orcamentoItens).values(
      itens.map(({ tipo, descricao, quantidade, unidade, precoUnitario, ordem }) => ({
        orcamentoId: novo.id,
        tipo,
        descricao,
        quantidade,
        unidade,
        precoUnitario,
        ordem,
      })),
    );
  }
  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${novo.id}`);
}

export async function excluirOrcamento(id: number) {
  await db.delete(orcamentos).where(eq(orcamentos.id, id));
  revalidatePath("/orcamentos");
  redirect("/orcamentos");
}
