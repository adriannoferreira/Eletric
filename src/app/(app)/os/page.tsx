import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { AlertTriangle, CalendarClock, ClipboardList, FileCheck2, Plus } from "lucide-react";
import Link from "next/link";
import { Badge, Cabecalho, Vazio } from "@/components/ui";
import { clientes, db, orcamentoItens, orcamentos, ordensServico, visitas } from "@/db";
import { reais } from "@/lib/formato";
import { numeroOrcamento } from "@/lib/orcamento";
import { dataHora, osAtrasada, STATUS_OS, type StatusOS } from "@/lib/servicos/os";
import { criarOSDeOrcamento } from "./actions";

export const metadata = { title: "Ordens de serviço" };

const ABAS = [
  { v: "abertas", r: "Abertas" },
  { v: "concluida", r: "Concluídas" },
  { v: "cancelada", r: "Canceladas" },
  { v: "todas", r: "Todas" },
] as const;

function agora() {
  return new Date();
}

export default async function OSPage({ searchParams }: PageProps<"/os">) {
  const { f } = await searchParams;
  const filtro = ABAS.find((a) => a.v === f)?.v ?? "abertas";
  const where =
    filtro === "abertas"
      ? inArray(ordensServico.status, ["agendada", "em_andamento", "pausada"])
      : filtro === "todas"
        ? undefined
        : eq(ordensServico.status, filtro);

  const [lista, todasVisitas, aprovadosSemOS] = await Promise.all([
    db
      .select({
        id: ordensServico.id,
        titulo: ordensServico.titulo,
        status: ordensServico.status,
        cliente: clientes.nome,
        valor: ordensServico.valor,
        criadoEm: ordensServico.criadoEm,
      })
      .from(ordensServico)
      .innerJoin(clientes, eq(clientes.id, ordensServico.clienteId))
      .where(where)
      .orderBy(desc(ordensServico.criadoEm))
      .limit(200),
    db.select().from(visitas),
    db
      .select({
        id: orcamentos.id,
        titulo: orcamentos.titulo,
        cliente: clientes.nome,
        total: sql<number>`coalesce(sum(${orcamentoItens.quantidade} * ${orcamentoItens.precoUnitario}), 0) - ${orcamentos.desconto}`.mapWith(Number),
      })
      .from(orcamentos)
      .innerJoin(clientes, eq(clientes.id, orcamentos.clienteId))
      .leftJoin(ordensServico, eq(ordensServico.orcamentoId, orcamentos.id))
      .leftJoin(orcamentoItens, eq(orcamentoItens.orcamentoId, orcamentos.id))
      .where(and(eq(orcamentos.status, "aprovado"), isNull(ordensServico.id)))
      .groupBy(orcamentos.id, clientes.nome),
  ]);

  const t = agora();
  const porOS = new Map<number, typeof todasVisitas>();
  for (const v of todasVisitas) porOS.set(v.osId, [...(porOS.get(v.osId) ?? []), v]);
  const proxima = (id: number) =>
    (porOS.get(id) ?? [])
      .filter((v) => v.status === "agendada")
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())[0];

  return (
    <>
      <Cabecalho
        titulo="Ordens de serviço"
        acoes={
          <>
            <Link href="/agenda" className="btn btn-secondary">
              <CalendarClock className="size-4" /> Agenda
            </Link>
            <Link href="/os/nova" className="btn btn-primary">
              <Plus className="size-4" /> Nova OS
            </Link>
          </>
        }
      />

      {aprovadosSemOS.length > 0 && (
        <section className="mb-5 rounded-2xl bg-ok-soft p-4">
          <p className="mb-2 flex items-center gap-2 font-semibold text-ok">
            <FileCheck2 className="size-5" /> Orçamentos aprovados sem OS
          </p>
          <ul className="space-y-2">
            {aprovadosSemOS.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{o.titulo}</p>
                  <p className="truncate text-xs text-muted">
                    {numeroOrcamento(o.id)} · {o.cliente} · {reais(Math.max(0, o.total))}
                  </p>
                </div>
                <form action={criarOSDeOrcamento.bind(null, o.id)}>
                  <button className="btn btn-primary shrink-0 px-3 py-2">Criar OS</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {ABAS.map((a) => (
          <Link
            key={a.v}
            href={a.v === "abertas" ? "/os" : `/os?f=${a.v}`}
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
          icone={ClipboardList}
          titulo="Nenhuma ordem de serviço aqui"
          texto="Crie uma OS para agendar, registrar o serviço, colher a assinatura do cliente e gerar o relatório."
          acao={<Link href="/os/nova" className="btn btn-primary">Nova OS</Link>}
        />
      ) : (
        <ul className="card divide-y divide-border">
          {lista.map((o) => {
            const st = STATUS_OS[o.status as StatusOS] ?? STATUS_OS.agendada;
            const prox = proxima(o.id);
            const atrasada = osAtrasada(o.status, porOS.get(o.id) ?? [], t);
            return (
              <li key={o.id}>
                <Link href={`/os/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{o.titulo}</p>
                    <p className="truncate text-sm text-muted">
                      OS {o.id} · {o.cliente}
                      {prox && ` · ${dataHora(prox.inicio)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {o.valor != null && <span className="text-sm font-semibold">{reais(o.valor)}</span>}
                    {atrasada ? (
                      <Badge tom="perigo">
                        <AlertTriangle className="mr-1 size-3" /> Atrasada
                      </Badge>
                    ) : (
                      <Badge tom={st.tom}>{st.rotulo}</Badge>
                    )}
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
