import { and, count, desc, eq, inArray, lte, sql } from "drizzle-orm";
import {
  Wrench,
  AlertTriangle,
  Bot,
  ChevronRight,
  FilePlus2,
  LayoutGrid,
  Megaphone,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { AlertaPrecos } from "@/components/precos/alerta-precos";
import { CardHoje } from "@/components/os/hoje";
import { Badge } from "@/components/ui";
import { catalogo, clientes, db, equipamentos, orcamentoItens, orcamentos, perfil, quadros } from "@/db";
import { reais } from "@/lib/formato";
import { STATUS_ORCAMENTO } from "@/lib/opcoes";
import { numeroOrcamento } from "@/lib/orcamento";

const totalSql = sql<number>`coalesce(sum(${orcamentoItens.quantidade} * ${orcamentoItens.precoUnitario}), 0) - ${orcamentos.desconto}`.mapWith(Number);

function saudacao() {
  const h = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()),
  );
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function datasReferencia() {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  return {
    inicioMes,
    tresDias: new Date(Date.now() - 3 * 86_400_000),
    em30dias: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
    em7dias: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
    hojeISO: new Date().toISOString().slice(0, 10),
  };
}

export default async function Inicio() {
  const { inicioMes, tresDias, em30dias, em7dias, hojeISO } = datasReferencia();

  const proximaManut = sql<string>`${quadros.dados}->'manutencao'->>'proximaVisita'`;
  const manutencoes = await db
    .select({ id: quadros.id, nome: quadros.nome, cliente: clientes.nome, proxima: proximaManut })
    .from(quadros)
    .leftJoin(clientes, eq(clientes.id, quadros.clienteId))
    .where(and(eq(quadros.modelo, false), sql`coalesce(${proximaManut}, '') <> ''`, sql`${proximaManut} <= ${em7dias}`))
    .orderBy(proximaManut)
    .limit(10);

  const [[p], [{ nClientes }], [{ nCatalogo }], porStatus, [{ followups }], recentes, alertasEquip] = await Promise.all([
    db.select().from(perfil).limit(1),
    db.select({ nClientes: count() }).from(clientes),
    db.select({ nCatalogo: count() }).from(catalogo),
    db
      .select({ id: orcamentos.id, status: orcamentos.status, respondidoEm: orcamentos.respondidoEm, total: totalSql })
      .from(orcamentos)
      .leftJoin(orcamentoItens, eq(orcamentoItens.orcamentoId, orcamentos.id))
      .groupBy(orcamentos.id),
    db
      .select({ followups: count() })
      .from(orcamentos)
      .where(and(eq(orcamentos.status, "enviado"), lte(orcamentos.enviadoEm, tresDias))),
    db
      .select({ id: orcamentos.id, titulo: orcamentos.titulo, status: orcamentos.status, cliente: clientes.nome, total: totalSql })
      .from(orcamentos)
      .innerJoin(clientes, eq(clientes.id, orcamentos.clienteId))
      .leftJoin(orcamentoItens, eq(orcamentoItens.orcamentoId, orcamentos.id))
      .groupBy(orcamentos.id, clientes.nome)
      .orderBy(desc(orcamentos.atualizadoEm))
      .limit(5),
    db
      .select({ nome: equipamentos.nome })
      .from(equipamentos)
      .where(and(lte(equipamentos.proximaVerificacao, em30dias), inArray(equipamentos.status, ["ok", "emprestado"]))),
  ]);

  const emAberto = porStatus.filter((o) => o.status === "enviado");
  const aprovadosMes = porStatus.filter(
    (o) => (o.status === "aprovado" || o.status === "executado") && o.respondidoEm && o.respondidoEm >= inicioMes,
  );
  const soma = (l: { total: number }[]) => l.reduce((s, o) => s + o.total, 0);

  const primeirosPassos = [
    { feito: Boolean(p?.nome || p?.empresa), texto: "Preencha seu perfil (aparece no orçamento)", href: "/perfil" },
    { feito: nCatalogo > 0, texto: "Monte seu catálogo de preços", href: "/catalogo" },
    { feito: nClientes > 0, texto: "Cadastre seu primeiro cliente", href: "/clientes/novo" },
    { feito: porStatus.length > 0, texto: "Envie seu primeiro orçamento", href: "/orcamentos/novo" },
  ];
  const pendentes = primeirosPassos.filter((x) => !x.feito);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">{saudacao()}{p?.nome ? `, ${p.nome.split(" ")[0]}` : ""} 👋</p>
        <h1 className="text-2xl font-bold tracking-tight">Vamos trabalhar?</h1>
      </header>

      <section className="grid grid-cols-4 gap-2">
        {[
          { href: "/orcamentos/novo", rotulo: "Orçamento", icone: FilePlus2 },
          { href: "/clientes/novo", rotulo: "Cliente", icone: UserPlus },
          { href: "/quadros", rotulo: "Quadro", icone: LayoutGrid },
          { href: "/ia", rotulo: "Perguntar", icone: Bot },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="card flex flex-col items-center gap-2 p-3 text-xs font-medium transition hover:border-accent">
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-fg">
              <a.icone className="size-5" />
            </span>
            {a.rotulo}
          </Link>
        ))}
      </section>

      <CardHoje />

      {pendentes.length > 0 && (
        <section className="card p-4">
          <p className="mb-2 font-semibold">Primeiros passos ({primeirosPassos.length - pendentes.length}/{primeirosPassos.length})</p>
          <ul className="space-y-1">
            {pendentes.map((x) => (
              <li key={x.href}>
                <Link href={x.href} className="flex items-center justify-between rounded-xl px-2 py-2 text-sm hover:bg-surface-2">
                  {x.texto} <ChevronRight className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Numero rotulo="Aprovado no mês" valor={reais(soma(aprovadosMes))} sub={`${aprovadosMes.length} orçamento(s)`} />
        <Numero rotulo="Aguardando resposta" valor={reais(soma(emAberto))} sub={`${emAberto.length} orçamento(s)`} />
        <Numero rotulo="Clientes" valor={String(nClientes)} />
        <Numero rotulo="Orçamentos" valor={String(porStatus.length)} />
      </section>

      {followups > 0 && (
        <Link href="/vendas/followup" className="flex items-center gap-3 rounded-2xl bg-info-soft p-4 text-info">
          <Megaphone className="size-5 shrink-0" />
          <span className="flex-1 text-sm font-medium">
            {followups} orçamento(s) sem resposta há 3+ dias. Hora do follow-up!
          </span>
          <ChevronRight className="size-4" />
        </Link>
      )}

      {alertasEquip.length > 0 && (
        <Link href="/equipamentos" className="flex items-center gap-3 rounded-2xl bg-warn-soft p-4 text-warn">
          <AlertTriangle className="size-5 shrink-0" />
          <span className="flex-1 text-sm font-medium">
            Calibração/validade vencendo: {alertasEquip.map((e) => e.nome).join(", ")}
          </span>
          <ChevronRight className="size-4" />
        </Link>
      )}

      <AlertaPrecos />

      {manutencoes.length > 0 && (
        <section className="space-y-2">
          {manutencoes.map((m) => {
            const atrasada = m.proxima < hojeISO;
            return (
              <Link
                key={m.id}
                href={`/quadros/${m.id}?aba=manutencao`}
                className={`flex items-center gap-3 rounded-2xl p-4 ${atrasada ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}
              >
                <Wrench className="size-5 shrink-0" />
                <span className="flex-1 text-sm font-medium">
                  Manutenção preventiva {atrasada ? "atrasada" : "próxima"}: {m.nome}
                  {m.cliente ? ` (${m.cliente})` : ""} — {new Date(`${m.proxima}T12:00:00`).toLocaleDateString("pt-BR")}
                </span>
                <ChevronRight className="size-4" />
              </Link>
            );
          })}
        </section>
      )}

      {recentes.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Últimos orçamentos</h2>
            <Link href="/orcamentos" className="text-sm text-muted hover:text-fg">Ver todos</Link>
          </div>
          <ul className="card divide-y divide-border">
            {recentes.map((o) => {
              const st = STATUS_ORCAMENTO[o.status] ?? STATUS_ORCAMENTO.rascunho;
              return (
                <li key={o.id}>
                  <Link href={`/orcamentos/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{o.titulo}</p>
                      <p className="truncate text-xs text-muted">{numeroOrcamento(o.id)} · {o.cliente}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold">{reais(Math.max(0, o.total))}</span>
                      <Badge tom={st.tom}>{st.rotulo}</Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Numero({ rotulo, valor, sub }: { rotulo: string; valor: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{rotulo}</p>
      <p className="mt-1 truncate text-xl font-bold">{valor}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
