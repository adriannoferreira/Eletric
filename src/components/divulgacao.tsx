"use client";

/**
 * Componentes de "divulgação progressiva": o conteúdo técnico continua no app,
 * mas fica atrás de um toque (ajuda, norma, conferir, detalhes, mais opções).
 * Regras de uso em docs/UX.md.
 */

import { AlertTriangle, ChevronDown, CircleHelp, Info, MoreHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

/** Painel que abre como bottom sheet no celular e como popover ancorado no notebook. */
function Painel({
  titulo,
  aberto,
  aoFechar,
  children,
  alinhar = "esquerda",
}: {
  titulo: string;
  aberto: boolean;
  aoFechar: () => void;
  children: React.ReactNode;
  alinhar?: "esquerda" | "direita";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    const fora = (e: MouseEvent) => {
      if (window.matchMedia("(min-width: 768px)").matches && ref.current && !ref.current.contains(e.target as Node)) aoFechar();
    };
    document.addEventListener("keydown", tecla);
    document.addEventListener("mousedown", fora);
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("mousedown", fora);
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={aoFechar} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-left text-sm font-normal normal-case tracking-normal text-fg shadow-2xl outline-none md:absolute md:inset-x-auto md:bottom-auto md:top-full md:mt-2 md:w-80 md:rounded-2xl md:p-4 ${
          alinhar === "direita" ? "md:right-0" : "md:left-0"
        }`}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <p id={id} className="font-semibold">
            {titulo}
          </p>
          <button type="button" onClick={aoFechar} className="-m-1 rounded-lg p-1 text-muted hover:bg-surface-2" aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-2 leading-relaxed text-muted [&_strong]:text-fg">{children}</div>
      </div>
    </>
  );
}

function useAberto() {
  const [aberto, setAberto] = useState(false);
  return { aberto, abrir: () => setAberto(true), fechar: () => setAberto(false), alternar: () => setAberto((v) => !v) };
}

/** Botão (?) com a explicação da tela ou do campo. */
export function Ajuda({ titulo = "Como funciona", children, alinhar }: { titulo?: string; children: React.ReactNode; alinhar?: "esquerda" | "direita" }) {
  const a = useAberto();
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={a.alternar}
        aria-expanded={a.aberto}
        aria-label={`Ajuda: ${titulo}`}
        className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
      >
        <CircleHelp className="size-4" />
      </button>
      <Painel titulo={titulo} aberto={a.aberto} aoFechar={a.fechar} alinhar={alinhar}>
        {children}
      </Painel>
    </span>
  );
}

/** Selo de norma tocável: "NBR 5410 9.5.2 ⓘ". */
export function Ref({
  norma,
  item,
  children,
  href,
}: {
  norma: string;
  item?: string;
  children?: React.ReactNode;
  href?: string;
}) {
  const a = useAberto();
  const rotulo = [norma, item].filter(Boolean).join(" ");
  if (!children && !href) {
    return <span className="badge bg-surface-2 text-muted">{rotulo}</span>;
  }
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={a.alternar}
        aria-expanded={a.aberto}
        className="badge gap-1 bg-surface-2 text-muted transition hover:text-fg"
      >
        {rotulo}
        <Info className="size-3" />
      </button>
      <Painel titulo={rotulo} aberto={a.aberto} aoFechar={a.fechar}>
        {children}
        {href && (
          <a href={href} target="_blank" rel="noreferrer" className="inline-block font-medium text-info underline">
            Abrir norma oficial
          </a>
        )}
      </Painel>
    </span>
  );
}

/** Selo único ⚠ que reúne tudo o que deve ser conferido na tela. */
export function Conferir({ itens, titulo = "Conferir antes de usar" }: { itens: React.ReactNode[]; titulo?: string }) {
  const a = useAberto();
  const lista = itens.filter(Boolean);
  if (lista.length === 0) return null;
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        onClick={a.alternar}
        aria-expanded={a.aberto}
        className="badge gap-1 bg-warn-soft text-warn transition hover:brightness-95"
      >
        <AlertTriangle className="size-3" />
        Conferir{lista.length > 1 ? ` (${lista.length})` : ""}
      </button>
      <Painel titulo={titulo} aberto={a.aberto} aoFechar={a.fechar}>
        <ul className="list-disc space-y-1 pl-4">
          {lista.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </Painel>
    </span>
  );
}

/** Seção recolhível (fechada por padrão). */
export function Detalhes({
  titulo,
  children,
  aberto = false,
  className = "",
  extra,
}: {
  titulo: React.ReactNode;
  children: React.ReactNode;
  aberto?: boolean;
  className?: string;
  extra?: React.ReactNode;
}) {
  return (
    <details open={aberto} className={`group card ${className}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{titulo}</span>
        {extra}
        <ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

/** Campos secundários de formulário, escondidos por padrão. */
export function MaisOpcoes({ children, rotulo = "Mais opções" }: { children: React.ReactNode; rotulo?: string }) {
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-muted hover:text-fg [&::-webkit-details-marker]:hidden">
        {rotulo}
        <ChevronDown className="size-4 transition group-open:rotate-180" />
      </summary>
      <div className="mt-3 space-y-4">{children}</div>
    </details>
  );
}

export type AcaoMenu = {
  rotulo: string;
  /** Elemento do ícone (ex.: <Bot className="size-4" />) — serializável a partir de server components. */
  icone?: React.ReactNode;
  href?: string;
  externo?: boolean;
  onClick?: () => void;
  perigo?: boolean;
};

/** Botão "⋯" com as ações secundárias da tela. */
export function MenuAcoes({ acoes, rotulo = "Mais ações" }: { acoes: AcaoMenu[]; rotulo?: string }) {
  const a = useAberto();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!a.aberto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && a.fechar();
    const fora = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && a.fechar();
    document.addEventListener("keydown", tecla);
    document.addEventListener("mousedown", fora);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("mousedown", fora);
    };
  }, [a]);

  if (acoes.length === 0) return null;
  const classe = (perigo?: boolean) =>
    `flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm hover:bg-surface-2 ${perigo ? "text-danger" : ""}`;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={a.alternar} aria-expanded={a.aberto} aria-haspopup="menu" aria-label={rotulo} className="btn btn-secondary p-2.5">
        <MoreHorizontal className="size-5" />
      </button>
      {a.aberto && (
        <div role="menu" className="absolute right-0 z-40 mt-1 w-60 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-xl">
          {acoes.map((x) => {
            const conteudo = (
              <>
                {x.icone && <span className="shrink-0 [&_svg]:size-4">{x.icone}</span>}
                {x.rotulo}
              </>
            );
            if (x.href) {
              return x.externo ? (
                <a key={x.rotulo} role="menuitem" href={x.href} target="_blank" rel="noreferrer" className={classe(x.perigo)} onClick={a.fechar}>
                  {conteudo}
                </a>
              ) : (
                <Link key={x.rotulo} role="menuitem" href={x.href} className={classe(x.perigo)} onClick={a.fechar}>
                  {conteudo}
                </Link>
              );
            }
            return (
              <button
                key={x.rotulo}
                type="button"
                role="menuitem"
                className={classe(x.perigo)}
                onClick={() => {
                  a.fechar();
                  x.onClick?.();
                }}
              >
                {conteudo}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
