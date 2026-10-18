"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

/** Folha deslizante (celular) / janela central (notebook). */
export function Folha({
  titulo,
  aberta,
  aoFechar,
  children,
  rodape,
}: {
  titulo: string;
  aberta: boolean;
  aoFechar: () => void;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberta, aoFechar]);

  if (!aberta) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" onClick={aoFechar}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        role="dialog"
        aria-label={titulo}
        className="relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl border border-border bg-surface md:max-w-2xl md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-semibold">{titulo}</h2>
          <button onClick={aoFechar} className="btn btn-ghost -mr-2 p-2" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {rodape && (
          <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}
