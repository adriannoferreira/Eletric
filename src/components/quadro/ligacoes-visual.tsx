"use client";

import { useMemo } from "react";
import { capacidadeTotal } from "@/lib/eletrica/caixas";
import {
  CORES_CABO,
  GEO,
  type Ligacao,
  pontoEntrada,
  posicaoTerminal,
  type ResultadoLigacoes,
  retanguloPeca,
  terminaisDaPeca,
} from "@/lib/eletrica/ligacoes";
import { padraoDaPeca, peca } from "@/lib/eletrica/pecas";
import type { QuadroDados } from "@/lib/eletrica/tipos";
import { rotear } from "./rotas";

const hex = (cor: string) => CORES_CABO[cor]?.hex ?? cor;

/** Espessura do traço (mm de desenho) proporcional à seção do cabo. */
const espessura = (secao: number) => Math.min(2.2, 0.55 + Math.sqrt(Math.max(secao, 1)) * 0.3);

/**
 * Desenho das ligações internas do quadro em SVG: peças com terminais numerados,
 * pentes, barras com bornes, entrada e cabos coloridos roteados pelas canaletas.
 * Tocar num cabo seleciona (o caminho fica em destaque).
 */
export function LigacoesVisual({
  dados,
  resultado,
  escala = 1,
  selecionada,
  aoSelecionar,
  animar = false,
  nome,
}: {
  dados: QuadroDados;
  resultado: ResultadoLigacoes;
  escala?: number;
  selecionada?: string | null;
  aoSelecionar?: (id: string | null) => void;
  animar?: boolean;
  nome?: string;
}) {
  const { rotas, saidas, geo, barras } = useMemo(() => rotear(dados, resultado.ligacoes, resultado.barras), [dados, resultado]);
  const porId = useMemo(() => new Map(resultado.ligacoes.map((l) => [l.id, l])), [resultado]);
  const comps = dados.componentes.map((c) => ({ c, p: peca(c.pecaId) })).filter((x) => x.p);
  const metal = dados.modelo.material === "metalico";

  const largura = barras.larguraTotal + 30;
  const entradaY = pontoEntrada(dados, "R", barras.yFim).y;
  const altura = Math.max(barras.yFim, entradaY) + 34;
  const k = 2 * escala;
  const destaque = selecionada ? porId.get(selecionada) : null;
  const opac = (id: string) => (!selecionada || id === selecionada ? 1 : 0.18);

  const cabo = (l: Ligacao, d: string) => {
    const c = CORES_CABO[l.cor];
    const w = espessura(l.secao);
    return (
      <g key={l.id} opacity={opac(l.id)} onClick={aoSelecionar ? (e) => (e.stopPropagation(), aoSelecionar(l.id === selecionada ? null : l.id)) : undefined} className={aoSelecionar ? "cursor-pointer" : ""}>
        {aoSelecionar && <path d={d} stroke="transparent" strokeWidth={8} fill="none" />}
        <path d={d} stroke="#0b0f14" strokeWidth={w + 0.9} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={0.55} />
        <path d={d} stroke={c?.hex ?? "#888"} strokeWidth={w} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {c?.borda && <path d={d} stroke={c.borda} strokeWidth={w * 0.38} strokeDasharray={l.cor === "verde-amarelo" ? "3 3" : undefined} fill="none" strokeLinejoin="round" />}
        {animar && <path d={d} stroke="#fff" strokeOpacity={0.85} strokeWidth={Math.max(0.6, w * 0.35)} strokeDasharray="1.5 6" fill="none" className="fluxo" />}
        {selecionada === l.id && <path d={d} stroke="#fbbf24" strokeWidth={w + 2.6} fill="none" opacity={0.45} strokeLinejoin="round" />}
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      width={largura * k}
      height={altura * k}
      className="select-none"
      onClick={() => aoSelecionar?.(null)}
      role="img"
      aria-label={`Ligações internas do quadro ${nome ?? ""}`}
    >
      <style>{`.fluxo{animation:fluxo 1.1s linear infinite}@keyframes fluxo{to{stroke-dashoffset:-15}}@media (prefers-reduced-motion: reduce){.fluxo{animation:none}}`}</style>
      <defs>
        <linearGradient id="trilho" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3f4f6" />
          <stop offset=".45" stopColor="#9ca3af" />
          <stop offset=".55" stopColor="#d1d5db" />
          <stop offset="1" stopColor="#6b7280" />
        </linearGradient>
        <pattern id="pe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="4" height="8" fill="#16a34a" />
          <rect x="4" width="4" height="8" fill="#facc15" />
        </pattern>
      </defs>

      {/* Caixa */}
      <rect x={1} y={1} width={largura - 2} height={altura - 2} rx={8} fill={metal ? "#4b5563" : "#e7e5e4"} stroke={metal ? "#1f2937" : "#a8a29e"} strokeWidth={1.5} />
      <rect x={6} y={6} width={largura - 12} height={altura - 12} rx={5} fill={metal ? "#d1d5db" : "#f5f5f4"} />
      <text x={largura - 10} y={16} textAnchor="end" fontSize={6} fontWeight={700} fill="#374151">
        {nome || "QDC"} · {capacidadeTotal(dados.modelo)} {dados.modelo.padrao === "NEMA" ? "posições NEMA" : "módulos DIN"}
      </text>

      {/* Entrada */}
      <g>
        <text x={8} y={entradaY < 20 ? 4.6 : entradaY + 12} fontSize={3.6} fill="#374151" fontWeight={700}>
          ENTRADA {entradaY < 20 ? "" : "(por baixo)"}
        </text>
        {(["R", "S", "T", "N", "PE"] as const).map((c, i) => {
          const usada = resultado.ligacoes.some((l) => l.de.k === "entrada" && l.de.condutor === c);
          if (!usada) return null;
          const cor = c === "N" ? resultado.cores.N : c === "PE" ? resultado.cores.PE : resultado.cores[c];
          return (
            <g key={c}>
              <rect x={8 + i * 7 - 2.4} y={entradaY < 20 ? 6 : entradaY - 1} width={4.8} height={5} rx={1} fill={c === "PE" ? "url(#pe)" : hex(cor)} stroke="#111827" strokeWidth={0.3} />
              <text x={8 + i * 7} y={entradaY < 20 ? 14.5 : entradaY + 7.5} fontSize={3} textAnchor="middle" fill="#111827">{c}</text>
            </g>
          );
        })}
      </g>

      {/* Trilhos e áreas */}
      {geo.linhas.map((l, i) =>
        l.padrao === "DIN" ? (
          <rect key={i} x={l.x - 3} y={l.y + l.h / 2 - 5} width={l.w + 6} height={10} rx={1} fill="url(#trilho)" />
        ) : null,
      )}
      {geo.nema && geo.linhas.some((l) => l.padrao === "NEMA") && (
        <rect
          x={geo.centroNEMA - GEO.barramentoNEMA / 2}
          y={geo.linhas.find((l) => l.padrao === "NEMA")!.y - 4}
          width={GEO.barramentoNEMA}
          height={geo.linhas.find((l) => l.padrao === "NEMA")!.h + 8}
          rx={2}
          fill="#b45309"
          opacity={0.85}
        />
      )}

      {/* Peças */}
      {comps.map(({ c, p }) => {
        const r = retanguloPeca(dados, c, geo);
        if (!r || !p) return null;
        const nema = padraoDaPeca(p) === "NEMA";
        const t = terminaisDaPeca(p, c);
        const rotulo = c.geral ? "GERAL" : p.tipo === "dr" ? "DR" : p.tipo === "dps" ? "DPS" : p.rotulo;
        const sub = p.tipo === "dr" ? `${p.correnteNominal}A 30mA` : p.tipo === "dps" ? `${p.ucV}V` : `${p.polos}P ${p.rotulo}`;
        const nomePeca = resultado.nomes.get(c.id) ?? "";
        return (
          <g key={c.id}>
            <rect x={r.x + 0.6} y={r.y + 0.6} width={r.w - 1.2} height={r.h - 1.2} rx={1.6} fill={p.tipo === "dps" ? "#e5e7eb" : "#fafafa"} stroke="#6b7280" strokeWidth={0.5} />
            {nema ? (
              <>
                <rect x={r.x + r.w / 2 - 10} y={r.y + r.h / 2 - 4} width={20} height={8} rx={1.4} fill="#1f2937" />
                <text x={r.x + 8} y={r.y + r.h / 2 + 1.5} fontSize={4} fontWeight={700} fill="#111827">{rotulo}</text>
              </>
            ) : (
              <>
                <rect x={r.x + 2} y={r.y + 20} width={r.w - 4} height={9} rx={1} fill="#fff" stroke="#d1d5db" strokeWidth={0.3} />
                <text x={r.x + r.w / 2} y={r.y + 26.6} fontSize={Math.min(5, r.w / 3.2)} textAnchor="middle" fontWeight={800} fill="#111827">
                  {rotulo}
                </text>
                {p.tipo !== "dps" && <rect x={r.x + r.w * 0.18} y={r.y + 38} width={r.w * 0.64} height={12} rx={1.4} fill={p.tipo === "dr" ? "#1e3a8a" : "#1f2937"} />}
                {p.tipo === "dps" && <rect x={r.x + r.w * 0.25} y={r.y + 40} width={r.w * 0.5} height={6} rx={1} fill="#22c55e" stroke="#6b7280" strokeWidth={0.3} />}
                <text x={r.x + r.w / 2} y={r.y + 60} fontSize={Math.min(3.4, r.w / 4.6)} textAnchor="middle" fill="#374151">
                  {sub}
                </text>
                <text x={r.x + r.w / 2} y={r.y + 67} fontSize={Math.min(3, r.w / 5)} textAnchor="middle" fill="#6b7280">
                  {nomePeca.replace("Disjuntor ", "")}
                </text>
              </>
            )}
            {/* Terminais numerados */}
            {[...t.linha, ...t.carga].map((term) => {
              const xy = posicaoTerminal(dados, c, term, geo);
              if (!xy) return null;
              const emCima = term.lado === "linha";
              return (
                <g key={term.t}>
                  <circle cx={xy.x} cy={xy.y} r={1.9} fill="#d1d5db" stroke="#374151" strokeWidth={0.4} />
                  {!nema && (
                    <text x={xy.x} y={emCima ? xy.y + 6 : xy.y - 3.6} fontSize={2.9} textAnchor="middle" fontWeight={700} fill="#1f2937">
                      {term.t}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Pentes */}
      {resultado.pentes.map((pt) => {
        const l = geo.linhas[pt.fileira];
        if (!l) return null;
        const x0 = l.x + pt.posicao * GEO.moduloDIN + 2;
        const x1 = l.x + (pt.posicao + pt.modulos) * GEO.moduloDIN - 2;
        const y = l.y + 7;
        const dentes = Array.from({ length: pt.modulos }, (_, i) => ({ x: l.x + (pt.posicao + i + 0.5) * GEO.moduloDIN, f: pt.fases[i % pt.fases.length] }));
        return (
          <g key={pt.id} opacity={selecionada ? (selecionada === pt.id ? 1 : 0.25) : 1}>
            <rect x={x0} y={y - 4.2} width={x1 - x0} height={3} rx={0.8} fill="#9a3412" stroke="#431407" strokeWidth={0.3} />
            {dentes.map((d, i) => (
              <g key={i}>
                <rect x={d.x - 0.8} y={y - 1.4} width={1.6} height={2.4} fill="#c2410c" />
                <circle cx={d.x} cy={y - 2.7} r={0.9} fill={hex(resultado.cores[d.f])} stroke="#111" strokeWidth={0.2} />
              </g>
            ))}
            <text x={x0} y={y - 5.2} fontSize={2.6} fill="#7c2d12" fontWeight={700}>
              pente {pt.tipo}
            </text>
          </g>
        );
      })}

      {/* Barras */}
      {barras.itens.map((b) => {
        if (b.id.startsWith("F:")) return null;
        const info = resultado.barras.find((x) => x.id === b.id);
        const pe = b.id === "PE";
        return (
          <g key={b.id}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={1.5} fill={pe ? "url(#pe)" : "#2563eb"} stroke="#111827" strokeWidth={0.4} />
            {Array.from({ length: Math.max(b.bornes, 3) }).map((_, i) =>
              b.vertical ? (
                <circle key={i} cx={b.x + 4} cy={b.y + GEO.bornePasso * (i + 1) - 2} r={1.8} fill={i < b.bornes ? "#e5e7eb" : "#94a3b8"} stroke="#111827" strokeWidth={0.3} />
              ) : (
                <circle key={i} cx={b.x + GEO.bornePasso * (i + 1) - 2} cy={b.y + 4} r={1.8} fill={i < b.bornes ? "#e5e7eb" : "#94a3b8"} stroke="#111827" strokeWidth={0.3} />
              ),
            )}
            <text
              x={b.vertical ? b.x : b.x + 2}
              y={b.vertical ? b.y - 2 : b.y + GEO.alturaBarra - 2}
              fontSize={2.8}
              fontWeight={700}
              fill={b.vertical ? "#111827" : "#fff"}
            >
              {pe ? "PE" : info?.drId ? `N ${resultado.nomes.get(info.drId) ?? "DR"}` : "N"}
            </text>
          </g>
        );
      })}

      {/* Cabos */}
      {rotas.map((r) => {
        const l = porId.get(r.id);
        if (!l) return null;
        const d = r.pontos.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
        return cabo(l, d);
      })}

      {/* Saídas dos circuitos */}
      {saidas.map((s) => {
        const l = porId.get(s.id);
        if (!l) return null;
        const d = `M${s.x} ${s.y} l${s.dx} ${s.dy}`;
        const tx = s.x + s.dx * (s.dx ? 1.25 : 1);
        const ty = s.y + s.dy + (s.dy ? 3.5 : 1.2);
        return (
          <g key={s.id}>
            {cabo(l, d)}
            <text x={tx} y={ty} fontSize={2.8} textAnchor="middle" fontWeight={700} fill="#111827" opacity={opac(s.id)}>
              {s.rotulo}
            </text>
          </g>
        );
      })}

      {destaque && <title>{`${destaque.deTexto} → ${destaque.paraTexto}`}</title>}
    </svg>
  );
}
