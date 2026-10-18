"use client";

import { ChevronLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export function BarraImpressao({ voltar, auto = false }: { voltar: string; auto?: boolean }) {
  useEffect(() => {
    if (auto) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [auto]);
  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
      <Link href={voltar} className="btn px-2 text-gray-700 hover:bg-gray-100">
        <ChevronLeft className="size-5" /> Voltar
      </Link>
      <button onClick={() => window.print()} className="btn bg-[#fbbf24] text-[#1a1400]">
        <Printer className="size-4" /> Salvar PDF / Imprimir
      </button>
    </div>
  );
}
