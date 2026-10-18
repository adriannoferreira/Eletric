"use client";

import { Download, Printer, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import type { QuadroDados } from "@/lib/eletrica/tipos";
import { Multifilar, type SeloMultifilar } from "./multifilar";
import { baixarSvg } from "./visor-unifilar";

const ZOOMS = [0.5, 0.75, 1, 1.5, 2];

/** Diagrama multifilar em tela cheia: zoom, rolagem, baixar SVG e imprimir (A4/A3 paisagem). */
export function VisorMultifilar({
  id,
  dados,
  analise,
  selo,
  alterado,
  aoFechar,
}: {
  id: number;
  dados: QuadroDados;
  analise: AnaliseQuadro;
  selo: SeloMultifilar;
  alterado: boolean;
  aoFechar: () => void;
}) {
  const [zoom, setZoom] = useState(2);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [aoFechar]);
  const arquivo = `multifilar-${selo.obra.normalize("NFD").replace(/[^\w-]+/g, "-").toLowerCase()}.svg`;
  const avisar = (e: React.MouseEvent) => {
    if (alterado && !confirm("Há alterações não salvas — o PDF usa a versão salva. Continuar?")) e.preventDefault();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-surface" role="dialog" aria-label="Diagrama multifilar">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <h2 className="mr-auto font-semibold">Diagrama multifilar</h2>
        <button className="btn btn-ghost p-2" disabled={zoom === 0} onClick={() => setZoom((z) => z - 1)} aria-label="Diminuir zoom">
          <ZoomOut className="size-5" />
        </button>
        <span className="w-12 text-center text-xs text-muted">{Math.round(ZOOMS[zoom] * 100)}%</span>
        <button className="btn btn-ghost p-2" disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom((z) => z + 1)} aria-label="Aumentar zoom">
          <ZoomIn className="size-5" />
        </button>
        <button className="btn btn-secondary" onClick={() => baixarSvg("multifilar-visor", arquivo)}>
          <Download className="size-4" /> Baixar SVG
        </button>
        <a href={`/quadros/${id}/imprimir?doc=multifilar&auto=1`} target="_blank" className="btn btn-secondary" onClick={avisar}>
          <Printer className="size-4" /> PDF A4
        </a>
        <a href={`/quadros/${id}/imprimir?doc=multifilar&papel=a3&auto=1`} target="_blank" className="btn btn-secondary" onClick={avisar}>
          <Printer className="size-4" /> A3
        </a>
        <button className="btn btn-ghost p-2" onClick={aoFechar} aria-label="Fechar">
          <X className="size-5" />
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-white p-4 text-black">
        <div style={{ zoom: ZOOMS[zoom] }} className="w-max">
          <Multifilar dados={dados} analise={analise} selo={selo} svgId="multifilar-visor" />
        </div>
      </div>
    </div>
  );
}
