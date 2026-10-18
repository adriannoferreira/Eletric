"use client";

import { ChevronRight, Plus, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui";
import type { AnaliseQuadro } from "@/lib/eletrica/calculo";

const TOM = { ok: "ok", info: "ok", aviso: "aviso", erro: "perigo" } as const;
const ROTULO = { ok: "OK", info: "OK", aviso: "Atenção", erro: "Corrigir" } as const;
const n = (v: number, d = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });

export function PainelCircuitos({
  analise,
  aoAbrir,
  aoNovo,
}: {
  analise: AnaliseQuadro;
  aoAbrir: (id: string) => void;
  aoNovo: () => void;
}) {
  return (
    <div className="space-y-3">
      {analise.circuitos.length === 0 && (
        <p className="rounded-xl bg-surface-2 p-4 text-sm text-muted">
          Nenhum circuito ainda.
        </p>
      )}
      <ul className="space-y-2">
        {analise.circuitos.map((r, i) => (
          <li key={r.circuito.id}>
            <button
              onClick={() => aoAbrir(r.circuito.id)}
              className="card flex w-full items-center gap-3 p-3 text-left transition hover:border-accent"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-sm font-bold">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-semibold">{r.circuito.nome}</p>
                  {r.temDR && <ShieldCheck className="size-4 shrink-0 text-ok" aria-label="Protegido por DR" />}
                </div>
                <p className="truncate text-xs text-muted">
                  {n(r.circuito.potenciaW, 0)} W · <b className="text-fg">{r.dim.secao ? n(r.dim.secao) : "?"} mm²</b> ·{" "}
                  <b className="text-fg">{r.pecaDisjuntor ? r.pecaDisjuntor.rotulo : "sem disj."}</b>
                  {r.fases.length > 0 && ` · ${r.fases.join("+")}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Badge tom={TOM[r.status]}>{ROTULO[r.status]}</Badge>
                <ChevronRight className="size-4 text-muted" />
              </div>
            </button>
          </li>
        ))}
      </ul>
      <button onClick={aoNovo} className="btn btn-primary w-full">
        <Plus className="size-4" /> Adicionar circuito
      </button>
    </div>
  );
}

/** Quadro de cargas em tabela (para conferência e impressão). */
export function QuadroCargas({ analise }: { analise: AnaliseQuadro }) {
  if (analise.circuitos.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="py-2 pr-2">#</th>
            <th className="pr-2">Circuito</th>
            <th className="pr-2 text-right">W</th>
            <th className="pr-2 text-right">V</th>
            <th className="pr-2">Fases</th>
            <th className="pr-2 text-right">Ib (A)</th>
            <th className="pr-2 text-right">Cabo</th>
            <th className="pr-2">Disj.</th>
            <th className="pr-2">DR</th>
            <th className="text-right">ΔV%</th>
          </tr>
        </thead>
        <tbody>
          {analise.circuitos.map((r, i) => (
            <tr key={r.circuito.id} className="border-b border-border/60">
              <td className="py-1.5 pr-2 font-semibold">{i + 1}</td>
              <td className="pr-2">{r.circuito.nome}</td>
              <td className="pr-2 text-right">{n(r.circuito.potenciaW, 0)}</td>
              <td className="pr-2 text-right">{r.tensaoV}</td>
              <td className="pr-2">{r.fases.join("+") || "—"}</td>
              <td className="pr-2 text-right">{n(r.dim.ib)}</td>
              <td className="pr-2 text-right">{r.dim.secao ? `${n(r.dim.secao)} mm²` : "—"}</td>
              <td className="pr-2">{r.pecaDisjuntor?.rotulo ?? "—"}</td>
              <td className="pr-2">{r.temDR ? "Sim" : r.exigeDR ? "Falta" : "—"}</td>
              <td className="text-right">{n(r.dim.quedaPct, 2)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td />
            <td className="py-2">Total</td>
            <td className="text-right">{n(analise.potenciaTotalW, 0)}</td>
            <td colSpan={7} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
