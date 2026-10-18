import { Info, MoreHorizontal, TriangleAlert } from "lucide-react";

/** Citação de norma como selo pequeno; o texto completo fica no title (toque/hover). */
export function SeloRef({ children, titulo, href }: { children: React.ReactNode; titulo?: string; href?: string }) {
  const cls = "inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] font-normal text-muted print:border print:border-border";
  const conteudo = (
    <>
      {children} <Info className="size-3 print:hidden" />
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" title={titulo} className={cls}>
      {conteudo}
    </a>
  ) : (
    <span title={titulo} className={cls}>
      {conteudo}
    </span>
  );
}

/** Avisos "conferir" agrupados num único selo ⚠ que abre a lista. */
export function SeloConferir({ itens, aberto = false }: { itens: React.ReactNode[]; aberto?: boolean }) {
  if (!itens.length) return null;
  return (
    <details open={aberto} className="text-sm">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-xs text-warn">
        <TriangleAlert className="size-3" /> Conferir ({itens.length})
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-warn">
        {itens.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </details>
  );
}

/** Ações secundárias atrás de "⋯". */
export function MenuMais({ children }: { children: React.ReactNode }) {
  return (
    <details className="relative">
      <summary aria-label="Mais opções" className="btn btn-ghost list-none px-2">
        <MoreHorizontal className="size-4" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 flex min-w-52 flex-col gap-1 rounded-xl border border-border bg-surface p-2 shadow-lg [&>*]:justify-start">
        {children}
      </div>
    </details>
  );
}
