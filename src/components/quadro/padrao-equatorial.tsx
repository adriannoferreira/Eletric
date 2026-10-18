import { ExternalLink } from "lucide-react";
import type { PadraoEquatorial } from "@/lib/eletrica/equatorial";
import { NORMAS, REQUISITOS_PADRAO, ROTULO_LIGACAO } from "@/lib/normas/equatorial-pa";
import { MenuMais, SeloConferir, SeloRef } from "./mini";

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
  const qdcMaior = disjuntorQdcA != null && !!l && disjuntorQdcA > l.disjuntorA;
  const conferir = [...c.avisos, ...(l?.observacao ? [l.observacao] : [])];
  return (
    <div className="space-y-3 text-sm">
      {c.bloqueios.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-danger-soft p-3 text-danger print:border print:border-danger print:bg-white">
          {c.bloqueios.map((b, i) => (
            <li key={i}>⛔ {b}</li>
          ))}
        </ul>
      )}

      {l && c.tipo !== "media_tensao" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Item r="Ligação" v={`${ROTULO_LIGACAO[c.tipo]} ${c.tensao}`} />
          <Item r="Disjuntor do padrão" v={`${l.disjuntorA} A`} />
          <Item r="Condutor (Cu)" v={`${l.condutorCliente} mm²`} />
          <Item r="Aterramento" v={`${l.aterramentoMm2} mm²`} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <SeloRef href={nt.url} titulo={`${nt.codigo} rev. ${nt.revisao} — ${nt.titulo}`}>
          {nt.codigo} Tab. 2
        </SeloRef>
        {disjuntorQdcA != null && l && (
          <span className={`text-xs ${qdcMaior ? "font-semibold text-danger" : "text-muted"}`}>
            QDC {disjuntorQdcA} A {qdcMaior ? "> padrão — reduzir" : "≤ padrão ✓"}
          </span>
        )}
        {disjuntorQdcA != null && l && <SeloRef titulo="Disjuntor geral do QDC não pode ser maior que o do padrão">6.3.8.6</SeloRef>}
      </div>

      {c.estudos.length > 0 && (
        <details open={impressao} className="rounded-xl bg-warn-soft p-3 text-warn print:border print:border-warn print:bg-white">
          <summary className="cursor-pointer font-semibold">Exige estudo da Equatorial ({c.estudos.length})</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {c.estudos.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}

      <SeloConferir itens={conferir} aberto={impressao} />

      <details open={impressao} className="rounded-xl border border-border p-3">
        <summary className="cursor-pointer font-semibold">Detalhes</summary>
        <div className="mt-2 space-y-3">
          {l && c.tipo !== "media_tensao" && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Item r="Carga instalada" v={`${n(d.cargaInstaladaKW)} kW`} />
              <Item r="Demanda estimada" v={`${n(d.demandaKVA)} kVA`} />
              <Item r="Eletroduto de entrada (aço)" v={l.eletrodutoAco} />
              <Item r="Aterramento" v={`aço cobreado · PVC ${l.eletrodutoAterramento}`} />
              <Item r="Haste" v="1 × Ø 16 × 1.500 mm" />
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
          <div>
            <p className="font-semibold">Requisitos do padrão</p>
            <ul className="mt-1 space-y-1.5">
              {RESUMO_REQUISITOS.map((r, i) => (
                <li key={i}>
                  {r.texto} <SeloRef>{r.ref}</SeloRef>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-1">
            {c.referencias.map((r) => (
              <SeloRef key={r}>{r}</SeloRef>
            ))}
          </div>
        </div>
      </details>

      {!impressao && (
        <div className="flex items-center gap-2">
          <a href={`/normas/calculadora${quadroId ? `?quadro=${quadroId}` : ""}`} className="btn btn-secondary">
            Calculadora do padrão
          </a>
          <MenuMais>
            <a href={nt.url} target="_blank" rel="noreferrer" className="btn btn-ghost">
              <ExternalLink className="size-4" /> Norma oficial ({nt.codigo})
            </a>
          </MenuMais>
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
