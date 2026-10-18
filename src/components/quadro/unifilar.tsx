import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import { concessionaria } from "@/lib/eletrica/concessionarias";
import { peca } from "@/lib/eletrica/pecas";
import type { QuadroDados } from "@/lib/eletrica/tipos";

const COR_FASE: Record<string, string> = { R: "#dc2626", S: "#2563eb", T: "#6b7280" };
const COL = 46;
const Y_BARRA = 250;
const Y_DR = 290;
const Y_SUBBARRA = 340;
const Y_DJ = 380;
const Y_TEXTO = 420;

/** Símbolo de disjuntor (contato com "x") centrado em (x, y). */
function Disjuntor({ x, y, rotulo }: { x: number; y: number; rotulo?: string }) {
  return (
    <g>
      <line x1={x} y1={y - 14} x2={x} y2={y - 6} />
      <line x1={x} y1={y + 6} x2={x} y2={y + 14} />
      <line x1={x - 5} y1={y - 6} x2={x + 5} y2={y + 6} />
      <line x1={x - 4} y1={y - 10} x2={x + 4} y2={y - 2} />
      <line x1={x + 4} y1={y - 10} x2={x - 4} y2={y - 2} />
      {rotulo && (
        <text x={x + 8} y={y + 4} fontSize={9} fontWeight={700} stroke="none">
          {rotulo}
        </text>
      )}
    </g>
  );
}

function Terra({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x - 9} y1={y} x2={x + 9} y2={y} />
      <line x1={x - 6} y1={y + 4} x2={x + 6} y2={y + 4} />
      <line x1={x - 3} y1={y + 8} x2={x + 3} y2={y + 8} />
    </g>
  );
}

/**
 * Diagrama unifilar gerado do QuadroDados: entrada (rede → medidor → padrão),
 * QDC com disjuntor geral, barramento, DPS, DRs e circuitos terminais.
 */
