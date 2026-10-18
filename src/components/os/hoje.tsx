import { and, eq, inArray, lt } from "drizzle-orm";
import { AlertTriangle, CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";
import { db, ordensServico, visitas } from "@/db";
import { visitasNoPeriodo } from "@/lib/servicos/agenda";
import { diaLocal, hora, idsEmConflito, inicioDoDia, somarDias } from "@/lib/servicos/os";

function agora() {
  return new Date();
}

/** Card "Hoje" da tela Início: serviços do dia e OS atrasadas. */
export async function CardHoje() {
  const t = agora();
  const hoje = diaLocal(t);
  const [doDia, atrasadas] = await Promise.all([
    visitasNoPeriodo(inicioDoDia(hoje), inicioDoDia(somarDias(hoje, 1))),
    db
      .selectDistinct({ id: ordensServico.id, titulo: ordensServico.titulo })
      .from(visitas)
      .innerJoin(ordensServico, eq(ordensServico.id, visitas.osId))
      .where(
        and(
          eq(visitas.status, "agendada"),
          lt(visitas.inicio, inicioDoDia(hoje)),
          inArray(ordensServico.status, ["agendada", "em_andamento", "pausada"]),
        ),
      )
      .limit(10),
  ]);
  const ativas = doDia.filter((v) => v.status !== "cancelada");
  const conflito = idsEmConflito(ativas.filter((v) => v.status === "agendada"));

  return (
    <div className="space-y-2">
      <section className="card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <CalendarDays className="size-4 text-accent" /> Hoje
          </h2>
          <Link href="/agenda" className="text-sm text-muted hover:text-fg">Agenda</Link>
        </div>
        {ativas.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum serviço agendado para hoje. <Link href="/os/nova" className="text-info underline">Agendar</Link>
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {ativas.map((v) => (
              <li key={v.id}>
                <Link href={`/os/${v.osId}`} className="flex items-center gap-3 py-2.5">
                  <span className="w-12 shrink-0 font-bold">{hora(v.inicio)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{v.titulo}</span>
                    <span className="block truncate text-xs text-muted">{v.cliente}{v.endereco && ` · ${v.endereco}`}</span>
                  </span>
                  {conflito.has(v.id) && <AlertTriangle className="size-4 shrink-0 text-danger" aria-label="Conflito de horário" />}
                  {v.status === "realizada" && <span className="text-xs text-ok">feito</span>}
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {atrasadas.length > 0 && (
        <Link href="/os" className="flex items-center gap-3 rounded-2xl bg-danger-soft p-4 text-danger">
          <AlertTriangle className="size-5 shrink-0" />
          <span className="flex-1 text-sm font-medium">
            {atrasadas.length} OS com visita vencida e não concluída: {atrasadas.map((a) => a.titulo).join(", ")}
          </span>
          <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
