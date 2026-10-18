import { ExternalLink } from "lucide-react";
import type { PadraoEquatorial } from "@/lib/eletrica/equatorial";
import { NORMAS, REQUISITOS_PADRAO, ROTULO_LIGACAO } from "@/lib/normas/equatorial-pa";

const n = (v: number, d = 2) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });

/** Requisitos do padrão que valem para qualquer quadro (resumo para o projeto). */
const RESUMO_REQUISITOS = REQUISITOS_PADRAO.filter((r) =>
  ["Ponto de conexão e medição", "Aterramento", "Caixas de medição", "Postes", "Proteção"].includes(r.tema),
);

/**
 * Bloco "Padrão de entrada (Equatorial PA)": enquadramento oficial pela NT.00001 rev. 09,
 * com citações, estudos/bloqueios e link para a calculadora com o quadro pré-carregado.
 */
export function BlocoPadraoEquatorial({
  padrao,
  quadroId,
  disjuntorQdcA,
  impressao = false,
}: {
  padrao: PadraoEquatorial;
  quadroId?: number;
  disjuntorQdcA?: number | null;
  impressao?: boolean;
}) {
  const { categoria: c, demanda: d } = padrao;
  const l = c.linha;
  const nt = NORMAS["NT.00001"];
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-muted">
        Equatorial Pará — {nt.codigo} rev. {nt.revisao} ({nt.titulo}). Padrão dimensionado pela carga instalada (Tabela 2).
      </p>

      {c.bloqueios.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-danger-soft p-3 text-danger print:border print:border-danger print:bg-white">
          {c.bloqueios.map((b, i) => (
            <li key={i}>⛔ {b}</li>
          ))}
        </ul>
      )}

      {l && c.tipo !== "media_tensao" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Item r="Tipo de ligação" v={`${ROTULO_LIGACAO[c.tipo]} ${c.tensao}`} />
          <Item r="Carga instalada" v={`${n(d.cargaInstaladaKW)} kW`} />
          <Item r="Disjuntor do padrão" v={`${l.disjuntorA} A`} />
          <Item r="Condutor do cliente (Cu, 1 kV)" v={`${l.condutorCliente} mm²`} />
          <Item r="Eletroduto de entrada (aço)" v={l.eletrodutoAco} />
          <Item r="Aterramento (aço cobreado)" v={`${l.aterramentoMm2} mm² · PVC ${l.eletrodutoAterramento}`} />
          <Item r="Haste" v="1 × Ø 16 × 1.500 mm" />
          <Item r="Demanda estimada" v={`${n(d.demandaKVA)} kVA`} />
        </div>
      )}

      {c.motivos.length > 0 && (
        <div>
          <p className="font-semibold">Por que este tipo de ligação</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {c.motivos.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {disjuntorQdcA != null && l && (
        <p className={disjuntorQdcA > l.disjuntorA ? "text-danger" : "text-muted"}>
          Disjuntor geral do QDC: {disjuntorQdcA} A {disjuntorQdcA > l.disjuntorA ? "— MAIOR que o do padrão; reduzir" : "— não maior que o do padrão"} (NT.00001
          item 6.3.8.6).
        </p>
      )}

      {c.estudos.length > 0 && (
        <div className="rounded-xl bg-warn-soft p-3 text-warn print:border print:border-warn print:bg-white">
          <p className="font-semibold">Exige estudo da Equatorial antes da ligação</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {c.estudos.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {c.avisos.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-warn">
          {c.avisos.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      )}

      {l?.observacao && <p className="text-xs text-muted">{l.observacao}</p>}

      <details className="rounded-xl border border-border p-3" open={impressao}>
        <summary className="cursor-pointer font-semibold">Requisitos do padrão de entrada</summary>
        <ul className="mt-2 space-y-1.5">
          {RESUMO_REQUISITOS.map((r, i) => (
            <li key={i}>
              {r.texto} <span className="text-xs text-muted">({r.ref})</span>
            </li>
          ))}
        </ul>
      </details>

      <p className="text-xs text-muted">Referências: {c.referencias.join(" · ")}.</p>

      {!impressao && (
        <div className="flex flex-wrap gap-2">
          <a href={`/normas/calculadora${quadroId ? `?quadro=${quadroId}` : ""}`} className="btn btn-secondary">
            Calculadora do padrão (materiais, vistoria e orçamento)
          </a>
          <a href={nt.url} target="_blank" rel="noreferrer" className="btn btn-ghost">
            <ExternalLink className="size-4" /> Norma oficial
          </a>
        </div>
      )}
    </div>
  );
}

function Item({ r, v }: { r: string; v: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3 print:border print:border-border print:bg-white">
      <p className="text-xs text-muted">{r}</p>
      <p className="font-bold">{v}</p>
    </div>
  );
}
