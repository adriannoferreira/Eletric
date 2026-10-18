"use client";

import { useMemo, useState } from "react";
import { modulosOcupados, NOME_TIPO_PECA, type Peca, PECAS, REFERENCIAS_FABRICANTES, type TipoPeca } from "@/lib/eletrica/pecas";
import { PecaVisual } from "./peca-visual";

/** Catálogo de peças com filtros. `cabe` diz se a peça cabe no espaço escolhido. */
export function SeletorPeca({
  aoEscolher,
  cabe,
  polosMax,
}: {
  aoEscolher: (p: Peca) => void;
  cabe: (p: Peca) => boolean;
  polosMax: number;
}) {
  const [tipo, setTipo] = useState<TipoPeca>("disjuntor");
  const [polos, setPolos] = useState(1);
  const [curva, setCurva] = useState<"B" | "C">("C");

  const lista = useMemo(
    () =>
      PECAS.filter(
        (p) =>
          p.tipo === tipo &&
          (tipo === "dps" || p.polos === polos) &&
          (tipo !== "disjuntor" || p.curva === curva),
      ),
    [tipo, polos, curva],
  );

  const opcoesPolos = tipo === "dr" ? [2, 4] : tipo === "seccionadora" ? [2, 3, 4] : tipo === "dps" ? [] : [1, 2, 3].filter((p) => p <= polosMax);

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(Object.keys(NOME_TIPO_PECA) as TipoPeca[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTipo(t);
              setPolos(t === "dr" ? 2 : t === "seccionadora" ? 2 : 1);
            }}
            className={`btn shrink-0 py-2 ${tipo === t ? "btn-primary" : "btn-secondary"}`}
          >
            {NOME_TIPO_PECA[t]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        {opcoesPolos.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="label">Polos</span>
            {opcoesPolos.map((p) => (
              <button key={p} onClick={() => setPolos(p)} className={`badge py-1.5 ${polos === p ? "bg-accent text-accent-fg" : "bg-surface-2"}`}>
                {p}P
              </button>
            ))}
          </div>
        )}
        {tipo === "disjuntor" && (
          <div className="flex items-center gap-1.5">
            <span className="label">Curva</span>
            {(["B", "C"] as const).map((c) => (
              <button key={c} onClick={() => setCurva(c)} className={`badge py-1.5 ${curva === c ? "bg-accent text-accent-fg" : "bg-surface-2"}`}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      {tipo === "disjuntor" && (
        <p className="text-xs text-muted">
          Curva B: cargas resistivas e iluminação (disparo 3–5 × In). Curva C: tomadas e motores (5–10 × In).
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {lista.map((p) => {
          const ok = cabe(p);
          return (
            <button
              key={p.id}
              disabled={!ok}
              onClick={() => aoEscolher(p)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border p-2.5 transition hover:border-accent disabled:opacity-35"
              title={ok ? p.descricao : "Não cabe neste espaço"}
            >
              <div className="flex h-20 items-center">
                <PecaVisual peca={p} m={22} altura={74} fases={[]} />
              </div>
              <span className="text-center text-xs font-semibold leading-tight">{p.nome}</span>
              <span className="text-[10px] text-muted">{modulosOcupados(p)} mód.</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        Linhas de referência: {REFERENCIAS_FABRICANTES[tipo].join(", ")}. Larguras, Icn e códigos variam —
        confira o datasheet do fabricante.
      </p>
    </div>
  );
}
