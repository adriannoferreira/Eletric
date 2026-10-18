/** Regras puras de ordens de serviço e agenda (sem acesso a banco). */

export const FUSO = "America/Belem";
/** Belém não tem horário de verão: UTC−3 o ano todo. */
const OFFSET = "-03:00";

export const STATUS_OS = {
  agendada: { rotulo: "Agendada", tom: "info" },
  em_andamento: { rotulo: "Em andamento", tom: "accent" },
  pausada: { rotulo: "Pausada", tom: "aviso" },
  concluida: { rotulo: "Concluída", tom: "ok" },
  cancelada: { rotulo: "Cancelada", tom: "neutro" },
} as const;

export type StatusOS = keyof typeof STATUS_OS;

/** Transições permitidas entre status. */
const TRANSICOES: Record<StatusOS, StatusOS[]> = {
  agendada: ["em_andamento", "cancelada"],
  em_andamento: ["pausada", "concluida", "cancelada"],
  pausada: ["em_andamento", "concluida", "cancelada"],
  concluida: ["em_andamento"],
  cancelada: ["agendada"],
};

export function podeMudar(de: string, para: string) {
  return (TRANSICOES[de as StatusOS] ?? []).includes(para as StatusOS);
}

export type Intervalo = { id: number | string; inicio: Date; duracaoMin: number };

const fim = (v: Intervalo) => v.inicio.getTime() + v.duracaoMin * 60_000;

/** Pares de visitas cujos horários se sobrepõem. */
export function conflitos(visitas: Intervalo[]): [Intervalo, Intervalo][] {
  const ord = [...visitas].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const pares: [Intervalo, Intervalo][] = [];
  for (let i = 0; i < ord.length; i++) {
    for (let j = i + 1; j < ord.length; j++) {
      if (ord[j].inicio.getTime() >= fim(ord[i])) break;
      pares.push([ord[i], ord[j]]);
    }
  }
  return pares;
}

/** Ids das visitas que conflitam com alguma outra. */
export function idsEmConflito(visitas: Intervalo[]) {
  const ids = new Set<Intervalo["id"]>();
  for (const [a, b] of conflitos(visitas)) {
    ids.add(a.id);
    ids.add(b.id);
  }
  return ids;
}

export type RegistroHora = { inicio: Date; fim: Date | null };

/** Minutos trabalhados; registros abertos contam até `agora`. */
export function totalMinutos(regs: RegistroHora[], agora: Date) {
  let ms = 0;
  for (const r of regs) {
    const f = (r.fim ?? agora).getTime();
    ms += Math.max(0, f - r.inicio.getTime());
  }
  return Math.round(ms / 60_000);
}

export function formatarDuracao(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")} min` : `${h} h`;
}

/** OS atrasada: ainda não concluída/cancelada e com visita agendada que já terminou. */
export function osAtrasada(status: string, visitas: { inicio: Date; duracaoMin: number; status: string }[], agora: Date) {
  if (status === "concluida" || status === "cancelada") return false;
  return visitas.some((v) => v.status === "agendada" && fim({ id: 0, ...v }) < agora.getTime());
}

/** "AAAA-MM-DD" do dia em Belém para um instante. */
export function diaLocal(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Início do dia (00:00 em Belém) como Date. */
export function inicioDoDia(dia: string) {
  return new Date(`${dia}T00:00:00${OFFSET}`);
}

export function somarDias(dia: string, n: number) {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Segunda-feira da semana do dia informado. */
export function inicioDaSemana(dia: string) {
  const dow = new Date(`${dia}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return somarDias(dia, dow === 0 ? -6 : 1 - dow);
}

/** Converte "AAAA-MM-DDTHH:MM" digitado (hora de Belém) para Date. */
export function deDataHoraLocal(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return null;
  const d = new Date(`${valor}:00${OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date → "AAAA-MM-DDTHH:MM" em hora de Belém (para input datetime-local). */
export function paraDataHoraLocal(d: Date) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
const fmtDiaSemana = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "short", day: "2-digit", month: "2-digit" });
const fmtDiaLongo = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long" });
const fmtDataHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" });

export const hora = (d: Date) => fmtHora.format(d);
export const diaSemana = (d: Date) => fmtDiaSemana.format(d);
export const diaLongo = (d: Date) => fmtDiaLongo.format(d);
export const dataHora = (d: Date) => fmtDataHora.format(d);

/** Data final da garantia a partir da conclusão. */
export function fimGarantia(concluida: Date, dias: number) {
  return new Date(concluida.getTime() + dias * 86_400_000);
}