export function Unifilar({ dados, analise }: { dados: QuadroDados; analise: AnaliseQuadro }) {
  const a = dados.alimentacao;
  const conc = dados.projeto ? concessionaria(dados.projeto.obra.concessionaria) : null;
  const comps = dados.componentes.map((c) => ({ c, p: peca(c.pecaId) }));
  const geral = comps.find((x) => x.c.geral && x.p?.tipo === "disjuntor");
  const dps = comps.filter((x) => x.p?.tipo === "dps");
  const drs = comps.filter((x) => x.p?.tipo === "dr");
  const resultados = analise.circuitos;
  const numero = new Map(resultados.map((r, i) => [r.circuito.id, i + 1]));

  // Grupos: cada DR com seus circuitos; depois circuitos sem DR.
  const grupos: { dr?: (typeof drs)[number]; itens: typeof resultados }[] = drs.map((d) => ({
    dr: d,
    itens: resultados.filter((r) => r.circuito.drId === d.c.id),
  }));
  const drGeral = drs.find((d) => d.c.geral);
  const semDR = resultados.filter((r) => !r.circuito.drId || !drs.some((d) => d.c.id === r.circuito.drId));
  if (drGeral) {
    const g = grupos.find((x) => x.dr === drGeral);
    if (g) g.itens = [...g.itens, ...semDR];
  } else if (semDR.length) grupos.push({ itens: semDR });

  const xInicio = 70;
  let x = xInicio + (dps.length ? 60 : 20);
  const colunas = grupos.map((g) => {
    const largura = Math.max(1, g.itens.length) * COL;
    const ini = x;
    x += largura + 16;
    return { ...g, ini, largura };
  });
  const largura = Math.max(x + 20, 360);
  const altura = Y_TEXTO + 190;
  const fases = a.tipo === "monofasico" ? "F+N" : a.tipo === "bifasico" ? "2F+N" : "3F+N";

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      width={largura}
      height={altura}
      className="max-w-none text-fg"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      fontFamily="ui-sans-serif, system-ui, sans-serif"
      role="img"
      aria-label="Diagrama unifilar do quadro"
    >
      <g fill="currentColor">
        {/* Entrada */}
        <text x={xInicio - 50} y={18} fontSize={10} fontWeight={700} stroke="none">
          Rede {conc?.nome ?? "concessionária"}
        </text>
        <text x={xInicio - 50} y={30} fontSize={9} stroke="none" fillOpacity={0.7}>
          {a.tensaoFN}/{a.tensaoFF} V · {fases} · {a.esquema}
        </text>
      </g>
      <line x1={xInicio} y1={36} x2={xInicio} y2={60} />
      <circle cx={xInicio} cy={74} r={14} />
      <text x={xInicio} y={78} fontSize={8} textAnchor="middle" fill="currentColor" stroke="none">
        kWh
      </text>
      <line x1={xInicio} y1={88} x2={xInicio} y2={106} />
      <Disjuntor x={xInicio} y={120} rotulo="Padrão" />
      {/* Aterramento no padrão */}
      <line x1={xInicio} y1={140} x2={xInicio - 30} y2={140} />
      <line x1={xInicio - 30} y1={140} x2={xInicio - 30} y2={150} />
      <Terra x={xInicio - 30} y={150} />
      <text x={xInicio - 52} y={176} fontSize={8} fill="currentColor" stroke="none">
        {a.esquema === "TT" ? "Eletrodo" : "PEN aterrado"}
      </text>
      <line x1={xInicio} y1={134} x2={xInicio} y2={196} />

      {/* QDC */}
      <rect x={xInicio - 20} y={190} width={largura - xInicio} height={altura - 200} strokeDasharray="5 4" strokeOpacity={0.5} rx={8} />
      <text x={xInicio - 12} y={204} fontSize={9} fontWeight={700} fill="currentColor" stroke="none">
        QDC
      </text>
      <Disjuntor x={xInicio} y={222} rotulo={geral?.p ? `${geral.p.rotulo} ${geral.p.polos}P geral` : "Geral ?"} />
      <line x1={xInicio} y1={236} x2={xInicio} y2={Y_BARRA} />
      <line x1={xInicio} y1={Y_BARRA} x2={largura - 30} y2={Y_BARRA} strokeWidth={3} />

      {/* DPS */}
      {dps.length > 0 && (
        <g>
          <line x1={xInicio + 30} y1={Y_BARRA} x2={xInicio + 30} y2={Y_DR - 8} />
          <rect x={xInicio + 21} y={Y_DR - 8} width={18} height={26} />
          <path d={`M${xInicio + 30} ${Y_DR - 4} l-4 8 h8 l-4 8`} />
          <line x1={xInicio + 30} y1={Y_DR + 18} x2={xInicio + 30} y2={Y_DR + 40} />
          <Terra x={xInicio + 30} y={Y_DR + 40} />
          <text x={xInicio + 8} y={Y_DR + 64} fontSize={8} fill="currentColor" stroke="none">
            {dps.length}× DPS
          </text>
          <text x={xInicio + 8} y={Y_DR + 74} fontSize={8} fill="currentColor" stroke="none">
            {dps[0].p?.ucV} V {dps[0].p?.imaxKa} kA
          </text>
        </g>
      )}

      {colunas.map((g, gi) => {
        const centro = g.ini + g.largura / 2;
        const yRamo = g.dr ? Y_SUBBARRA : Y_BARRA;
        return (
          <g key={gi}>
            {g.dr ? (
              <>
                <line x1={centro} y1={Y_BARRA} x2={centro} y2={Y_DR - 12} />
                <rect x={centro - 16} y={Y_DR - 12} width={32} height={24} rx={3} />
                <text x={centro} y={Y_DR + 4} fontSize={9} fontWeight={700} textAnchor="middle" fill="currentColor" stroke="none">
                  DR
                </text>
                <text x={centro + 20} y={Y_DR + 2} fontSize={8} fill="currentColor" stroke="none">
                  {g.dr.p?.correnteNominal}A {g.dr.p?.polos}P 30mA
                </text>
                <line x1={centro} y1={Y_DR + 12} x2={centro} y2={Y_SUBBARRA} />
                {g.itens.length > 1 && (
                  <line x1={g.ini + COL / 2} y1={Y_SUBBARRA} x2={g.ini + g.largura - COL / 2} y2={Y_SUBBARRA} strokeWidth={2} />
                )}
              </>
            ) : null}
            {g.itens.map((r, i) => {
              const cx = g.ini + i * COL + COL / 2;
              const s = r.dim.secao;
              return (
                <g key={r.circuito.id}>
                  <line x1={cx} y1={yRamo} x2={cx} y2={Y_DJ - 14} />
                  <Disjuntor x={cx} y={Y_DJ} />
                  <text x={cx} y={Y_DJ - 18} fontSize={8} fontWeight={700} textAnchor="middle" fill="currentColor" stroke="none">
                    {r.pecaDisjuntor?.rotulo ?? "?"}
                  </text>
                  <line x1={cx} y1={Y_DJ + 14} x2={cx} y2={Y_TEXTO - 6} />
                  {r.fases.map((f, k) => (
                    <circle key={f} cx={cx - 6 + k * 6} cy={Y_TEXTO - 2} r={2.5} fill={COR_FASE[f]} stroke="none" />
                  ))}
                  <text
                    transform={`translate(${cx + 3} ${Y_TEXTO + 6}) rotate(90)`}
                    fontSize={8.5}
                    fill="currentColor"
                    stroke="none"
                  >
                    <tspan fontWeight={700}>{numero.get(r.circuito.id)}.</tspan> {r.circuito.nome.slice(0, 30)}
                    <tspan x={0} dy={10} fillOpacity={0.75}>
                      {s ? `${s.toLocaleString("pt-BR")} mm²` : "?"} · {r.circuito.potenciaW} W · {r.fases.join("+") || "?"}
                    </tspan>
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
