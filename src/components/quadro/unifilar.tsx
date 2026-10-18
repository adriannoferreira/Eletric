import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import { concessionaria } from "@/lib/eletrica/concessionarias";
import { peca } from "@/lib/eletrica/pecas";
import type { QuadroDados } from "@/lib/eletrica/tipos";
import { demandaDoQuadro } from "./projeto-blocos";

/**
 * Diagrama unifilar com simbologia IEC 60617 (a usual no Brasil), gerado do
 * QuadroDados atual: entrada da concessionária e medição, disjuntor geral,
 * barramentos de fase/N/PE, aterramento, DPS, DRs e circuitos terminais.
 */

const COR_FASE: Record<string, string> = { R: "#dc2626", S: "#2563eb", T: "#6b7280" };
const X0 = 70;
const COL = 56;
const Y_GERAL = 206;
const Y_BARRA = 240;
const Y_DR = 282;
const Y_SUB = 326;
const Y_DJ = 366;
const Y_FIOS = 398;
const Y_TEXTO = 414;
const ALTURA_TEXTO = 190;

export interface SeloUnifilar {
  eletricista?: string;
  cliente?: string;
  obra: string;
  data: string;
}

const n = (v: number, d = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });

/** Disjuntor (IEC 60617 07-13-05): contato com "×" no fixo. `cruz=false` = seccionadora. */
function Disjuntor({ x, y, cruz = true }: { x: number; y: number; cruz?: boolean }) {
  return (
    <g>
      <line x1={x} y1={y - 16} x2={x} y2={y - 9} />
      {cruz && (
        <>
          <line x1={x - 3.5} y1={y - 12.5} x2={x + 3.5} y2={y - 5.5} />
          <line x1={x + 3.5} y1={y - 12.5} x2={x - 3.5} y2={y - 5.5} />
        </>
      )}
      <line x1={x} y1={y + 9} x2={x - 9} y2={y - 8} />
      <line x1={x} y1={y + 9} x2={x} y2={y + 16} />
    </g>
  );
}

/** DR: dispositivo de manobra com toroide (elipse) de detecção de corrente residual. */
function DR({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <Disjuntor x={x} y={y} cruz={false} />
      <ellipse cx={x} cy={y + 20} rx={8} ry={3.5} />
      <line x1={x} y1={y + 16} x2={x} y2={y + 26} />
      <line x1={x + 8} y1={y + 20} x2={x + 14} y2={y + 20} />
      <line x1={x + 14} y1={y + 20} x2={x + 14} y2={y - 2} strokeDasharray="2 2" />
      <line x1={x + 14} y1={y - 2} x2={x - 3} y2={y - 2} strokeDasharray="2 2" />
    </g>
  );
}

function Terra({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x - 10} y1={y} x2={x + 10} y2={y} />
      <line x1={x - 6.5} y1={y + 4} x2={x + 6.5} y2={y + 4} />
      <line x1={x - 3} y1={y + 8} x2={x + 3} y2={y + 8} />
    </g>
  );
}

/** Traços oblíquos indicando o nº de condutores (IEC 60617 03-01-03). */
function Condutores({ x, y, qtd }: { x: number; y: number; qtd: number }) {
  return (
    <g>
      {Array.from({ length: qtd }, (_, i) => {
        const yy = y - ((qtd - 1) * 4) / 2 + i * 4;
        return <line key={i} x1={x - 5} y1={yy + 3} x2={x + 5} y2={yy - 3} />;
      })}
    </g>
  );
}

function T({ x, y, children, size = 9, bold, anchor, opacity }: { x: number; y: number; children: React.ReactNode; size?: number; bold?: boolean; anchor?: "start" | "middle" | "end"; opacity?: number }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={bold ? 700 : 400} textAnchor={anchor} fill="currentColor" fillOpacity={opacity} stroke="none">
      {children}
    </text>
  );
}

