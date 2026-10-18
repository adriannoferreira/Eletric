"use client";

import { Download, Printer, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useState } from "react";
import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import type { QuadroDados } from "@/lib/eletrica/tipos";
import { type SeloUnifilar, Unifilar } from "./unifilar";

const ZOOMS = [0.5, 0.75, 1, 1.5, 2];

/** Baixa o SVG do unifilar já com fundo branco e traço preto (para abrir em qualquer programa). */
export function baixarSvg(svgId: string, nomeArquivo: string) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const copia = svg.cloneNode(true) as SVGSVGElement;
  copia.setAttribute("color", "#111111");
  copia.removeAttribute("class");
  const fundo = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  fundo.setAttribute("width", "100%");
  fundo.setAttribute("height", "100%");
  fundo.setAttribute("fill", "#ffffff");
  fundo.setAttribute("stroke", "none");
  copia.insertBefore(fundo, copia.firstChild);
  const blob = new Blob([new XMLSerializer().serializeToString(copia)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function VisorUnifilar({
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
  selo: SeloUnifilar;
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
  const arquivo = `unifilar-${selo.obra.normalize("NFD").replace(/[^\w-]+/g, "-").toLowerCase()}.svg`;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-surface" role="dialog" aria-label="Diagrama unifilar">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <h2 className="mr-auto font-semibold">Diagrama unifilar</h2>
        <button className="btn btn-ghost p-2" disabled={zoom === 0} onClick={() => setZoom((z) => z - 1)} aria-label="Diminuir zoom">
          <ZoomOut className="size-5" />
        </button>
        <span className="w-12 text-center text-xs text-muted">{Math.round(ZOOMS[zoom] * 100)}%</span>
        <button className="btn btn-ghost p-2" disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom((z) => z + 1)} aria-label="Aumentar zoom">
          <ZoomIn className="size-5" />
        </button>
        <button className="btn btn-secondary" onClick={() => baixarSvg("unifilar-visor", arquivo)}>
          <Download className="size-4" /> Baixar SVG
        </button>
        <a
          href={`/quadros/${id}/imprimir?doc=unifilar&auto=1`}
          target="_blank"
          className="btn btn-secondary"
          onClick={(e) => {
            if (alterado && !confirm("Há alterações não salvas — o PDF usa a versão salva. Continuar?")) e.preventDefault();
          }}
        >
          <Printer className="size-4" /> Imprimir/PDF
        </a>
        <button className="btn btn-ghost p-2" onClick={aoFechar} aria-label="Fechar">
          <X className="size-5" />
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-white p-4 text-black">
        <div style={{ zoom: ZOOMS[zoom] }} className="w-max [&_svg]:text-black">
          <Unifilar dados={dados} analise={analise} selo={selo} svgId="unifilar-visor" />
        </div>
      </div>
    </div>
  );
}
