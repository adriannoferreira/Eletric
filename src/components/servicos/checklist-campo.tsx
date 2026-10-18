"use client";

import { Check, ChevronDown, Printer, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Checklist para usar em campo. O progresso fica salvo neste aparelho
 * (é uma lista de apoio; para registrar o serviço, crie uma OS).
 */
export function ChecklistCampo({
  id,
  titulo,
  grupos,
  aberto = false,
}: {
  id: string;
  titulo: string;
  grupos: { titulo: string; itens: string[] }[];
  aberto?: boolean;
}) {
  const chave = `checklist:${id}`;
  const [feitos, setFeitos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const v = localStorage.getItem(chave);
      // Carrega o progresso salvo neste aparelho depois de montar (evita divergência com o HTML do servidor).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (v) setFeitos(JSON.parse(v));
    } catch {}
  }, [chave]);

  function alternar(k: string) {
    const novo = { ...feitos, [k]: !feitos[k] };
    setFeitos(novo);
    try {
      localStorage.setItem(chave, JSON.stringify(novo));
    } catch {}
  }

  const total = grupos.reduce((s, g) => s + g.itens.length, 0);
  const ok = Object.values(feitos).filter(Boolean).length;

  return (
    <details open={aberto} className="group card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <h2 className="font-semibold">
          {titulo} <span className="text-sm font-normal text-muted">({ok}/{total})</span>
        </h2>
        <ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">
      <div className="no-print mb-2 flex justify-end gap-1">
          <button onClick={() => window.print()} className="btn btn-ghost p-2" aria-label="Imprimir"><Printer className="size-4" /></button>
          <button
            onClick={() => {
              setFeitos({});
              try {
                localStorage.removeItem(chave);
              } catch {}
            }}
            className="btn btn-ghost p-2"
            aria-label="Limpar"
          >
            <RotateCcw className="size-4" />
          </button>
      </div>
      <div className="space-y-4">
        {grupos.map((g) => (
          <div key={g.titulo} className="break-inside-avoid">
            <p className="mb-1.5 text-sm font-semibold text-muted">{g.titulo}</p>
            <ul className="space-y-1">
              {g.itens.map((it) => {
                const k = `${g.titulo}|${it}`;
                return (
                  <li key={k}>
                    <button onClick={() => alternar(k)} className="flex w-full items-start gap-3 rounded-lg px-1 py-1.5 text-left">
                      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border-2 ${feitos[k] ? "border-ok bg-ok text-white" : "border-border"}`}>
                        {feitos[k] && <Check className="size-3.5" />}
                      </span>
                      <span className={`text-sm ${feitos[k] ? "text-muted line-through" : ""}`}>{it}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Salvo só neste aparelho.</p>
      </div>
    </details>
  );
}
