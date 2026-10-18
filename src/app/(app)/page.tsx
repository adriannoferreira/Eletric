import { and, count, eq, inArray, lte, sql } from "drizzle-orm";
import { AlertTriangle, Bot, CalendarPlus, ChevronRight, FilePlus2, ListChecks, Megaphone, Wrench } from "lucide-react";
import Link from "next/link";
import { AlertaPrecos } from "@/components/precos/alerta-precos";
import { CardHoje } from "@/components/os/hoje";
import { catalogo, clientes, db, equipamentos, orcamentoItens, orcamentos, perfil, quadros } from "@/db";
import { reais } from "@/lib/formato";

/** R$ compacto para caber em 1/3 da tela (ex.: R$ 4,4 mil). */
const curto = (v: number) =>
  Math.abs(v) >= 10_000
    ? `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v / 1000)} mil`
    : reais(v).replace(/,\d{2}$/, "");

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

  const [[p], [{ nClientes }], [{ nCatalogo }], porStatus, [{ followups }], alertasEquip] = await Promise.all([
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

  const avisos: { href: string; texto: string; tom: "info" | "aviso" | "perigo"; icone: typeof Wrench }[] = [
    ...(followups > 0
      ? [{ href: "/vendas/followup", texto: `${followups} orçamento(s) sem resposta — follow-up`, tom: "info" as const, icone: Megaphone }]
      : []),
    ...manutencoes.map((m) => {
      const atrasada = m.proxima < hojeISO;
      return {
        href: `/quadros/${m.id}?aba=manutencao`,
        texto: `Manutenção ${atrasada ? "atrasada" : "próxima"}: ${m.nome}`,
        tom: atrasada ? ("perigo" as const) : ("aviso" as const),
        icone: Wrench,
      };
    }),
    ...(alertasEquip.length > 0
      ? [{ href: "/equipamentos", texto: `Calibração vencendo: ${alertasEquip.map((e) => e.nome).join(", ")}`, tom: "aviso" as const, icone: AlertTriangle }]
      : []),
  ];
  const corAviso = { info: "text-info", aviso: "text-warn", perigo: "text-danger" };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">
        {saudacao()}
        {p?.nome ? `, ${p.nome.split(" ")[0]}` : ""}
      </h1>

      <section className="grid grid-cols-3 gap-2">
        {[
          { href: "/orcamentos/novo", rotulo: "Orçamento", icone: FilePlus2 },
          { href: "/os/nova", rotulo: "Agendar", icone: CalendarPlus },
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

      <section className="grid grid-cols-3 gap-2">
        <Numero rotulo="Fechado/mês" valor={curto(soma(aprovadosMes))} href="/vendas" />
        <Numero rotulo="Aguardando" valor={curto(soma(emAberto))} href="/orcamentos?status=enviado" />
        <Numero rotulo="Clientes" valor={String(nClientes)} href="/clientes" />
      </section>

      {(avisos.length > 0 || pendentes.length > 0) && (
        <section className="card divide-y divide-border">
          {pendentes.length > 0 && (
            <Link href={pendentes[0].href} className="flex items-center gap-3 px-4 py-3 text-sm">
              <ListChecks className="size-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate">
                Primeiros passos {primeirosPassos.length - pendentes.length}/{primeirosPassos.length}: {pendentes[0].texto}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted" />
            </Link>
          )}
          {avisos.map((a) => (
            <Link key={a.href + a.texto} href={a.href} className="flex items-center gap-3 px-4 py-3 text-sm">
              <a.icone className={`size-4 shrink-0 ${corAviso[a.tom]}`} />
              <span className="min-w-0 flex-1 truncate">{a.texto}</span>
              <ChevronRight className="size-4 shrink-0 text-muted" />
            </Link>
          ))}
        </section>
      )}

      <AlertaPrecos />
    </div>
  );
}

function Numero({ rotulo, valor, href }: { rotulo: string; valor: string; href: string }) {
  return (
    <Link href={href} className="card p-3 transition hover:border-accent">
      <p className="truncate text-xs text-muted">{rotulo}</p>
      <p className="mt-1 truncate text-base font-bold">{valor}</p>
    </Link>
  );
}
