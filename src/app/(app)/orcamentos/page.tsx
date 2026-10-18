import { desc, eq, sql } from "drizzle-orm";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { Badge, Cabecalho, Vazio } from "@/components/ui";
import { clientes, db, orcamentoItens, orcamentos } from "@/db";
import { dataCurta, reais } from "@/lib/formato";
import { STATUS_ORCAMENTO } from "@/lib/opcoes";
import { numeroOrcamento } from "@/lib/orcamento";

export const metadata = { title: "Orçamentos" };

export default async function OrcamentosPage({ searchParams }: PageProps<"/orcamentos">) {
  const { status } = await searchParams;
  const filtro = typeof status === "string" && status in STATUS_ORCAMENTO ? status : null;

  const lista = await db
    .select({
      id: orcamentos.id,
      titulo: orcamentos.titulo,
      status: orcamentos.status,
      criadoEm: orcamentos.criadoEm,
      desconto: orcamentos.desconto,
      cliente: clientes.nome,
      bruto: sql<number>`coalesce(sum(${orcamentoItens.quantidade} * ${orcamentoItens.precoUnitario}), 0)`.mapWith(Number),
    })
    .from(orcamentos)
    .innerJoin(clientes, eq(clientes.id, orcamentos.clienteId))
    .leftJoin(orcamentoItens, eq(orcamentoItens.orcamentoId, orcamentos.id))
    .where(filtro ? eq(orcamentos.status, filtro) : undefined)
    .groupBy(orcamentos.id, clientes.nome)
    .orderBy(desc(orcamentos.criadoEm))
    .limit(200);

  const abas = [{ v: null, r: "Todos" }, ...Object.entries(STATUS_ORCAMENTO).map(([v, s]) => ({ v, r: s.rotulo }))];

  return (
    <>
      <Cabecalho
        titulo="Orçamentos"
        acoes={
          <Link href="/orcamentos/novo" className="btn btn-primary">
            <Plus className="size-4" /> Novo
          </Link>
        }
      />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {abas.map((a) => (
          <Link
            key={a.r}
            href={a.v ? `/orcamentos?status=${a.v}` : "/orcamentos"}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
              filtro === a.v ? "border-accent bg-accent-soft" : "border-border text-muted"
            }`}
          >
            {a.r}
          </Link>
        ))}
      </div>
      {lista.length === 0 ? (
        <Vazio
          icone={FileText}
          titulo="Nenhum orçamento aqui"
          texto="Crie um orçamento, adicione os itens do seu catálogo e envie pelo WhatsApp."
          acao={<Link href="/orcamentos/novo" className="btn btn-primary">Criar orçamento</Link>}
        />
      ) : (
        <ul className="card divide-y divide-border">
          {lista.map((o) => {
            const st = STATUS_ORCAMENTO[o.status] ?? STATUS_ORCAMENTO.rascunho;
            return (
              <li key={o.id}>
                <Link href={`/orcamentos/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{o.titulo}</p>
                    <p className="truncate text-sm text-muted">
                      {numeroOrcamento(o.id)} · {o.cliente} · {dataCurta(o.criadoEm)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-semibold">{reais(Math.max(0, o.bruto - o.desconto))}</span>
                    <Badge tom={st.tom}>{st.rotulo}</Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
