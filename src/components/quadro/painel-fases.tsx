import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import type { Fase } from "@/lib/eletrica/tipos";
import { COR_FASE } from "./montagem";

export function PainelFases({ analise, fases }: { analise: AnaliseQuadro; fases: Fase[] }) {
  const max = Math.max(1, ...fases.map((f) => analise.correntePorFase[f]));
  const n = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {fases.map((f) => {
          const v = analise.correntePorFase[f];
          return (
            <div key={f}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="size-3 rounded-full ring-1 ring-border" style={{ background: COR_FASE[f] }} /> Fase {f}
                </span>
                <span>{n(v)} A</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(v / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {fases.length > 1 && (
        <p className="text-sm">
          Desequilíbrio: <b className={analise.desequilibrioPct > 20 ? "text-warn" : "text-ok"}>{n(analise.desequilibrioPct)}%</b>
          <span className="text-muted"> — procure ficar abaixo de ~20% trocando circuitos de fase.</span>
        </p>
      )}
      <p className="text-xs text-muted">
        Soma simples das correntes de projeto, sem fator de demanda. Circuitos fase-fase contam nas duas fases.
      </p>
    </div>
  );
}
