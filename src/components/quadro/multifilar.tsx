import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import { CORES_CABO } from "@/lib/eletrica/ligacoes";
import { gerarMultifilar, type Multifilar, type PecaMF } from "@/lib/eletrica/multifilar";
import type { Fase, QuadroDados } from "@/lib/eletrica/tipos";

/**
 * Diagrama MULTIFILAR (IEC 60617): cada condutor desenhado separado — fases,
 * neutro, neutros após cada DR e PE — com as cores configuradas no quadro,
 * terminais numerados (1-2, 3-4, 5-6, N/N'), DR com botão de teste, DPS entre
 * condutor vivo e PE, entrada/medição e aterramento. Gerado das ligações.
 */

export interface SeloMultifilar {
  eletricista?: string;
  cliente?: string;
  obra: string;
  data: string;
  alimentacao?: string;
  revisao?: string;
}

const XE = 26;
const PASSO_BARRA = 13;
const COLW = 58;
const fmt = (v: number) => v.toLocaleString("pt-BR");

type Traco = { cor: string; branco: boolean; pe: boolean };

function traco(cor: string): Traco {
  return { cor: CORES_CABO[cor]?.hex ?? cor, branco: cor === "branco", pe: cor === "verde-amarelo" };
}

/** Linha com a cor do condutor (branco ganha contorno; verde-amarelo ganha listras). */
function Fio({ d, t, w = 1.4 }: { d: string; t: Traco; w?: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {t.branco && <path d={d} stroke="#64748b" strokeWidth={w + 1.2} />}
      <path d={d} stroke={t.cor} strokeWidth={w} />
      {t.pe && <path d={d} stroke="#facc15" strokeWidth={w * 0.55} strokeDasharray="4 4" />}
    </g>
  );
}

