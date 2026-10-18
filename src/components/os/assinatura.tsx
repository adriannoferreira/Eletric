"use client";

import { Eraser } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Área para o cliente assinar com o dedo. Devolve PNG em data URL (ou null se vazia). */
export function PadAssinatura({ aoMudar }: { aoMudar: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [vazio, setVazio] = useState(true);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  function ponto(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function exportar() {
    const c = ref.current!;
    // Exporta com fundo branco para ficar legível no relatório.
    const out = document.createElement("canvas");
    out.width = c.width;
    out.height = c.height;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(c, 0, 0);
    aoMudar(out.toDataURL("image/png"));
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <canvas
          ref={ref}
          className="h-40 w-full touch-none rounded-xl border-2 border-dashed border-border bg-white"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            desenhando.current = true;
            const ctx = e.currentTarget.getContext("2d")!;
            const p = ponto(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + 0.1, p.y + 0.1);
            ctx.stroke();
          }}
          onPointerMove={(e) => {
            if (!desenhando.current) return;
            const ctx = e.currentTarget.getContext("2d")!;
            const p = ponto(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }}
          onPointerUp={() => {
            if (!desenhando.current) return;
            desenhando.current = false;
            setVazio(false);
            exportar();
          }}
        />
        {vazio && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-gray-400">
            Assine aqui com o dedo
          </span>
        )}
      </div>
      <button
        type="button"
        className="btn btn-ghost px-2 py-1 text-xs text-muted"
        onClick={() => {
          const c = ref.current!;
          c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
          setVazio(true);
          aoMudar(null);
        }}
      >
        <Eraser className="size-3.5" /> Limpar
      </button>
    </div>
  );
}
