import { count, desc } from "drizzle-orm";
import { ArrowRight, BarChart3, Clock, FilePen, MessageCircle, Target, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { Cabecalho, Vazio } from "@/components/ui";
import { clientes, db } from "@/db";
import {
  inicioDoMes,
  orcamentosComTotal,
  ROTULO_ORIGEM,
  ROTULO_STATUS,
  type StatusOrcamento,
} from "@/components/vendas/dados";
import { diasDesde, reais } from "@/lib/formato";

export const metadata = { title: "Vendas & Marketing" };

const ORDEM_FUNIL: StatusOrcamento[] = ["rascunho", "enviado", "aprovado", "executado", "recusado"];
const COR_FUNIL: Record<StatusOrcamento, string> = {
  rascunho: "bg-muted/40",
  enviado: "bg-info",
  aprovado: "bg-ok",
  executado: "bg-accent",
  recusado: "bg-danger",
};

export default async function PainelVendasPage() {
  const [orcs, origens] = await Promise.all([
    orcamentosComTotal(),
    db
      .select({ origem: clientes.origem, total: count() })
      .from(clientes)
      .groupBy(clientes.origem)
      .orderBy(desc(count())),
  ]);

  const porStatus = Object.fromEntries(
    ORDEM_FUNIL.map((s) => {
      const lista = orcs.filter((o) => o.status === s);
      return [s, { qtd: lista.length, valor: lista.reduce((a, o) => a + o.total, 0) }];
    }),
  ) as Record<StatusOrcamento, { qtd: number; valor: number }>;

  const ganhos = orcs.filter((o) => o.status === "aprovado" || o.status === "executado");
  const respondidos = ganhos.length + porStatus.recusado.qtd;
  const enviadosTotal = respondidos + porStatus.enviado.qtd;
  const conversao = enviadosTotal > 0 ? ganhos.length / enviadosTotal : null;
  const conversaoRespondidos = respondidos > 0 ? ganhos.length / respondidos : null;
  const ticketMedio = ganhos.length > 0 ? ganhos.reduce((a, o) => a + o.total, 0) / ganhos.length : null;

  const mes = inicioDoMes();
  const faturamentoMes = ganhos
    .filter((o) => (o.respondidoEm ?? o.atualizadoEm) >= mes)
    .reduce((a, o) => a + o.total, 0);

  const followupsPendentes = orcs.filter(
    (o) => o.status === "enviado" && (diasDesde(o.ultimoFollowupEm ?? o.enviadoEm ?? o.atualizadoEm) ?? 0) >= 3,
  );
  const rascunhosParados = orcs.filter((o) => o.status === "rascunho" && (diasDesde(o.atualizadoEm) ?? 0) >= 2);

  const maxFunil = Math.max(1, ...ORDEM_FUNIL.map((s) => porStatus[s].qtd));
  const totalClientes = origens.reduce((a, o) => a + o.total, 0);
  const maxOrigem = Math.max(1, ...origens.map((o) => o.total));
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

  return (
    <>
      <Cabecalho
        titulo="Vendas"
        ajuda={
          <>
            <p>
              <strong>Conversão:</strong> orçamentos aprovados ÷ enviados. Entre os que responderam: {pct(conversaoRespondidos)}.
            </p>
            <p>
              <strong>Ticket médio:</strong> valor médio dos {ganhos.length} orçamento(s) fechado(s).
            </p>
            <p>Invista mais no canal que mais traz cliente (gráfico de origem).</p>
          </>
        }
      />

      {(followupsPendentes.length > 0 || rascunhosParados.length > 0) && (
        <section className="card mb-4 divide-y divide-border">
          {followupsPendentes.length > 0 && (
            <Link href="/vendas/followup" className="flex items-center gap-3 px-4 py-3 text-sm">
              <MessageCircle className="size-4 shrink-0 text-info" />
              <span className="min-w-0 flex-1 truncate">
                {followupsPendentes.length} sem resposta · {reais(followupsPendentes.reduce((a, o) => a + o.total, 0))}
              </span>
              <ArrowRight className="size-4 text-muted" />
            </Link>
          )}
          {rascunhosParados.length > 0 && (
            <Link href="/orcamentos?status=rascunho" className="flex items-center gap-3 px-4 py-3 text-sm">
              <FilePen className="size-4 shrink-0 text-warn" />
              <span className="min-w-0 flex-1 truncate">{rascunhosParados.length} rascunho(s) parado(s)</span>
              <ArrowRight className="size-4 text-muted" />
            </Link>
          )}
        </section>
      )}

      <section className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Indicador icone={Target} rotulo="Conversão" valor={pct(conversao)} />
        <Indicador icone={TrendingUp} rotulo="Ticket médio" valor={ticketMedio === null ? "—" : reais(ticketMedio)} />
        <Indicador icone={Clock} rotulo="Aguardando" valor={reais(porStatus.enviado.valor)} />
        <Indicador icone={Wallet} rotulo="Fechado no mês" valor={reais(faturamentoMes)} />
      </section>

      {orcs.length === 0 ? (
        <Vazio
          icone={BarChart3}
          titulo="Ainda não há orçamentos"
          acao={<Link href="/orcamentos/novo" className="btn btn-primary">Fazer orçamento</Link>}
        />
      ) : (
        <section className="card mb-5 p-4">
          <h2 className="mb-3 font-semibold">Funil de orçamentos</h2>
          <ul className="space-y-3">
            {ORDEM_FUNIL.map((s) => (
              <li key={s}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{ROTULO_STATUS[s]}</span>
                  <span className="text-muted">
                    {porStatus[s].qtd} · <span className="font-semibold text-fg">{reais(porStatus[s].valor)}</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full ${COR_FUNIL[s]}`}
                    style={{ width: `${(porStatus[s].qtd / maxFunil) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card mb-5 p-4">
        <h2 className="mb-3 font-semibold">Origem dos clientes</h2>
        {totalClientes === 0 ? (
          <p className="text-sm text-muted">Sem dados ainda.</p>
        ) : (
          <ul className="space-y-2.5">
            {origens.map((o) => (
              <li key={o.origem} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-2 text-sm">
                <span className="truncate">{ROTULO_ORIGEM[o.origem] ?? o.origem}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(o.total / maxOrigem) * 100}%` }} />
                </div>
                <span className="text-right text-muted">{Math.round((o.total / totalClientes) * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>

    </>
  );
}

function Indicador({
  icone: Icone,
  rotulo,
  valor,
}: {
  icone: React.ComponentType<{ className?: string }>;
  rotulo: string;
  valor: string;
}) {
  return (
    <div className="card p-3.5">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted">
        <Icone className="size-3.5" /> {rotulo}
      </p>
      <p className="truncate text-lg font-bold tracking-tight">{valor}</p>
    </div>
  );
}
