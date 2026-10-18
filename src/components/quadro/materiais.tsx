"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import type { ItemMaterial } from "@/lib/eletrica/calculo";

export function ListaMateriais({ itens }: { itens: ItemMaterial[] }) {
  const [copiado, setCopiado] = useState(false);
  const texto = itens.map((i) => `${i.quantidade} ${i.unidade} — ${i.descricao}`).join("\n");
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-xl border border-border">
        {itens.map((i) => (
          <li key={i.descricao} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span>{i.descricao}</span>
            <span className="shrink-0 font-semibold">
              {i.quantidade} {i.unidade}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        Cabos com 10% de folga, por circuito (fase, neutro e proteção). Não inclui eletrodutos, caixas e
        terminais — some conforme a obra.
      </p>
      <button
        className="btn btn-secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
      >
        <Copy className="size-4" /> {copiado ? "Copiado!" : "Copiar lista"}
      </button>
    </div>
  );
}
