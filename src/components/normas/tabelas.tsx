import { fatorTabela4, ROTULO_LIGACAO, TABELA_2, TABELA_3 } from "@/lib/normas/equatorial-pa";

/** TABELA 2 da NT.00001 (127/220 V — Pará) em cartões, legível no celular. */
export function Tabela2() {
  return (
    <div className="space-y-2">
      {TABELA_2.map((l) => (
        <div key={`${l.tipo}-${l.disjuntorA}-${l.cargaAteKW}`} className="rounded-xl border border-border p-3 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-semibold">
              {ROTULO_LIGACAO[l.tipo]} · {l.cargaDeKW === 0 ? "até" : `${l.cargaDeKW.toLocaleString("pt-BR")} a`} {l.cargaAteKW.toLocaleString("pt-BR")} kW
            </p>
            <p className="text-lg font-bold">{l.disjuntorA} A</p>
          </div>
          <p className="mt-1 text-xs text-muted">
            Condutor do cliente {l.condutorCliente} mm² · eletroduto aço {l.eletrodutoAco} · aterramento {l.aterramentoMm2} mm² em {l.eletrodutoAterramento}
          </p>
          <p className="text-xs text-muted">
            Ramal (Equatorial):{" "}
            {[
              l.ramal.cobreConcentricoMm2 && `cobre concêntrico ${l.ramal.cobreConcentricoMm2}`,
              l.ramal.cobreMultiplexadoMm2 && `cobre multiplexado ${l.ramal.cobreMultiplexadoMm2}`,
              l.ramal.aluminio && `alumínio ${l.ramal.aluminio.tipo} ${l.ramal.aluminio.mm2}`,
            ]
              .filter(Boolean)
              .join(" · ")}{" "}
            mm²
          </p>
          {l.observacao && <p className="mt-1 text-xs text-warn">{l.observacao}</p>}
        </div>
      ))}
    </div>
  );
}

export function Tabela3() {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Aparelho (Tabela 3)</th>
              <th className="px-3 py-2 text-right font-medium">Potência (W)</th>
            </tr>
          </thead>
          <tbody>
            {TABELA_3.map((a) => (
              <tr key={a.aparelho} className="border-t border-border">
                <td className="px-3 py-1.5">{a.aparelho}</td>
                <td className="px-3 py-1.5 text-right">{a.potenciaW.toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Nº de aparelhos (Tabela 4)</th>
              <th className="px-3 py-2 text-right font-medium">até 3,5 kW</th>
              <th className="px-3 py-2 text-right font-medium">acima de 3,5 kW</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50, 60, 61].map((n) => (
              <tr key={n} className="border-t border-border">
                <td className="px-3 py-1.5">{n === 61 ? "acima de 61" : n}</td>
                <td className="px-3 py-1.5 text-right">{Math.round(fatorTabela4(n, 1) * 100)}%</td>
                <td className="px-3 py-1.5 text-right">{Math.round(fatorTabela4(n, 4) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