export function Unifilar({
  dados,
  analise,
  selo,
  svgId,
}: {
  dados: QuadroDados;
  analise: AnaliseQuadro;
  selo?: SeloUnifilar;
  svgId?: string;
}) {
  const a = dados.alimentacao;
  const conc = dados.projeto ? concessionaria(dados.projeto.obra.concessionaria) : null;
  const demanda = demandaDoQuadro(dados);
  const comps = dados.componentes.map((c) => ({ c, p: peca(c.pecaId) }));
  const geral = comps.find((x) => x.c.geral && (x.p?.tipo === "disjuntor" || x.p?.tipo === "seccionadora"));
  const dps = comps.filter((x) => x.p?.tipo === "dps");
  const drs = comps.filter((x) => x.p?.tipo === "dr");
  const resultados = analise.circuitos;
  const numero = new Map(resultados.map((r, i) => [r.circuito.id, i + 1]));
  const fasesTxt = a.tipo === "monofasico" ? "F+N" : a.tipo === "bifasico" ? "2F+N" : "3F+N";

  // Grupos: DR geral (todos), DRs com seus circuitos, circuitos sem DR.
  const drGeral = drs.find((d) => d.c.geral);
  const grupos: { dr?: (typeof drs)[number]; itens: typeof resultados }[] = drs
    .filter((d) => d !== drGeral)
    .map((d) => ({ dr: d, itens: resultados.filter((r) => r.circuito.drId === d.c.id) }));
  const semDR = resultados.filter((r) => !grupos.some((g) => g.itens.includes(r)));
  if (semDR.length || drGeral) grupos.push({ dr: drGeral, itens: semDR });

  const gruposVisiveis = grupos.filter((g) => g.itens.length || g.dr);
  const larguras = gruposVisiveis.map((g) => Math.max(1, g.itens.length) * COL);
  const inicios = larguras.map((_, i) => X0 + 120 + larguras.slice(0, i).reduce((s, l) => s + l + 18, 0));
  const colunas = gruposVisiveis.map((g, i) => ({ ...g, ini: inicios[i], largura: larguras[i] }));
  const x = X0 + 120 + larguras.reduce((s, l) => s + l + 18, 0);
  const largura = Math.max(x + 30, selo ? 680 : 420);
  const alturaDiagrama = Y_TEXTO + ALTURA_TEXTO;
  const altura = alturaDiagrama + (selo ? 96 : 10);
  const xFimBarra = Math.max(x - 10, X0 + 140);

  const yN = Y_SUB + 20;
  const yPE = Y_SUB + 56;

  return (
    <svg
      id={svgId}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${largura} ${altura}`}
      width={largura}
      height={altura}
      className="max-w-none text-fg"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      fontFamily="Arial, Helvetica, sans-serif"
      role="img"
      aria-label="Diagrama unifilar do quadro"
    >
      {/* ---------- Entrada da concessionária e medição ---------- */}
      <T x={X0 - 56} y={16} bold size={10}>
        Rede {conc?.nome ?? "da concessionária"}
      </T>
      <T x={X0 - 56} y={28} opacity={0.75}>
        {a.tensaoFN}/{a.tensaoFF === a.tensaoFN ? Math.round(a.tensaoFN * Math.sqrt(3)) : a.tensaoFF} V · {fasesTxt} · 60 Hz
      </T>
      <line x1={X0} y1={34} x2={X0} y2={46} />
      <Condutores x={X0} y={40} qtd={a.tipo === "monofasico" ? 2 : a.tipo === "bifasico" ? 3 : 4} />
      <rect x={X0 - 15} y={46} width={30} height={20} />
      <T x={X0} y={60} anchor="middle" bold size={8}>
        kWh
      </T>
      <T x={X0 + 20} y={60} opacity={0.75} size={8}>
        Medição
      </T>
      <line x1={X0} y1={66} x2={X0} y2={78} />
      <Disjuntor x={X0} y={94} />
      <T x={X0 + 14} y={92} size={8}>
        Disjuntor do padrão
      </T>
      <T x={X0 + 14} y={102} size={8} opacity={0.7}>
        {demanda.disjuntorGeralA ? `ref. ${demanda.disjuntorGeralA} A — ` : ""}conforme concessionária
      </T>
      {/* Aterramento do padrão (PEN aterrado em TN-C-S) */}
      <line x1={X0} y1={124} x2={X0 - 34} y2={124} />
      <line x1={X0 - 34} y1={124} x2={X0 - 34} y2={136} />
      <Terra x={X0 - 34} y={136} />
      <T x={X0 - 62} y={160} size={8}>
        Haste(s)
      </T>
      <T x={X0 - 62} y={169} size={8} opacity={0.75}>
        {a.esquema === "TN-C-S" ? "PEN aterrado" : a.esquema === "TT" ? "da entrada" : "PE na origem"}
      </T>
      <line x1={X0} y1={110} x2={X0} y2={190} />
      <T x={X0 + 6} y={150} size={8}>
        Alimentador do QDC
      </T>
      <T x={X0 + 6} y={160} size={8} opacity={0.75}>
        {demanda.secaoEntradaMm2 ? `mín. #${n(demanda.secaoEntradaMm2)} mm² (B1)` : ""}
      </T>

      {/* ---------- QDC ---------- */}
      <rect x={X0 - 52} y={172} width={largura - X0 + 40} height={alturaDiagrama - 168} rx={8} strokeDasharray="6 4" strokeOpacity={0.55} />
      <T x={X0 - 44} y={186} bold size={10}>
        QDC — {a.esquema}
      </T>
      <Disjuntor x={X0} y={Y_GERAL} />
      <T x={X0 + 12} y={Y_GERAL + 2} bold size={9}>
        {geral?.p ? `${geral.p.rotulo} ${geral.p.polos}P` : "Sem geral"}
      </T>
      <T x={X0 + 12} y={Y_GERAL + 12} size={8} opacity={0.7}>
        geral
      </T>
      <line x1={X0} y1={Y_GERAL + 16} x2={X0} y2={Y_BARRA} />
      <line x1={X0} y1={Y_BARRA} x2={xFimBarra} y2={Y_BARRA} strokeWidth={3.2} />
      <T x={xFimBarra + 4} y={Y_BARRA + 3} size={8} bold>
        {a.tipo === "monofasico" ? "F" : a.tipo === "bifasico" ? "R S" : "R S T"}
      </T>

      {/* Barramentos de neutro e PE */}
      <line x1={X0 - 40} y1={yN} x2={X0 + 20} y2={yN} strokeWidth={3} stroke="#2563eb" />
      <T x={X0 - 46} y={yN + 3} anchor="end" bold size={9}>
        N
      </T>
      <line x1={X0 - 40} y1={yPE} x2={X0 + 70} y2={yPE} strokeWidth={3} stroke="#16a34a" />
      <T x={X0 - 46} y={yPE + 3} anchor="end" bold size={9}>
        PE
      </T>
      <line x1={X0 - 30} y1={yPE} x2={X0 - 30} y2={yPE + 18} />
      <Terra x={X0 - 30} y={yPE + 18} />
      <T x={X0 - 46} y={yPE + 42} size={8} opacity={0.75}>
        {a.esquema === "TN-C-S" ? "PE ligado ao PEN da entrada / BEP" : "PE ao eletrodo / BEP"}
      </T>

      {/* DPS entre fases e PE */}
      {dps.length > 0 && (
        <g>
          <line x1={X0 + 60} y1={Y_BARRA} x2={X0 + 60} y2={Y_DR - 14} />
          <rect x={X0 + 53} y={Y_DR - 14} width={14} height={28} />
          <path d={`M${X0 + 60} ${Y_DR - 10} v14 m-4 -5 l4 5 l4 -5`} />
          <line x1={X0 + 60} y1={Y_DR + 14} x2={X0 + 60} y2={yPE} />
          <T x={X0 + 70} y={Y_DR - 2} bold size={8}>
            DPS ×{dps.length}
          </T>
          <T x={X0 + 70} y={Y_DR + 8} size={8} opacity={0.75}>
            cl. II {dps[0].p?.ucV} V
          </T>
          <T x={X0 + 70} y={Y_DR + 18} size={8} opacity={0.75}>
            {dps[0].p?.imaxKa} kA
          </T>
        </g>
      )}

      {/* ---------- Circuitos ---------- */}
      {colunas.map((g, gi) => {
        const centro = g.ini + g.largura / 2;
        const yRamo = g.dr ? Y_SUB : Y_BARRA;
        return (
          <g key={gi}>
            {g.dr && (
              <>
                <line x1={centro} y1={Y_BARRA} x2={centro} y2={Y_DR - 16} />
                <DR x={centro} y={Y_DR} />
                <T x={centro + 18} y={Y_DR - 6} bold size={8.5}>
                  DR {g.dr.p?.correnteNominal}A {g.dr.p?.polos}P
                </T>
                <T x={centro + 18} y={Y_DR + 4} size={8} opacity={0.75}>
                  IΔn {g.dr.p?.sensibilidadeMa} mA{g.dr.c.geral ? " · geral" : ""}
                </T>
                <line x1={centro} y1={Y_DR + 26} x2={centro} y2={Y_SUB} />
                {g.itens.length > 1 && (
                  <line x1={g.ini + COL / 2} y1={Y_SUB} x2={g.ini + g.largura - COL / 2} y2={Y_SUB} strokeWidth={2.2} />
                )}
              </>
            )}
            {g.itens.map((r, i) => {
              const cx = g.ini + i * COL + COL / 2;
              const s = r.dim.secao;
              const lig = r.circuito.ligacao;
              const cond = lig === "FN" ? "F+N+PE" : lig === "FF" ? "2F+PE" : "3F+N+PE";
              const qtd = lig === "FN" ? 3 : lig === "FF" ? 3 : 5;
              const dj = r.pecaDisjuntor;
              return (
                <g key={r.circuito.id}>
                  <line x1={cx} y1={yRamo} x2={cx} y2={Y_DJ - 16} />
                  <Disjuntor x={cx} y={Y_DJ} />
                  <T x={cx + 3} y={Y_DJ - 20} anchor="middle" bold size={8.5}>
                    {dj ? `${dj.rotulo}` : "?"}
                  </T>
                  <line x1={cx} y1={Y_DJ + 16} x2={cx} y2={Y_TEXTO - 2} />
                  <Condutores x={cx} y={Y_FIOS} qtd={qtd} />
                  {r.fases.map((f, k) => (
                    <circle key={f} cx={cx - 12} cy={Y_DJ + 6 + k * 7} r={2.6} fill={COR_FASE[f]} stroke="none" />
                  ))}
                  <g transform={`translate(${cx - 13} ${Y_TEXTO}) rotate(90)`}>
                    <text fontSize={8.5} fill="currentColor" stroke="none">
                      <tspan fontWeight={700}>{numero.get(r.circuito.id)}.</tspan> {r.circuito.nome.slice(0, 34)}
                    </text>
                    <text y={-10} fontSize={8} fill="currentColor" stroke="none">
                      {dj ? `${dj.polos}P C.${dj.curva} ${dj.correnteNominal} A` : "sem disjuntor"} · {cond} {s ? `#${n(s)} mm²` : "?"}
                    </text>
                    <text y={-20} fontSize={8} fill="currentColor" fillOpacity={0.75} stroke="none">
                      {r.fases.join("+") || "?"} · {n(r.circuito.potenciaW, 0)} W · ΔV {n(r.dim.quedaPct, 2)}%
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* ---------- Selo / legenda ---------- */}
      {selo && (
        <g>
          <rect x={largura - 330} y={alturaDiagrama + 8} width={320} height={80} />
          <line x1={largura - 330} y1={alturaDiagrama + 30} x2={largura - 10} y2={alturaDiagrama + 30} />
          <T x={largura - 322} y={alturaDiagrama + 23} bold size={11}>
            Diagrama unifilar — {selo.obra.slice(0, 38)}
          </T>
          <T x={largura - 322} y={alturaDiagrama + 44} size={8.5}>
            Cliente: {selo.cliente || "—"}
          </T>
          <T x={largura - 322} y={alturaDiagrama + 56} size={8.5}>
            Responsável: {selo.eletricista || "—"}
          </T>
          <T x={largura - 322} y={alturaDiagrama + 68} size={8.5}>
            Alimentação: {a.tipo} {a.tensaoFN}/{a.tensaoFF} V · {a.esquema}
            {conc ? ` · ${conc.nome}` : ""}
          </T>
          <T x={largura - 322} y={alturaDiagrama + 80} size={8.5}>
            Data: {selo.data} · Simbologia IEC 60617 · NBR 5410
          </T>
          <T x={10} y={alturaDiagrama + 24} size={8} opacity={0.8}>
            Legenda: × = disjuntor termomagnético · elipse = DR (IΔn) · retângulo com seta = DPS
          </T>
          <T x={10} y={alturaDiagrama + 36} size={8} opacity={0.8}>
            Traços no condutor = nº de condutores · #S = seção em mm² · bolinhas = fases (R vermelho, S azul, T cinza)
          </T>
        </g>
      )}
    </svg>
  );
}
