import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { CartaoVisita } from "@/components/os/cartao-visita";
import { Cabecalho, Vazio } from "@/components/ui";
import { visitasNoPeriodo } from "@/lib/servicos/agenda";
import { diaLocal, diaLongo, diaSemana, idsEmConflito, inicioDaSemana, inicioDoDia, osAtrasada, somarDias } from "@/lib/servicos/os";

export const metadata = { title: "Agenda" };

const VISOES = [
  { v: "dia", r: "Dia" },
  { v: "semana", r: "Semana" },
  { v: "lista", r: "Próximos" },
] as const;

function hoje() {
  return new Date();
}

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const q = await searchParams;
  const visao = VISOES.find((x) => x.v === q.v)?.v ?? "dia";
  const agora = hoje();
  const hojeStr = diaLocal(agora);
  const dia = typeof q.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(q.d) ? q.d : hojeStr;

  const de = visao === "semana" ? inicioDaSemana(dia) : visao === "lista" ? hojeStr : dia;
  const nDias = visao === "dia" ? 1 : visao === "semana" ? 7 : 30;
  const lista = await visitasNoPeriodo(inicioDoDia(de), inicioDoDia(somarDias(de, nDias)));

  const conflito = idsEmConflito(lista.filter((v) => v.status === "agendada").map((v) => ({ id: v.id, inicio: v.inicio, duracaoMin: v.duracaoMin })));
  const passo = visao === "semana" ? 7 : 1;
  const href = (d: string, v: string = visao) => `/agenda?v=${v}&d=${d}`;

  const dias = Array.from({ length: nDias }, (_, i) => somarDias(de, i));
  const porDia = new Map<string, typeof lista>();
  for (const v of lista) {
    const k = diaLocal(v.inicio);
    porDia.set(k, [...(porDia.get(k) ?? []), v]);
  }
  const titulo =
    visao === "dia"
      ? diaLongo(inicioDoDia(dia))
      : visao === "semana"
        ? `Semana de ${diaSemana(inicioDoDia(de))} a ${diaSemana(inicioDoDia(somarDias(de, 6)))}`
        : "Próximos 30 dias";

  return (
    <>
      <Cabecalho
        titulo="Agenda"
        subtitulo={titulo.charAt(0).toUpperCase() + titulo.slice(1)}
        acoes={
          <>
            <Link href="/os" className="btn btn-secondary">
              <ClipboardList className="size-4" /> OS
            </Link>
            <Link href={`/os/nova?data=${visao === "lista" ? hojeStr : dia}`} className="btn btn-primary">
              <Plus className="size-4" /> Agendar
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
          {VISOES.map((x) => (
            <Link key={x.v} href={href(dia, x.v)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${visao === x.v ? "bg-surface shadow-sm" : "text-muted"}`}>
              {x.r}
            </Link>
          ))}
        </div>
        {visao !== "lista" && (
          <div className="ml-auto flex items-center gap-1">
            <Link href={href(somarDias(dia, -passo))} className="btn btn-ghost p-2" aria-label="Anterior"><ChevronLeft className="size-5" /></Link>
            <Link href={href(hojeStr)} className="btn btn-secondary px-3 py-1.5 text-sm">Hoje</Link>
            <Link href={href(somarDias(dia, passo))} className="btn btn-ghost p-2" aria-label="Próximo"><ChevronRight className="size-5" /></Link>
          </div>
        )}
      </div>

      {visao === "dia" ? (
        lista.length === 0 ? (
          <Vazio
            icone={CalendarDays}
            titulo="Nenhum serviço neste dia"
            acao={<Link href={`/os/nova?data=${dia}`} className="btn btn-primary">Agendar serviço</Link>}
          />
        ) : (
          <div className="space-y-2">
            {lista.map((v) => (
              <CartaoVisita key={v.id} v={v} conflito={conflito.has(v.id)} atrasada={osAtrasada(v.osStatus, [v], agora)} />
            ))}
          </div>
        )
      ) : lista.length === 0 && visao === "lista" ? (
        <Vazio icone={CalendarDays} titulo="Nenhum serviço agendado nos próximos 30 dias" acao={<Link href="/os/nova" className="btn btn-primary">Agendar serviço</Link>} />
      ) : (
        <div className="space-y-4">
          {dias
            .filter((d) => visao === "semana" || porDia.has(d))
            .map((d) => {
              const doDia = porDia.get(d) ?? [];
              return (
                <section key={d}>
                  <div className="mb-1.5 flex items-center justify-between px-1">
                    <Link href={href(d, "dia")} className={`text-sm font-semibold capitalize ${d === hojeStr ? "text-accent" : ""}`}>
                      {diaSemana(inicioDoDia(d))}
                      {d === hojeStr && " · hoje"}
                    </Link>
                    {visao === "semana" && (
                      <Link href={`/os/nova?data=${d}`} className="btn btn-ghost p-1.5 text-muted" aria-label="Agendar neste dia"><Plus className="size-4" /></Link>
                    )}
                  </div>
                  {doDia.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted">Livre</p>
                  ) : (
                    <div className="space-y-2">
                      {doDia.map((v) => (
                        <CartaoVisita key={v.id} v={v} conflito={conflito.has(v.id)} atrasada={osAtrasada(v.osStatus, [v], agora)} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
        </div>
      )}
    </>
  );
}
