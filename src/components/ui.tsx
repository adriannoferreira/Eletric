import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Ajuda } from "./divulgacao";

export function Cabecalho({
  titulo,
  subtitulo,
  voltar,
  acoes,
  ajuda,
}: {
  titulo: string;
  subtitulo?: string;
  voltar?: string;
  acoes?: React.ReactNode;
  /** Explicação da tela, aberta pelo botão (?) ao lado do título. */
  ajuda?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {voltar && (
          <Link href={voltar} className="btn btn-ghost -ml-2 p-2" aria-label="Voltar">
            <ChevronLeft className="size-5" />
          </Link>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <h1 className="truncate text-2xl font-bold tracking-tight">{titulo}</h1>
            {ajuda && <Ajuda titulo={titulo}>{ajuda}</Ajuda>}
          </div>
          {subtitulo && <p className="mt-0.5 truncate text-sm text-muted">{subtitulo}</p>}
        </div>
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap justify-end gap-2">{acoes}</div>}
    </header>
  );
}

export function Vazio({
  icone: Icone,
  titulo,
  texto,
  acao,
}: {
  icone: React.ComponentType<{ className?: string }>;
  titulo: string;
  texto?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <Icone className="size-10 text-muted" />
      <div>
        <p className="font-semibold">{titulo}</p>
        {texto && <p className="mt-1 text-sm text-muted">{texto}</p>}
      </div>
      {acao}
    </div>
  );
}

export function Campo({
  rotulo,
  children,
  dica,
  ajuda,
  className = "",
}: {
  rotulo: string;
  children: React.ReactNode;
  dica?: string;
  /** Explicação do campo, aberta pelo (?) ao lado do rótulo — prefira a `dica` visível. */
  ajuda?: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="label flex items-center gap-0.5">
        {rotulo}
        {ajuda && <Ajuda titulo={rotulo}>{ajuda}</Ajuda>}
      </span>
      {children}
      {dica && <span className="block text-xs text-muted">{dica}</span>}
    </label>
  );
}

const TONS = {
  neutro: "bg-surface-2 text-muted",
  accent: "bg-accent-soft text-fg",
  ok: "bg-ok-soft text-ok",
  perigo: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  aviso: "bg-warn-soft text-warn",
} as const;

export type Tom = keyof typeof TONS;

export function Badge({ tom = "neutro", children }: { tom?: Tom; children: React.ReactNode }) {
  return <span className={`badge ${TONS[tom]}`}>{children}</span>;
}
