"use client";

import { linhasDoModelo } from "@/lib/eletrica/caixas";
import { useState } from "react";
import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import { modulosOcupados, peca } from "@/lib/eletrica/pecas";
import { LOCAIS, type QuadroDados } from "@/lib/eletrica/tipos";

const FONTES = { P: 6, M: 7.5, G: 9 } as const;
/** Módulos por tira impressa: 10 × 18 mm = 180 mm cabem na largura útil de uma A4 em pé. */
const MAX_MODULOS_TIRA = 10;

type Celula = { largura: number; texto: string[]; tipo: string };

/** Divide a fileira em tiras de até MAX_MODULOS_TIRA módulos (reservas podem ser partidas). */
function emTiras(celulas: Celula[]) {
  const tiras: Celula[][] = [[]];
  let usados = 0;
  for (const c of celulas) {
    let resta = c.largura;
    while (resta > 0) {
      const livre = MAX_MODULOS_TIRA - usados;
      if (c.tipo !== "reserva" && c.largura > livre && usados > 0) {
        tiras.push([]);
        usados = 0;
        continue;
      }
      const parte = c.tipo === "reserva" ? Math.min(resta, livre) : resta;
      tiras[tiras.length - 1].push({ ...c, largura: parte });
      usados += parte;
      resta -= parte;
      if (usados >= MAX_MODULOS_TIRA && resta > 0) {
        tiras.push([]);
        usados = 0;
      }
    }
  }
  return tiras.filter((t) => t.length);
}

/** "Iluminação — Sala, Quarto" → ["Iluminação", "Sala, Quarto"]. */
export function partesNome(nome: string): [string, string | null] {
  const i = nome.indexOf(" — ");
  return i > 0 ? [nome.slice(0, i), nome.slice(i + 3)] : [nome, null];
}

/**
 * Etiquetas do quadro para impressão em preto e branco, alto contraste:
 * faixa na largura real do trilho (18 mm por módulo), legenda dos circuitos,
 * etiquetas de condutores/bornes e aviso de segurança.
 */
