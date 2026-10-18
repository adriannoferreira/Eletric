import { and, asc, eq, gte, lt } from "drizzle-orm";
import { clientes, db, ordensServico, visitas } from "@/db";
import type { VisitaAgenda } from "@/components/os/cartao-visita";

/** Visitas no intervalo [de, ate) com dados da OS e do cliente. */
export async function visitasNoPeriodo(de: Date, ate: Date): Promise<VisitaAgenda[]> {
  const linhas = await db
    .select({
      id: visitas.id,
      inicio: visitas.inicio,
      duracaoMin: visitas.duracaoMin,
      status: visitas.status,
      osId: ordensServico.id,
      osStatus: ordensServico.status,
      titulo: ordensServico.titulo,
      endereco: ordensServico.endereco,
      cliente: clientes.nome,
      telefone: clientes.telefone,
      cEndereco: clientes.endereco,
      cBairro: clientes.bairro,
      cCidade: clientes.cidade,
    })
    .from(visitas)
    .innerJoin(ordensServico, eq(ordensServico.id, visitas.osId))
    .innerJoin(clientes, eq(clientes.id, ordensServico.clienteId))
    .where(and(gte(visitas.inicio, de), lt(visitas.inicio, ate)))
    .orderBy(asc(visitas.inicio));
  return linhas.map(({ cEndereco, cBairro, cCidade, ...v }) => ({
    ...v,
    endereco: v.endereco || [cEndereco, cBairro, cCidade].filter(Boolean).join(", "),
  }));
}
