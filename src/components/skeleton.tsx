/** Blocos de carregamento ("skeleton") que imitam o formato de cada tela. */

export function Sk({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-surface-2 ${className}`} />;
}

export function SkCabecalho({ acao = true }: { acao?: boolean }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="space-y-2">
        <Sk className="h-7 w-44" />
        <Sk className="h-4 w-28" />
      </div>
      {acao && <Sk className="h-10 w-24" />}
    </div>
  );
}

export function SkLista({ linhas = 6, avatar = false }: { linhas?: number; avatar?: boolean }) {
  return (
    <div className="card divide-y divide-border">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          {avatar && <Sk className="size-11 shrink-0 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Sk className="h-4 w-3/5" />
            <Sk className="h-3 w-2/5" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Sk className="h-4 w-20" />
            <Sk className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkCards({ n = 4, className = "grid-cols-2 md:grid-cols-4" }: { n?: number; className?: string }) {
  return (
    <div className={`grid gap-2 ${className}`}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card space-y-2 p-4">
          <Sk className="h-3 w-20" />
          <Sk className="h-6 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SkFormulario({ campos = 6 }: { campos?: number }) {
  return (
    <div className="card grid gap-4 p-4 md:grid-cols-2 md:p-6">
      {Array.from({ length: campos }, (_, i) => (
        <div key={i} className="space-y-2">
          <Sk className="h-3.5 w-24" />
          <Sk className="h-11 w-full" />
        </div>
      ))}
      <Sk className="h-11 w-full md:w-40" />
    </div>
  );
}

export function SkAbas({ n = 4 }: { n?: number }) {
  return (
    <div className="mb-4 flex gap-2 overflow-hidden">
      {Array.from({ length: n }, (_, i) => (
        <Sk key={i} className="h-8 w-24 shrink-0 rounded-full" />
      ))}
    </div>
  );
}
