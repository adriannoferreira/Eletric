"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { excluirConversa } from "./actions";

export type ItemHistorico = { id: number; titulo: string; quando: string };

export function Historico({
  itens,
  basePath,
  atual,
  aoEscolher,
}: {
  itens: ItemHistorico[];
  basePath: string;
  atual?: number;
  aoEscolher?: () => void;
}) {
  if (itens.length === 0) {
    return <p className="px-2 text-sm text-muted">Nenhuma conversa ainda.</p>;
  }
  return (
    <ul className="space-y-1">
      {itens.map((c) => (
        <li key={c.id} className="group flex items-center gap-1">
          <Link
            href={`${basePath}/${c.id}`}
            onClick={aoEscolher}
            className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-sm transition ${
              c.id === atual ? "bg-accent-soft" : "hover:bg-surface-2"
            }`}
          >
            <span className="block truncate font-medium">{c.titulo}</span>
            <span className="text-xs text-muted">{c.quando}</span>
          </Link>
          <button
            onClick={() => {
              if (confirm("Excluir esta conversa?")) excluirConversa(c.id, basePath);
            }}
            className="btn btn-ghost p-2 text-muted opacity-60 hover:text-danger group-hover:opacity-100"
            aria-label="Excluir conversa"
          >
            <Trash2 className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
