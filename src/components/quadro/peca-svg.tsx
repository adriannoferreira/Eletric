import type { Peca } from "@/lib/eletrica/pecas";
import type { Fase } from "@/lib/eletrica/tipos";

/**
 * Desenho realista de uma peça DIN em SVG (coordenadas em mm de desenho):
 * corpo com volume e sombra, parafusos de borne, painel frontal com as
 * especificações impressas (dos dados da peça), alavanca ligado/desligado com
 * janela indicadora, botão de teste do DR e janela de status do DPS.
 * Visual genérico de mercado — sem marcas nem logotipos.
 * Os gradientes vêm de <DefsPecas /> (uma vez por SVG).
 */

export type DestaqueSVG = "ok" | "aviso" | "erro" | "selecionado" | null;

/** Gradientes compartilhados — incluir uma vez em cada <svg> que usa <PecaSVG>. */
export function DefsPecas() {
  return (
    <>
      <linearGradient id="pc-corpo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#e3e6ea" />
      </linearGradient>
      <linearGradient id="pc-lado" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#000" stopOpacity=".18" />
        <stop offset=".12" stopColor="#000" stopOpacity="0" />
        <stop offset=".88" stopColor="#000" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity=".22" />
      </linearGradient>
      <linearGradient id="pc-borne" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#eceff2" />
        <stop offset="1" stopColor="#cfd4da" />
      </linearGradient>
      <linearGradient id="pc-painel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#f1f3f5" />
      </linearGradient>
      <linearGradient id="pc-dps" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ef5a35" />
        <stop offset="1" stopColor="#c8381c" />
      </linearGradient>
      <radialGradient id="pc-parafuso" cx=".35" cy=".3" r=".75">
        <stop offset="0" stopColor="#f8fafc" />
        <stop offset=".55" stopColor="#a8b0ba" />
        <stop offset="1" stopColor="#5b6470" />
      </radialGradient>
      <linearGradient id="pc-alavanca" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity=".35" />
        <stop offset=".4" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#000" stopOpacity=".3" />
      </linearGradient>
      <linearGradient id="pc-trilho" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f3f4f6" />
        <stop offset=".18" stopColor="#c7ccd2" />
        <stop offset=".5" stopColor="#8f98a3" />
        <stop offset=".82" stopColor="#c7ccd2" />
        <stop offset="1" stopColor="#6b7280" />
      </linearGradient>
      <linearGradient id="pc-ponteira" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#d1d5db" />
        <stop offset=".5" stopColor="#f9fafb" />
        <stop offset="1" stopColor="#9ca3af" />
      </linearGradient>
    </>
  );
}