export function Etiquetas({
  nome,
  dados,
  analise,
  contato,
  data,
}: {
  nome: string;
  dados: QuadroDados;
  analise: AnaliseQuadro;
  contato: string;
  data: string;
}) {
  const [blocos, setBlocos] = useState({ faixa: true, legenda: true, bornes: true, aviso: true });
  const [fonte, setFonte] = useState<keyof typeof FONTES>("M");
  const pt = FONTES[fonte];
  const num = new Map(dados.circuitos.map((c, i) => [c.id, i + 1]));
  const drEtiqueta = new Map(
    dados.componentes.filter((c) => peca(c.pecaId)?.tipo === "dr").map((c, i) => [c.id, c.etiqueta || `DR ${i + 1}`]),
  );

  const curto = (s: string) => s.replace(/^(Iluminação|Tomadas)\s*\d*\s*—\s*/, (_, t) => `${t === "Iluminação" ? "Ilum." : "TUG"} `).slice(0, 22);

  // Faixa por fileira: peças em ordem, buracos viram "RESERVA".
  const linhasQ = linhasDoModelo(dados.modelo);
  const fileiras = Array.from({ length: linhasQ.length }, (_, f) => {
    const pecas = dados.componentes
      .filter((c) => c.fileira === f)
      .map((c) => ({ c, p: peca(c.pecaId) }))
      .filter((x) => x.p)
      .sort((a, b) => a.c.posicao - b.c.posicao);
    const celulas: Celula[] = [];
    let pos = 0;
    const reserva = (n: number) => n > 0 && celulas.push({ largura: n, texto: ["RESERVA"], tipo: "reserva" });
    for (const { c, p } of pecas) {
      reserva(c.posicao - pos);
      const w = modulosOcupados(p!);
      let texto: string[];
      if (c.geral) texto = ["GERAL", p!.rotulo];
      else if (p!.tipo === "dr") texto = [drEtiqueta.get(c.id) ?? "DR", `${p!.correnteNominal}A`, `${p!.sensibilidadeMa}mA`];
      else if (p!.tipo === "dps") texto = ["DPS", c.fases.join("") || "N"];
      else if (c.circuitoId) {
        const circ = dados.circuitos.find((x) => x.id === c.circuitoId);
        texto = [String(num.get(c.circuitoId) ?? "?"), curto(circ?.nome ?? ""), p!.rotulo];
      } else texto = [p!.rotulo];
      celulas.push({ largura: w, texto, tipo: p!.tipo });
      pos = c.posicao + w;
    }
    reserva(linhasQ[f].modulos - pos);
    return emTiras(celulas);
  });

  return (
    <div className="space-y-4">
      <div className="no-print card flex flex-wrap items-center gap-3 p-3 text-sm">
        {(
          [
            ["faixa", "Faixa do trilho"],
            ["legenda", "Legenda da porta"],
            ["bornes", "Etiquetas de condutores"],
            ["aviso", "Aviso de segurança"],
          ] as const
        ).map(([k, r]) => (
          <label key={k} className="flex items-center gap-1.5">
            <input type="checkbox" checked={blocos[k]} onChange={(e) => setBlocos((b) => ({ ...b, [k]: e.target.checked }))} /> {r}
          </label>
        ))}
        <span className="ml-auto flex items-center gap-1">
          Fonte:
          {(Object.keys(FONTES) as (keyof typeof FONTES)[]).map((f) => (
            <button key={f} onClick={() => setFonte(f)} className={`rounded-md px-2 py-1 ${fonte === f ? "bg-accent text-accent-fg" : "bg-surface-2"}`}>
              {f}
            </button>
          ))}
        </span>
        <p className="w-full text-xs text-muted">
          Imprima em 100% (sem “ajustar à página”) para a faixa casar com o trilho: cada módulo tem 18 mm.
        </p>
      </div>

      <div className="space-y-6 bg-white text-black" style={{ fontSize: `${pt}pt` }}>
        {blocos.faixa && (
          <section className="break-inside-avoid">
            <h3 className="mb-1 font-bold" style={{ fontSize: `${pt + 2}pt` }}>
              Faixa de identificação — {nome} (recorte e cole acima de cada fileira)
            </h3>
            <div className="space-y-3">
              {fileiras.flatMap((tiras, f) =>
                tiras.map((cel, t) => (
                <div key={`${f}-${t}`} className="break-inside-avoid overflow-x-auto">
                  <p className="mb-0.5" style={{ fontSize: `${pt - 1}pt` }}>
                    Fileira {f + 1}
                    {tiras.length > 1 ? ` — parte ${t + 1}/${tiras.length} (emende as partes)` : ""}
                  </p>
                  <div className="flex w-max border-2 border-black">
                    {cel.map((c, i) => (
                      <div
                        key={i}
                        className={`flex flex-col items-center justify-center overflow-hidden border-r border-black text-center leading-tight last:border-r-0 ${
                          c.tipo === "reserva" ? "text-[#555]" : ""
                        } ${c.tipo === "dr" || c.tipo === "dps" ? "bg-[#e5e5e5]" : ""}`}
                        style={{ width: `${c.largura * 18}mm`, height: "14mm", padding: "0.5mm" }}
                      >
                        {c.texto.map((t, j) => (
                          <span key={j} className={j === 0 ? "font-bold" : ""} style={{ wordBreak: "break-word" }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                )),
              )}
            </div>
          </section>
        )}

        {blocos.legenda && (
          <section className="break-inside-avoid border-2 border-black p-2">
            <div className="mb-1 flex flex-wrap justify-between gap-2 font-bold" style={{ fontSize: `${pt + 2}pt` }}>
              <span>{nome}</span>
              <span>
                {dados.alimentacao.tipo} {dados.alimentacao.tensaoFN}/{dados.alimentacao.tensaoFF} V · {dados.alimentacao.esquema}
              </span>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="pr-1">Nº</th>
                  <th className="pr-1">Descrição</th>
                  <th className="pr-1">Ambiente</th>
                  <th className="pr-1">Disj.</th>
                  <th className="pr-1">DR</th>
                  <th className="pr-1">Seção</th>
                  <th>Fase</th>
                </tr>
              </thead>
              <tbody>
                {analise.circuitos.map((r, i) => (
                  <tr key={r.circuito.id} className="border-b border-black">
                    <td className="pr-1 font-bold">{i + 1}</td>
                    <td className="pr-1">{partesNome(r.circuito.nome)[0]}</td>
                    <td className="pr-1">{partesNome(r.circuito.nome)[1] ?? LOCAIS[r.circuito.local].nome}</td>
                    <td className="pr-1">{r.pecaDisjuntor ? `${r.pecaDisjuntor.rotulo} ${r.pecaDisjuntor.polos}P` : "—"}</td>
                    <td className="pr-1">{r.circuito.drId ? (drEtiqueta.get(r.circuito.drId) ?? "Sim") : r.temDR ? "Geral" : "—"}</td>
                    <td className="pr-1">{r.dim.secao ? `${r.dim.secao.toLocaleString("pt-BR")} mm²` : "—"}</td>
                    <td>{r.fases.join("+")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1">
              Data: {data} · Instalação/manutenção: {contato || "—"}
            </p>
          </section>
        )}

        {blocos.bornes && (
          <section className="break-inside-avoid">
            <h3 className="mb-1 font-bold" style={{ fontSize: `${pt + 2}pt` }}>
              Etiquetas de condutores e bornes (recortar)
            </h3>
            <div className="flex flex-wrap">
              {analise.circuitos.flatMap((r, i) => {
                const fios = r.circuito.ligacao === "FN" ? ["F", "N", "PE"] : r.circuito.ligacao === "FF" ? ["F1", "F2", "PE"] : ["F1", "F2", "F3", "N", "PE"];
                return fios.map((f) => (
                  <span
                    key={`${r.circuito.id}${f}`}
                    className="inline-flex items-center justify-center border border-dashed border-black font-bold"
                    style={{ width: "20mm", height: "8mm" }}
                  >
                    C{i + 1} · {f}
                  </span>
                ));
              })}
            </div>
          </section>
        )}

        {blocos.aviso && (
          <section className="break-inside-avoid">
            <div className="mx-auto flex max-w-[150mm] flex-col items-center gap-1 border-[3px] border-black p-3 text-center">
              <svg viewBox="0 0 100 88" width="64" height="56" aria-hidden>
                <path d="M50 4 96 84H4Z" fill="none" stroke="black" strokeWidth="7" strokeLinejoin="round" />
                <path d="M54 26 38 56h12l-4 20 16-30H50z" fill="black" />
              </svg>
              <p className="font-black tracking-wide" style={{ fontSize: `${pt + 10}pt` }}>
                PERIGO
              </p>
              <p className="font-bold" style={{ fontSize: `${pt + 5}pt` }}>
                RISCO DE CHOQUE ELÉTRICO
              </p>
              <p style={{ fontSize: `${pt + 1}pt` }}>
                Acesso somente a pessoas autorizadas e capacitadas (NR-10). Desligue o disjuntor geral antes de qualquer intervenção.
                Instalação conforme ABNT NBR 5410.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
