"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";

/** Abre a janela de impressão automaticamente (?auto=1) depois que a página desenha. */
export function AutoImprimir({ ativo }: { ativo: boolean }) {
  useEffect(() => {
    if (!ativo) return;
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [ativo]);
  return null;
}

export function BotaoImprimir({ rotulo = "Imprimir / Salvar PDF" }: { rotulo?: string }) {
  return (
    <button onClick={() => window.print()} className="btn btn-primary">
      <Printer className="size-4" /> {rotulo}
    </button>
  );
}

/** Fotos dos itens guardadas neste aparelho (localStorage) — só aparecem se impresso aqui. */
export function FotosLocais({ chaves }: { chaves: { chave: string; legenda: string }[] }) {
  const [fotos, setFotos] = useState<{ src: string; legenda: string }[]>([]);
  useEffect(() => {
    const lista: { src: string; legenda: string }[] = [];
    for (const c of chaves) {
      try {
        const src = localStorage.getItem(c.chave);
        if (src) lista.push({ src, legenda: c.legenda });
      } catch {}
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fotos vêm do localStorage deste aparelho
    setFotos(lista);
  }, [chaves]);
  if (fotos.length === 0) {
    return <p className="text-xs text-muted">Sem fotos neste aparelho (as fotos ficam só no aparelho em que foram tiradas).</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {fotos.map((f, i) => (
        <figure key={i} className="break-inside-avoid">
          {/* eslint-disable-next-line @next/next/no-img-element -- foto local (data URL) */}
          <img src={f.src} alt={f.legenda} className="w-full rounded border border-border" />
          <figcaption className="mt-1 text-[10px] leading-tight">{f.legenda}</figcaption>
        </figure>
      ))}
    </div>
  );
}