function Ponto({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={2.2} fill="#111" />;
}

/** Contato de disjuntor (IEC 60617 07-13-05) num polo vertical; `cruz=false` = interruptor (DR). */
function Polo({ x, y, cruz = true, t1, t2 }: { x: number; y: number; cruz?: boolean; t1?: string; t2?: string }) {
  return (
    <g stroke="#111" strokeWidth={1.1} fill="none">
      {cruz && (
        <>
          <line x1={x - 3} y1={y - 12} x2={x + 3} y2={y - 6} />
          <line x1={x + 3} y1={y - 12} x2={x - 3} y2={y - 6} />
        </>
      )}
      <line x1={x} y1={y + 9} x2={x - 8} y2={y - 7} />
      <circle cx={x} cy={y - 9} r={1.2} fill="#111" />
      {t1 && (
        <text x={x + 3} y={y - 14} fontSize={6} stroke="none" fill="#334155">
          {t1}
        </text>
      )}
      {t2 && (
        <text x={x + 3} y={y + 17} fontSize={6} stroke="none" fill="#334155">
          {t2}
        </text>
      )}
    </g>
  );
}

export function Multifilar({
  dados,
  analise,
  selo,
  svgId,
}: {
  dados: QuadroDados;
  analise: AnaliseQuadro;
  selo?: SeloMultifilar;
  svgId?: string;
}) {
  const m: Multifilar = gerarMultifilar(dados, analise);
  const cores = m.ligacoes.cores;
  const fases = m.fases;
  const entrada = [...fases, "N"] as const;
  const nCond = entrada.length;

  // Topo: entrada, medição, geral e DR geral; depois os barramentos.
  const Y_MED = 40;
  const Y_GERAL = 92;
  const Y_DRG = 138;
  const YB = m.drGeral ? 196 : 160;
  const busY = (nome: string) => {
    const i = fases.indexOf(nome as Fase);
    if (i >= 0) return YB + i * PASSO_BARRA;
    if (nome === "N") return YB + fases.length * PASSO_BARRA;
    return YB + (fases.length + 1) * PASSO_BARRA; // PE
  };
  const YPE = busY("PE");
  const xEntrada = (i: number) => XE + (nCond - 1 - i) * 12;
  const XB0 = XE + nCond * 12 + 8;

  // DPS logo após o início dos barramentos
  const XD = XB0 + 24;
  const XG0 = XD + m.dps.length * 30 + 24;

  // Grupos (DR + seus circuitos)
  const Y_DR = YPE + 40;
  const Y_SUB = Y_DR + 70;
  const nSubMax = Math.max(1, ...m.grupos.map((g) => (g.dr ? g.dr.linha.length : 0)));
  const Y_DJ = Y_SUB + nSubMax * 10 + 40;
  const Y_CARGA = Y_DJ + 46;
  const ALT_CARGA = 70;

  const grupos = m.grupos.reduce<{ g: (typeof m.grupos)[number]; inicio: number; colX0: number; fim: number }[]>((acc, g) => {
    const inicio = acc.length ? acc[acc.length - 1].fim + 18 : XG0;
    const colX0 = inicio + (g.dr ? 12 + g.dr.linha.length * 11 + 14 : 8);
    const fim = colX0 + Math.max(1, g.colunas.length) * COLW;
    return [...acc, { g, inicio, colX0, fim }];
  }, []);
  const gx = grupos.length ? grupos[grupos.length - 1].fim + 18 : XG0;
  const XMAX = Math.max(gx + 30, selo ? 760 : 480);
  const altura = Y_CARGA + ALT_CARGA + (selo ? 110 : 20);

  const corBarra = (nome: string): Traco =>
    nome === "PE" ? traco(cores.PE) : nome.startsWith("N") ? traco(cores.N) : traco(cores[nome as Fase] ?? "preto");

  const terminal = (p: PecaMF, lado: "linha" | "carga", polo: number) => (lado === "linha" ? p.linha : p.carga)[polo]?.t;

  return (
    <svg
      id={svgId}
      viewBox={`0 0 ${XMAX} ${altura}`}
      width={XMAX}
      height={altura}
      fontFamily="Arial, Helvetica, sans-serif"
      role="img"
      aria-label="Diagrama multifilar do quadro"
    >
      {/* ---------- Entrada da concessionária e medição ---------- */}
      <text x={XE - 6} y={14} fontSize={8} fontWeight={700} fill="#111">
        Concessionária (rede BT)
      </text>
      <rect x={XE - 8} y={Y_MED - 10} width={nCond * 12 + 4} height={22} rx={2} fill="#fff" stroke="#111" strokeWidth={1.2} />
      <text x={XE - 4 + (nCond * 12) / 2} y={Y_MED + 4} fontSize={7} textAnchor="middle" fontWeight={700}>
        kWh
      </text>
      <text x={XE + nCond * 12 + 2} y={Y_MED + 4} fontSize={6.5} fill="#334155">
        Medição
      </text>
      {entrada.map((c, i) => {
        const x = xEntrada(i);
        const t = c === "N" ? traco(cores.N) : traco(cores[c as Fase]);
        const yb = busY(c);
        const segs: string[] = [`M${x} 20 L${x} ${Y_MED - 10}`, `M${x} ${Y_MED + 12} L${x} ${yb} L${XMAX - 34} ${yb}`];
        return (
          <g key={c}>
            {segs.map((d, k) => (
              <Fio key={k} d={d} t={t} w={2.2} />
            ))}
            <text x={x} y={19} fontSize={6.5} textAnchor="middle" fontWeight={700}>
              {c}
            </text>
            <text x={XMAX - 30} y={yb + 2.5} fontSize={7} fontWeight={700}>
              {c}
            </text>
          </g>
        );
      })}

      {/* Disjuntor geral */}
      {m.geral && (
        <g>
          {fases.map((f, i) => (
            <rect key={f} x={xEntrada(i) - 5} y={Y_GERAL - 18} width={10} height={36} fill="#fff" />
          ))}
          {fases.map((f, i) => {
            const polo = m.geral!.linha.findIndex((t) => t.fase === f);
            return (
              <Polo key={f} x={xEntrada(i)} y={Y_GERAL} t1={terminal(m.geral!, "linha", polo)} t2={terminal(m.geral!, "carga", polo)} />
            );
          })}
          <line x1={xEntrada(fases.length - 1) - 12} y1={Y_GERAL - 1} x2={xEntrada(0) + 6} y2={Y_GERAL - 1} stroke="#111" strokeDasharray="2 2" />
          <text x={xEntrada(0) + 12} y={Y_GERAL + 3} fontSize={7} fontWeight={700}>
            {m.geral.nome} {m.geral.polos}P {m.geral.rotulo}
          </text>
        </g>
      )}

      {/* DR geral */}
      {m.drGeral && (
        <g>
          {entrada.map((c, i) => (
            <rect key={c} x={xEntrada(i) - 5} y={Y_DRG - 18} width={10} height={36} fill="#fff" />
          ))}
          {entrada.map((c, i) => {
            const polo = c === "N" ? m.drGeral!.linha.length - 1 : m.drGeral!.linha.findIndex((t) => t.fase === c);
            return <Polo key={c} x={xEntrada(i)} y={Y_DRG} cruz={false} t1={terminal(m.drGeral!, "linha", polo)} t2={terminal(m.drGeral!, "carga", polo)} />;
          })}
          <rect x={xEntrada(nCond - 1) - 12} y={Y_DRG - 4} width={nCond * 12 + 8} height={14} fill="none" stroke="#111" strokeDasharray="3 2" />
          <text x={xEntrada(0) + 12} y={Y_DRG + 5} fontSize={7} fontWeight={700}>
            {m.drGeral.nome} IΔn 30 mA
          </text>
        </g>
      )}

      {/* PE: haste → barramento PE */}
      <Fio d={`M${XE - 14} ${YPE + 44} L${XE - 14} ${YPE} L${XMAX - 34} ${YPE}`} t={traco(cores.PE)} w={2.2} />
      <g stroke="#111" strokeWidth={1.2}>
        <line x1={XE - 22} y1={YPE + 44} x2={XE - 6} y2={YPE + 44} />
        <line x1={XE - 19} y1={YPE + 48} x2={XE - 9} y2={YPE + 48} />
        <line x1={XE - 16} y1={YPE + 52} x2={XE - 12} y2={YPE + 52} />
      </g>
      <text x={XE - 26} y={YPE + 62} fontSize={6.5}>
        Haste / aterramento
      </text>
      <text x={XMAX - 30} y={YPE + 2.5} fontSize={7} fontWeight={700}>
        PE
      </text>
      {dados.modelo.material === "metalico" && (
        <text x={XB0} y={YPE + 12} fontSize={6} fill="#334155">
          Equipotencialização: carcaça e porta ligadas ao PE
        </text>
      )}

      {/* DPS */}
      {m.dps.map((d, i) => {
        const x = XD + i * 30;
        const yOrig = busY(d.fase ?? "N");
        const t = d.fase ? traco(cores[d.fase]) : traco(cores.N);
        return (
          <g key={d.compId}>
            <Fio d={`M${x} ${yOrig} L${x} ${YPE + 14}`} t={t} />
            <Ponto x={x} y={yOrig} />
            <rect x={x - 5} y={YPE + 14} width={10} height={16} fill="#fff" stroke="#111" strokeWidth={1.1} />
            <path d={`M${x - 3} ${YPE + 27} L${x + 3} ${YPE + 17} M${x + 3} ${YPE + 17} l-2.5 0.6 M${x + 3} ${YPE + 17} l-0.2 2.5`} stroke="#111" fill="none" />
            <Fio d={`M${x} ${YPE + 30} L${x} ${YPE + 36} L${x + 9} ${YPE + 36} L${x + 9} ${YPE}`} t={traco(cores.PE)} />
            <Ponto x={x + 9} y={YPE} />
            <text x={x + 7} y={YPE + 24} fontSize={6} fontWeight={700}>
              DPS
            </text>
            <text x={x - 5} y={YPE + 44} fontSize={5.5} fill="#334155">
              L→PE
            </text>
          </g>
        );
      })}

      {/* Grupos: DR + circuitos */}
      {grupos.map(({ g, inicio, colX0, fim }, gi) => {
        const subY = (nome: string) => {
          if (!g.dr) return busY(nome);
          const lista = [...g.fases, ...(g.dr.linha.some((t) => t.funcao === "N") ? [g.neutro] : [])];
          const i = lista.indexOf(nome as never);
          return Y_SUB + Math.max(0, i) * 10;
        };
        return (
          <g key={gi}>
            {g.dr && (
              <g>
                {g.dr.linha.map((t, p) => {
                  const x = inicio + 12 + p * 11;
                  const nomeEnt = t.funcao === "N" ? "N" : (t.fase ?? "R");
                  const nomeSai = t.funcao === "N" ? g.neutro : (t.fase ?? "R");
                  const tr = corBarra(nomeEnt);
                  return (
                    <g key={p}>
                      <Fio d={`M${x} ${busY(nomeEnt)} L${x} ${Y_DR}`} t={tr} />
                      <Ponto x={x} y={busY(nomeEnt)} />
                      <rect x={x - 5} y={Y_DR} width={10} height={34} fill="#fff" />
                      <Polo x={x} y={Y_DR + 17} cruz={false} t1={t.t} t2={g.dr!.carga[p]?.t} />
                      <Fio d={`M${x} ${Y_DR + 34} L${x} ${subY(nomeSai)} L${fim} ${subY(nomeSai)}`} t={corBarra(nomeSai)} />
                      <Ponto x={x} y={subY(nomeSai)} />
                    </g>
                  );
                })}
                {/* toroide + botão de teste */}
                <ellipse cx={inicio + 12 + ((g.dr.linha.length - 1) * 11) / 2} cy={Y_DR + 40} rx={(g.dr.linha.length - 1) * 5.5 + 8} ry={4} fill="none" stroke="#111" />
                <rect x={inicio + 4} y={Y_DR - 2} width={g.dr.linha.length * 11 + 6} height={38} fill="none" stroke="#111" strokeDasharray="3 2" />
                <circle cx={inicio + g.dr.linha.length * 11 + 14} cy={Y_DR + 6} r={4} fill="#fde047" stroke="#111" />
                <text x={inicio + g.dr.linha.length * 11 + 14} y={Y_DR + 8} fontSize={5.5} textAnchor="middle" fontWeight={700}>
                  T
                </text>
                <text x={inicio + 4} y={Y_DR - 6} fontSize={7} fontWeight={700}>
                  {g.dr.nome} — {g.dr.polos}P {g.dr.rotulo} IΔn 30 mA
                </text>
                {[...g.fases, ...(g.dr.linha.some((t) => t.funcao === "N") ? [g.neutro] : [])].map((nome) => (
                  <text key={nome} x={fim + 3} y={subY(nome) + 2.5} fontSize={6.5} fontWeight={700}>
                    {nome}
                  </text>
                ))}
              </g>
            )}

            {g.colunas.map((col, ci) => {
              const cx = colX0 + ci * COLW + 6;
              const fasesCol = col.condutores.filter((c) => c.funcao === "F");
              const neutro = col.condutores.find((c) => c.funcao === "N");
              const pe = col.condutores.find((c) => c.funcao === "PE");
              return (
                <g key={col.circuitoId}>
                  {fasesCol.map((c, j) => {
                    const x = cx + j * 8;
                    const y0 = subY(c.fase ?? "R");
                    const polo = col.disjuntor?.carga.findIndex((t) => t.fase === c.fase) ?? -1;
                    return (
                      <g key={c.ligacaoId}>
                        <Fio d={`M${x} ${y0} L${x} ${Y_DJ - 16}`} t={traco(c.cor)} />
                        <Ponto x={x} y={y0} />
                        {col.disjuntor && (
                          <Polo x={x} y={Y_DJ} t1={polo >= 0 ? col.disjuntor.linha[polo]?.t : undefined} t2={polo >= 0 ? col.disjuntor.carga[polo]?.t : undefined} />
                        )}
                        <Fio d={`M${x} ${Y_DJ + 16} L${x} ${Y_CARGA}`} t={traco(c.cor)} />
                      </g>
                    );
                  })}
                  {fasesCol.length > 1 && (
                    <line x1={cx - 6} y1={Y_DJ - 1} x2={cx + (fasesCol.length - 1) * 8} y2={Y_DJ - 1} stroke="#111" strokeDasharray="2 2" />
                  )}
                  {neutro && (
                    <g>
                      <Fio d={`M${cx + 26} ${subY(neutro.barra)} L${cx + 26} ${Y_CARGA}`} t={traco(neutro.cor)} />
                      <Ponto x={cx + 26} y={subY(neutro.barra)} />
                    </g>
                  )}
                  {pe && (
                    <g>
                      <Fio d={`M${cx + 34} ${YPE} L${cx + 34} ${Y_CARGA}`} t={traco(pe.cor)} />
                      <Ponto x={cx + 34} y={YPE} />
                    </g>
                  )}
                  {/* Carga */}
                  <rect x={cx - 6} y={Y_CARGA} width={COLW - 6} height={ALT_CARGA} rx={2} fill="#fff" stroke="#111" strokeWidth={1} />
                  <text x={cx - 3} y={Y_CARGA + 9} fontSize={7.5} fontWeight={800}>
                    C{col.numero}
                  </text>
                  <text x={cx - 3} y={Y_CARGA + 18} fontSize={5.6}>
                    {col.nome.slice(0, 16)}
                  </text>
                  <text x={cx - 3} y={Y_CARGA + 25} fontSize={5.6}>
                    {col.nome.slice(16, 32)}
                  </text>
                  <text x={cx - 3} y={Y_CARGA + 34} fontSize={5.8} fontWeight={700}>
                    {fmt(col.potenciaW)} W
                  </text>
                  <text x={cx - 3} y={Y_CARGA + 43} fontSize={5.4}>
                    {col.disjuntor ? `${col.disjuntor.polos}P ${col.disjuntor.rotulo}` : "sem disjuntor"}
                  </text>
                  {[
                    fasesCol[0] && `F ${fmt(fasesCol[0].secao)}`,
                    neutro && `N ${fmt(neutro.secao)}`,
                    pe && `PE ${fmt(pe.secao)}`,
                  ]
                    .filter(Boolean)
                    .map((txt, k) => (
                      <text key={k} x={cx - 3} y={Y_CARGA + 52 + k * 6.5} fontSize={5.4}>
                        {txt} mm²
                      </text>
                    ))}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* ---------- Selo ---------- */}
      {selo && (
        <g fontSize={7.5}>
          <rect x={XMAX - 330} y={altura - 100} width={320} height={90} fill="#fff" stroke="#111" strokeWidth={1.2} />
          <line x1={XMAX - 330} y1={altura - 82} x2={XMAX - 10} y2={altura - 82} stroke="#111" />
          <text x={XMAX - 322} y={altura - 88} fontWeight={800} fontSize={9}>
            Diagrama multifilar — {selo.obra.slice(0, 36)}
          </text>
          <text x={XMAX - 322} y={altura - 70}>Cliente: {selo.cliente || "—"}</text>
          <text x={XMAX - 322} y={altura - 58}>Responsável: {selo.eletricista || "—"}</text>
          <text x={XMAX - 322} y={altura - 46}>Alimentação: {selo.alimentacao || "—"}</text>
          <text x={XMAX - 322} y={altura - 34}>Data: {selo.data}</text>
          <text x={XMAX - 160} y={altura - 34}>Revisão: {selo.revisao || "R0"}</text>
          <text x={XMAX - 322} y={altura - 20} fontSize={6} fill="#334155">
            Simbologia IEC 60617 · cores NBR 5410 6.1.5.3 · conferir no local antes de energizar
          </text>
        </g>
      )}
      <g fontSize={6.5} fill="#334155">
        <text x={10} y={altura - (selo ? 96 : 8)}>
          Legenda: {fases.map((f) => `${f} ${cores[f]}`).join(" · ")} · N azul-claro{m.neutros.length > 1 ? ` (N1, N2… = neutro após cada DR)` : ""} · PE verde-amarelo
        </text>
      </g>
    </svg>
  );
}
