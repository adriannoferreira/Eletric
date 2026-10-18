import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { clientes, db, orcamentoItens, orcamentos } from "@/db";

export type StatusOrcamento = "rascunho" | "enviado" | "aprovado" | "recusado" | "executado";

export const ROTULO_STATUS: Record<StatusOrcamento, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  executado: "Executado",
};

export const ROTULO_ORIGEM: Record<string, string> = {
  indicacao: "Indicação",
  instagram: "Instagram",
  google: "Google",
  whatsapp: "WhatsApp",
  panfleto: "Panfleto",
  outro: "Outro",
};

/** Todos os orçamentos com cliente e valor total (itens − desconto). */
export async function orcamentosComTotal() {
  const linhas = await db
    .select({
      id: orcamentos.id,
      titulo: orcamentos.titulo,
      status: orcamentos.status,
      desconto: orcamentos.desconto,
      validadeDias: orcamentos.validadeDias,
      tokenPublico: orcamentos.tokenPublico,
      enviadoEm: orcamentos.enviadoEm,
      respondidoEm: orcamentos.respondidoEm,
      followups: orcamentos.followups,
      ultimoFollowupEm: orcamentos.ultimoFollowupEm,
      criadoEm: orcamentos.criadoEm,
      atualizadoEm: orcamentos.atualizadoEm,
      clienteId: clientes.id,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
      subtotal: sql<number>`coalesce(sum(${orcamentoItens.quantidade} * ${orcamentoItens.precoUnitario}), 0)`.mapWith(
        Number,
      ),
    })
    .from(orcamentos)
    .innerJoin(clientes, eq(clientes.id, orcamentos.clienteId))
    .leftJoin(orcamentoItens, eq(orcamentoItens.orcamentoId, orcamentos.id))
    .groupBy(orcamentos.id, clientes.id);

  return linhas.map((o) => ({
    ...o,
    status: o.status as StatusOrcamento,
    total: Math.max(0, o.subtotal - (o.desconto ?? 0)),
  }));
}

export type OrcamentoComTotal = Awaited<ReturnType<typeof orcamentosComTotal>>[number];

/** Endereço público do app (para montar o link do orçamento enviado ao cliente). */
export async function origemDaRequisicao() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Início do mês corrente no horário de Brasília (sem horário de verão desde 2019). */
export function inicioDoMes() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const ano = partes.find((p) => p.type === "year")!.value;
  const mes = partes.find((p) => p.type === "month")!.value;
  return new Date(`${ano}-${mes}-01T00:00:00-03:00`);
}
