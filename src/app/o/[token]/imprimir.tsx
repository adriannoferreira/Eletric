"use client";

import { Printer } from "lucide-react";

export function BotaoImprimir() {
  return (
    <button onClick={() => window.print()} className="btn btn-secondary">
      <Printer className="size-4" /> Salvar PDF / Imprimir
    </button>
  );
}