/** Trilho DIN 35 mm metálico com furos oblongos. */
export function TrilhoSVG({ x, y, w }: { x: number; y: number; w: number }) {
  const h = 9;
  const furos = Math.max(0, Math.floor((w - 6) / 25));
  return (
    <g>
      <rect x={x} y={y - h / 2} width={w} height={h} rx={0.8} fill="url(#pc-trilho)" stroke="#6b7280" strokeWidth={0.25} />
      {Array.from({ length: furos }, (_, i) => (
        <rect key={i} x={x + 6 + i * 25} y={y - 1.1} width={9} height={2.2} rx={1.1} fill="#4b5563" opacity={0.75} />
      ))}
    </g>
  );
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

/** Parafuso de borne (philips) com o furo de entrada do cabo logo abaixo/acima. */
function Parafuso({ cx, cy, r, entradaAbaixo }: { cx: number; cy: number; r: number; entradaAbaixo: boolean }) {
  const d = r * 0.62;
  const ey = entradaAbaixo ? cy + r + 0.6 : cy - r - 0.6 - r * 0.9;
  return (
    <g>
      <rect x={cx - r * 0.95} y={ey} width={r * 1.9} height={r * 0.9} rx={0.4} fill="#374151" opacity={0.85} />
      <circle cx={cx} cy={cy} r={r + 0.35} fill="#9aa1ab" opacity={0.6} />
      <circle cx={cx} cy={cy} r={r} fill="url(#pc-parafuso)" stroke="#4b5563" strokeWidth={0.2} />
      <g stroke="#374151" strokeWidth={Math.max(0.25, r * 0.22)} strokeLinecap="round" transform={`rotate(18 ${cx} ${cy})`}>
        <line x1={cx - d} y1={cy} x2={cx + d} y2={cy} />
        <line x1={cx} y1={cy - d} x2={cx} y2={cy + d} />
      </g>
    </g>
  );
}

export function PecaSVG({
  peca: p,
  x,
  y,
  w,
  h,
  fases = [],
  coresFase,
  geral,
  ligado = true,
  energizada,
  detalhe = true,
  destaque = null,
  aoAlavanca,
  aoTeste,
}: {
  peca: Peca;
  x: number;
  y: number;
  w: number;
  h: number;
  fases?: Fase[];
  coresFase?: Record<Fase, string>;
  geral?: boolean;
  /** Alavanca ligada (visual). */
  ligado?: boolean;
  /** Tensão chegando na peça (acende a janela/LED); undefined = não mostrar. */
  energizada?: boolean;
  /** Texto miúdo das especificações (desligar em miniaturas). */
  detalhe?: boolean;
  destaque?: DestaqueSVG;
  aoAlavanca?: () => void;
  aoTeste?: () => void;
}) {
  const polos = p.tipo === "dps" ? 1 : p.polos;
  const lp = w / polos;
  const dps = p.tipo === "dps";
  const yT = y + Math.min(7, h * 0.078);
  const yB = y + h - Math.min(7, h * 0.078);
  const rp = Math.min(lp * 0.27, h * 0.045, 3.2);
  const banda = Math.min(h * 0.17, 15.5);
  const px = x + Math.min(1.4, w * 0.07);
  const pw = w - (px - x) * 2;
  const py = y + banda;
  const ph = h - banda * 2;
  const corAlavanca = p.tipo === "dr" ? "#1d4ed8" : p.tipo === "seccionadora" ? "#b91c1c" : "#1f2937";
  const tam = (k: number) => Math.min(k, pw / 3.6);
  const anel =
    destaque === "selecionado" ? "#f59e0b" : destaque === "erro" ? "#ef4444" : destaque === "aviso" ? "#f59e0b" : null;

  // Alavanca: um punho largo atravessando os polos (barra de acoplamento)
  const aw = Math.min(pw * 0.62, lp * 0.5 * polos + lp * 0.3 * (polos - 1));
  const ah = Math.max(4, ph * 0.2);
  const trilhoAlav = { x: px + pw / 2 - aw / 2 - 0.8, y: py + ph * 0.36, w: aw + 1.6, h: ph * 0.42 };
  const ay = ligado ? trilhoAlav.y + 0.8 : trilhoAlav.y + trilhoAlav.h - ah - 0.8;
  const linhas: string[] = !detalhe
    ? []
    : p.tipo === "dr"
      ? [`In ${p.correnteNominal}A`, `IΔn ${fmt((p.sensibilidadeMa ?? 30) / 1000)}A`, `${polos}P`]
      : dps
        ? [`Uc ${p.ucV}V`, `Imax ${p.imaxKa}kA`, "Classe II"]
        : p.tipo === "seccionadora"
          ? [`${p.correnteNominal}A ${polos}P`, "Seccionadora"]
          : [`${polos}P  ${p.correnteNominal}A`, `Curva ${p.curva ?? "C"}`];
  const norma = detalhe ? p.norma.split("/")[0].trim() : "";

  return (
    <g>
      {/* sombra projetada */}
      <rect x={x + 0.9} y={y + 1.2} width={w - 0.4} height={h - 0.4} rx={1.8} fill="#000" opacity={0.28} />
      {/* corpo */}
      <rect x={x + 0.2} y={y} width={w - 0.4} height={h} rx={1.6} fill={dps ? "url(#pc-dps)" : "url(#pc-corpo)"} stroke={dps ? "#8f2410" : "#9aa1ab"} strokeWidth={0.35} />
      {/* bandas dos bornes */}
      {!dps && (
        <>
          <rect x={x + 0.4} y={y + 0.4} width={w - 0.8} height={banda - 0.4} rx={1.2} fill="url(#pc-borne)" />
          <rect x={x + 0.4} y={y + h - banda} width={w - 0.8} height={banda - 0.4} rx={1.2} fill="url(#pc-borne)" />
        </>
      )}
      {/* separações entre polos */}
      {Array.from({ length: polos - 1 }, (_, i) => (
        <line key={i} x1={x + lp * (i + 1)} y1={y + 1} x2={x + lp * (i + 1)} y2={y + h - 1} stroke="#000" strokeOpacity={0.12} strokeWidth={0.3} />
      ))}
      {/* faixa de fases no topo */}
      {fases.length > 0 &&
        Array.from({ length: polos }, (_, i) =>
          fases[i] && coresFase ? <rect key={i} x={x + lp * i + 0.6} y={y + 0.5} width={lp - 1.2} height={1.1} rx={0.5} fill={coresFase[fases[i]]} /> : null,
        )}
      {/* parafusos */}
      {Array.from({ length: polos }, (_, i) => (
        <g key={i}>
          <Parafuso cx={x + lp * (i + 0.5)} cy={yT} r={rp} entradaAbaixo={false} />
          <Parafuso cx={x + lp * (i + 0.5)} cy={yB} r={rp} entradaAbaixo />
        </g>
      ))}
      {/* painel frontal (degrau) */}
      <rect x={px} y={py} width={pw} height={ph} rx={1.2} fill={dps ? "#e2492a" : "url(#pc-painel)"} stroke={dps ? "#a92e14" : "#c4c9cf"} strokeWidth={0.3} />
      <rect x={x + 0.2} y={y} width={w - 0.4} height={h} rx={1.6} fill="url(#pc-lado)" pointerEvents="none" />

      {/* Rótulo principal */}
      <text x={px + pw / 2} y={py + ph * 0.17} textAnchor="middle" fontSize={tam(geral ? 4.2 : 5.2)} fontWeight={800} fill={dps ? "#fff" : "#111827"}>
        {dps ? "DPS" : p.tipo === "dr" ? "DR" : p.rotulo}
      </text>
      {geral && (
        <g>
          <rect x={px + pw / 2 - Math.min(9, pw * 0.42)} y={py - 3.6} width={Math.min(18, pw * 0.84)} height={3.2} rx={1} fill="#fbbf24" />
          <text x={px + pw / 2} y={py - 1.25} textAnchor="middle" fontSize={2.2} fontWeight={900} fill="#1a1400">
            GERAL
          </text>
        </g>
      )}
      {linhas.slice(0, 1).map((t) => (
        <text key={t} x={px + pw / 2} y={py + ph * 0.28} textAnchor="middle" fontSize={tam(2.4)} fontWeight={600} fill={dps ? "#ffe4dc" : "#374151"}>
          {t}
        </text>
      ))}

      {dps ? (
        <g>
          {/* janela de status: verde = protegido */}
          <rect x={px + pw * 0.18} y={py + ph * 0.4} width={pw * 0.64} height={ph * 0.12} rx={0.8} fill="#111827" />
          <rect x={px + pw * 0.22} y={py + ph * 0.42} width={pw * 0.56} height={ph * 0.08} rx={0.5} fill={energizada === false ? "#4b5563" : "#22c55e"} />
          {detalhe && (
            <text x={px + pw / 2} y={py + ph * 0.6} textAnchor="middle" fontSize={tam(1.7)} fontWeight={700} fill="#fff">
              STATUS
            </text>
          )}
          {linhas.slice(1).map((t, i) => (
            <text key={t} x={px + pw / 2} y={py + ph * (0.72 + i * 0.09)} textAnchor="middle" fontSize={tam(2.1)} fill="#ffe4dc">
              {t}
            </text>
          ))}
        </g>
      ) : (
        <g>
          {/* trilho da alavanca + janela indicadora */}
          <rect x={trilhoAlav.x} y={trilhoAlav.y} width={trilhoAlav.w} height={trilhoAlav.h} rx={1} fill="#1f2937" opacity={0.18} />
          {detalhe && (
            <>
              <text x={trilhoAlav.x - 0.6} y={trilhoAlav.y + 2.6} textAnchor="end" fontSize={tam(2)} fontWeight={700} fill="#374151">I</text>
              <text x={trilhoAlav.x - 0.6} y={trilhoAlav.y + trilhoAlav.h - 0.6} textAnchor="end" fontSize={tam(2)} fontWeight={700} fill="#374151">O</text>
            </>
          )}
          <g
            onClick={aoAlavanca ? (e) => (e.stopPropagation(), aoAlavanca()) : undefined}
            className={aoAlavanca ? "cursor-pointer" : undefined}
            role={aoAlavanca ? "button" : undefined}
            aria-label={aoAlavanca ? (ligado ? "Desligar" : "Ligar") : undefined}
          >
            {aoAlavanca && <rect x={trilhoAlav.x - 1.5} y={ay - 2} width={trilhoAlav.w + 3} height={ah + 4} fill="transparent" />}
            <rect x={px + pw / 2 - aw / 2} y={ay} width={aw} height={ah} rx={1} fill={corAlavanca} className="pc-alavanca" />
            <rect x={px + pw / 2 - aw / 2} y={ay} width={aw} height={ah} rx={1} fill="url(#pc-alavanca)" pointerEvents="none" />
          </g>
          {/* janela: vermelho I-ON / verde O-OFF */}
          <rect x={px + pw / 2 - Math.min(5, pw * 0.3)} y={py + ph * 0.86} width={Math.min(10, pw * 0.6)} height={ph * 0.07} rx={0.6} fill={ligado ? "#dc2626" : "#16a34a"} />
          {detalhe && (
            <text x={px + pw / 2} y={py + ph * 0.86 + ph * 0.055} textAnchor="middle" fontSize={tam(1.6)} fontWeight={800} fill="#fff">
              {ligado ? "I-ON" : "O-OFF"}
            </text>
          )}
          {linhas.slice(1).map((t, i) => (
            <text key={t} x={px + pw / 2} y={py + ph * (0.33 + i * 0.075)} textAnchor="middle" fontSize={tam(1.9)} fill="#4b5563">
              {t}
            </text>
          ))}
          {p.tipo === "dr" && (
            <g
              onClick={aoTeste ? (e) => (e.stopPropagation(), aoTeste()) : undefined}
              className={aoTeste ? "cursor-pointer" : undefined}
              role={aoTeste ? "button" : undefined}
              aria-label={aoTeste ? "Botão de teste do DR" : undefined}
            >
              <rect x={px + pw - Math.min(7, pw * 0.3) - 1} y={py + ph * 0.06} width={Math.min(7, pw * 0.3)} height={Math.min(6, ph * 0.1)} rx={0.8} fill="#f97316" stroke="#9a3412" strokeWidth={0.25} />
              <text x={px + pw - Math.min(7, pw * 0.3) / 2 - 1} y={py + ph * 0.06 + Math.min(6, ph * 0.1) * 0.72} textAnchor="middle" fontSize={2.6} fontWeight={900} fill="#fff">
                T
              </text>
            </g>
          )}
        </g>
      )}
      {detalhe && norma && (
        <text x={px + pw / 2} y={py + ph - 1.2} textAnchor="middle" fontSize={tam(1.45)} fill={dps ? "#ffe4dc" : "#6b7280"}>
          {norma}
        </text>
      )}
      {energizada !== undefined && !dps && (
        <circle cx={x + w - 1.6} cy={py + 1.6} r={0.8} fill={energizada && ligado ? "#22c55e" : "#4b5563"} />
      )}
      {anel && <rect x={x - 0.6} y={y - 0.6} width={w + 1.2} height={h + 1.2} rx={2.2} fill="none" stroke={anel} strokeWidth={destaque === "selecionado" ? 1.2 : 0.8} />}
    </g>
  );
}
