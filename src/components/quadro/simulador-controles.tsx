"use client";

import { ArrowDownUp, Copy, Move, Pencil, Power, Trash2, X, ZoomIn, ZoomOut, Zap } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

/** Barrinha flutuante sobre a peça tocada (estilo editor de vídeo). */
export function BarraFerramentas({
  movendo,
  invertida,
  aoMover,
  aoDuplicar,
  aoInverter,
  aoApagar,
  aoEditar,
}: {
  movendo: boolean;
  invertida: boolean;
  aoMover: () => void;
  aoDuplicar: () => void;
  aoInverter: () => void;
  aoApagar: () => void;
  aoEditar: () => void;
}) {
  const b = "grid size-10 place-items-center rounded-full text-[#111827] transition hover:bg-black/5 active:scale-95";
  return (
    <div
      className="flex items-center gap-0.5 rounded-full bg-white px-1.5 py-1 shadow-[0_6px_24px_rgba(0,0,0,.35)] ring-1 ring-black/5"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button type="button" className={`${b} ${movendo ? "bg-amber-100" : ""}`} onClick={aoMover} aria-label="Mover (ou arraste a peça)" title="Mover — ou arraste a peça">
        <Move className="size-5" />
      </button>
      <button type="button" className={b} onClick={aoDuplicar} aria-label="Duplicar" title="Duplicar">
        <Copy className="size-5" />
      </button>
      <button type="button" className={`${b} ${invertida ? "bg-amber-100" : ""}`} onClick={aoInverter} aria-label="Inverter alimentação" title="Inverter alimentação (entrada por baixo)">
        <ArrowDownUp className="size-5" />
      </button>
      <button type="button" className={b} onClick={aoApagar} aria-label="Apagar" title="Apagar">
        <Trash2 className="size-5" />
      </button>
      <span className="mx-0.5 h-6 w-px bg-black/10" />
      <button type="button" className={b} onClick={aoEditar} aria-label="Editar peça" title="Editar">
        <Pencil className="size-5" />
      </button>
    </div>
  );
}

/** Aviso com "Desfazer" (some sozinho). */
export function AvisoDesfazer({ texto, aoDesfazer, aoFechar }: { texto: string; aoDesfazer: () => void; aoFechar: () => void }) {
  useEffect(() => {
    const t = setTimeout(aoFechar, 6000);
    return () => clearTimeout(t);
  }, [aoFechar]);
  return (
    <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4 md:bottom-6">
      <div className="flex items-center gap-3 rounded-full bg-[#111827] py-2 pl-4 pr-2 text-sm text-white shadow-xl">
        {texto}
        <button className="rounded-full bg-white/10 px-3 py-1 font-semibold text-[#fbbf24] hover:bg-white/20" onClick={aoDesfazer}>
          Desfazer
        </button>
      </div>
    </div>
  );
}

/**
 * Modo apresentação: tela cheia azul-marinho só com o quadro (para gravar vídeo
 * ou mostrar ao cliente). Usa a API de tela cheia quando o aparelho permite.
 */
export function Apresentacao({
  children,
  aoFechar,
  aoZoom,
  podeMenos,
  podeMais,
  animar,
  aoAnimar,
  desligados,
  aoReligar,
}: {
  children: ReactNode;
  aoFechar: () => void;
  aoZoom: (d: number) => void;
  podeMenos: boolean;
  podeMais: boolean;
  animar: boolean;
  aoAnimar: () => void;
  desligados: number;
  aoReligar: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.requestFullscreen?.().catch(() => {});
    const sair = () => {
      if (!document.fullscreenElement) aoFechar();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("fullscreenchange", sair);
    window.addEventListener("keydown", esc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("fullscreenchange", sair);
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = overflow;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [aoFechar]);
  const b = "grid size-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 disabled:opacity-30";
  return (
    <div ref={ref} className="fixed inset-0 z-[80] flex flex-col bg-[#071538]">
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <div className="mx-auto w-max p-4 pb-24">{children}</div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto flex gap-2">
          <button className={b} onClick={() => aoZoom(-1)} disabled={!podeMenos} aria-label="Diminuir zoom">
            <ZoomOut className="size-5" />
          </button>
          <button className={b} onClick={() => aoZoom(1)} disabled={!podeMais} aria-label="Aumentar zoom">
            <ZoomIn className="size-5" />
          </button>
          <button className={`${b} ${animar ? "!bg-[#fbbf24] !text-[#1a1400]" : ""}`} onClick={aoAnimar} aria-label="Animar corrente">
            <Zap className="size-5" />
          </button>
          {desligados > 0 && (
            <button className={b} onClick={aoReligar} aria-label="Religar tudo">
              <Power className="size-5" />
            </button>
          )}
          <button className={b} onClick={aoFechar} aria-label="Sair da apresentação">
            <X className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
