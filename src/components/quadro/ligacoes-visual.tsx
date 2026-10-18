"use client";

import { type ReactNode, useMemo, useRef, useState } from "react";
import { capacidadeTotal } from "@/lib/eletrica/caixas";
import {
  CORES_CABO,
  corPonteira,
  GEO,
  type Ligacao,
  pontoEntrada,
  posicaoTerminal,
  type ResultadoLigacoes,
  retanguloPeca,
  terminaisDaPeca,
} from "@/lib/eletrica/ligacoes";
import { modulosOcupados, padraoDaPeca, peca } from "@/lib/eletrica/pecas";
import type { Energizacao } from "@/lib/eletrica/simulador";
import type { Fase, QuadroDados } from "@/lib/eletrica/tipos";
import { DefsPecas, PecaSVG, TrilhoSVG } from "./peca-svg";
import { rotear } from "./rotas";

const hex = (cor: string) => CORES_CABO[cor]?.hex ?? cor;

/** Espessura do traço (mm de desenho) proporcional à seção do cabo. */
const espessura = (secao: number) => Math.min(2.2, 0.55 + Math.sqrt(Math.max(secao, 1)) * 0.3);

type XY = { x: number; y: number };

export type TemaLigacoes = "claro" | "simulador";

/** Destino de encaixe enquanto a peça é arrastada. */
type Alvo = { fileira: number; posicao: number; ok: boolean };

/**
 * Desenho das ligações internas do quadro em SVG: peças realistas com terminais
 * numerados, pentes, barras com bornes, entrada, cabos coloridos roteados pelas
 * canaletas e ponteiras nas pontas que entram em borne.
 * Tema "simulador": fundo azul-marinho, cabos grossos e brilhantes, liga/desliga
 * nas alavancas, teste do DR e arrastar peças (encaixe no trilho).
 */
export function LigacoesVisual({
  dados,
  resultado,
  escala = 1,
  selecionada,
  aoSelecionar,
  animar = false,
  nome,
  tema = "claro",
  energia,
  desligados,
  aoAlavanca,
  aoTesteDR,
  pecaSelecionada,
  aoTocarPeca,
  podeSoltar,
  aoSoltarPeca,
  movendo,
  ferramentas,
}: {
  dados: QuadroDados;
  resultado: ResultadoLigacoes;
  escala?: number;
  selecionada?: string | null;
  aoSelecionar?: (id: string | null) => void;
  animar?: boolean;
  nome?: string;
  tema?: TemaLigacoes;
  /** Cabos e peças com tensão (liga/desliga). Sem ela, tudo aparece normal. */
  energia?: Energizacao;
  desligados?: ReadonlySet<string>;
  aoAlavanca?: (compId: string) => void;
  aoTesteDR?: (compId: string) => void;
  pecaSelecionada?: string | null;
  aoTocarPeca?: (compId: string | null) => void;
  podeSoltar?: (compId: string, fileira: number, posicao: number) => boolean;
  aoSoltarPeca?: (compId: string, fileira: number, posicao: number) => void;
  /** Peça em modo "mover": mostra as posições livres para tocar. */
  movendo?: string | null;
  /** Barrinha de ferramentas exibida sobre a peça selecionada. */
  ferramentas?: ReactNode;
}) {
  const { rotas, saidas, geo, barras } = useMemo(() => rotear(dados, resultado.ligacoes, resultado.barras), [dados, resultado]);
  const porId = useMemo(() => new Map(resultado.ligacoes.map((l) => [l.id, l])), [resultado]);
  const comps = dados.componentes.map((c) => ({ c, p: peca(c.pecaId) })).filter((x) => x.p);
  const metal = dados.modelo.material === "metalico";
  const sim = tema === "simulador";
  const coresFase = Object.fromEntries((["R", "S", "T"] as const).map((f) => [f, hex(resultado.cores[f])])) as Record<Fase, string>;

  const largura = barras.larguraTotal + 30;
  const entradaY = pontoEntrada(dados, "R", barras.yFim).y;
  const altura = Math.max(barras.yFim, entradaY) + 34;
  const k = 2 * escala;
  const destaque = selecionada ? porId.get(selecionada) : null;
  const opac = (id: string) => (!selecionada || id === selecionada ? 1 : 0.18);
  const comTensao = (l: Ligacao) => !energia || l.funcao === "PE" || energia.ligacoes.has(l.id);

  // ---- Arrastar peça (pointer events; só a peça selecionada é arrastável)
  const svgRef = useRef<SVGSVGElement>(null);
  const [arraste, setArraste] = useState<{ id: string; dx: number; dy: number; p: XY; alvo: Alvo | null; moveu: boolean } | null>(null);
  const clicouDepoisDeArrastar = useRef(false);
  const paraMM = (e: { clientX: number; clientY: number }): XY | null => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };
  const alvoPara = (id: string, centro: XY): Alvo | null => {
    const c = dados.componentes.find((x) => x.id === id);
    const p = c && peca(c.pecaId);
    if (!c || !p) return null;
    const larg = modulosOcupados(p);
    const nema = padraoDaPeca(p) === "NEMA";
    let melhor: { f: number; d: number } | null = null;
    geo.linhas.forEach((l, f) => {
      if ((l.padrao === "NEMA") !== nema) return;
      const cy = l.y + l.h / 2;
      const cx = l.x + l.w / 2;
      const d = nema ? Math.abs(centro.x - cx) : Math.abs(centro.y - cy);
      if (!melhor || d < melhor.d) melhor = { f, d };
    });
    if (!melhor) return null;
    const { f } = melhor;
    const l = geo.linhas[f];
    const passo = nema ? GEO.posicaoNEMA : GEO.moduloDIN;
    const bruto = nema ? (centro.y - l.y) / passo - larg / 2 : (centro.x - l.x) / passo - larg / 2;
    const max = Math.max(0, Math.round((nema ? l.h : l.w) / passo) - larg);
    const posicao = Math.min(max, Math.max(0, Math.round(bruto)));
    return { fileira: f, posicao, ok: podeSoltar ? podeSoltar(id, f, posicao) : true };
  };

  const cabo = (l: Ligacao, d: string) => {
    const c = CORES_CABO[l.cor];
    const ativo = selecionada === l.id;
    const vivo = comTensao(l);
    // O cabo selecionado fica mais grosso e ganha um brilho da própria cor (vermelho destaca vermelho).
    const w = espessura(l.secao) * (sim ? 1.75 : 1) * (ativo ? 1.6 : 1);
    const cor = c?.hex ?? "#888";
    const brilho = l.cor === "verde-amarelo" ? "#16a34a" : cor;
    return (
      <g
        key={l.id}
        opacity={opac(l.id) * (vivo ? 1 : 0.32)}
        onClick={aoSelecionar ? (e) => (e.stopPropagation(), aoSelecionar(ativo ? null : l.id)) : undefined}
        className={aoSelecionar ? "cursor-pointer" : ""}
      >
        {aoSelecionar && <path d={d} stroke="transparent" strokeWidth={8} fill="none" />}
        {ativo && (
          <>
            <path d={d} stroke={brilho} strokeWidth={w + 7} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={0.28} className="pulso-cabo" />
            <path d={d} stroke="#ffffff" strokeWidth={w + 2.4} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={0.95} />
          </>
        )}
        <path d={d} stroke="#0b0f14" strokeWidth={w + 0.9} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={ativo ? 0.3 : 0.55} />
        <path d={d} stroke={cor} strokeWidth={w} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {c?.borda && <path d={d} stroke={c.borda} strokeWidth={w * 0.38} strokeDasharray={l.cor === "verde-amarelo" ? "3 3" : undefined} fill="none" strokeLinejoin="round" />}
        {sim && <path d={d} stroke="#fff" strokeOpacity={0.28} strokeWidth={w * 0.28} fill="none" strokeLinejoin="round" strokeLinecap="round" transform="translate(-0.25 -0.25)" />}
        {animar && vivo && l.funcao !== "PE" && (
          <path d={d} stroke="#fff" strokeOpacity={sim ? 0.6 : 0.85} strokeWidth={Math.max(0.5, w * (sim ? 0.22 : 0.35))} strokeDasharray={sim ? "1 9" : "1.5 6"} fill="none" className="fluxo" />
        )}
      </g>
    );
  };

  /** Ponteira na ponta `fim` do cabo, alinhada com o segmento que vem de `antes`. */
  const ponteira = (l: Ligacao, fim: XY, antes: XY, chave: string) => {
    const dx = antes.x - fim.x;
    const dy = antes.y - fim.y;
    const n = Math.hypot(dx, dy) || 1;
    const ux = dx / n;
    const uy = dy / n;
    const w = espessura(l.secao) * (sim ? 1.75 : 1);
    const tubo = Math.min(1.8, n * 0.3);
    const colar = Math.min(3.4, Math.max(0, n * 0.6 - tubo));
    const a = { x: fim.x + ux * 0.4, y: fim.y + uy * 0.4 };
    const b = { x: fim.x + ux * tubo, y: fim.y + uy * tubo };
    const c = { x: b.x + ux * colar, y: b.y + uy * colar };
    const cor = corPonteira(l.secao).hex;
    return (
      <g key={chave} opacity={opac(l.id) * (comTensao(l) ? 1 : 0.45)} pointerEvents="none">
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="url(#pc-ponteira)" strokeWidth={w * 1.05} strokeLinecap="butt" />
        <line x1={b.x} y1={b.y} x2={c.x} y2={c.y} stroke="#111827" strokeOpacity={0.5} strokeWidth={w * 1.9 + 0.3} strokeLinecap="round" />
        <line x1={b.x} y1={b.y} x2={c.x} y2={c.y} stroke={cor} strokeWidth={w * 1.9} strokeLinecap="round" />
        <line x1={b.x} y1={b.y} x2={c.x} y2={c.y} stroke="#fff" strokeOpacity={0.3} strokeWidth={w * 0.5} strokeLinecap="round" />
      </g>
    );
  };
  const comPonteira = (l: Ligacao) => (l.modo === "cabo" || l.modo === "ponte" || l.modo === "saida") && l.secao > 0;

  const corTexto = sim ? "#e2e8f0" : "#111827";
  const corTextoSuave = sim ? "#93c5fd" : "#374151";
  const arrastando = arraste?.moveu ? arraste : null;

  return (
    <div className="relative" style={{ width: largura * k, height: altura * k }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${largura} ${altura}`}
        width={largura * k}
        height={altura * k}
        className="select-none"
        onClick={() => {
          if (clicouDepoisDeArrastar.current) {
            clicouDepoisDeArrastar.current = false;
            return;
          }
          aoSelecionar?.(null);
          aoTocarPeca?.(null);
        }}
        onPointerMove={(e) => {
          if (!arraste) return;
          const p = paraMM(e);
          if (!p) return;
          const moveu = arraste.moveu || Math.hypot(p.x - arraste.p.x, p.y - arraste.p.y) > 2.5;
          const centro = { x: p.x - arraste.dx, y: p.y - arraste.dy };
          setArraste({ ...arraste, p, moveu, alvo: moveu ? alvoPara(arraste.id, centro) : null });
        }}
        onPointerUp={() => {
          if (!arraste) return;
          if (arraste.moveu) {
            clicouDepoisDeArrastar.current = true;
            if (arraste.alvo?.ok) aoSoltarPeca?.(arraste.id, arraste.alvo.fileira, arraste.alvo.posicao);
          }
          setArraste(null);
        }}
        onPointerCancel={() => setArraste(null)}
        role="img"
        aria-label={`${sim ? "Simulador" : "Ligações internas"} do quadro ${nome ?? ""}`}
      >
        <style>{`.fluxo{animation:fluxo 2.2s linear infinite}@keyframes fluxo{to{stroke-dashoffset:-30}}.pulso-cabo{animation:pulso-cabo 1.4s ease-in-out infinite}@keyframes pulso-cabo{50%{opacity:.5}}.pc-alavanca{transition:y .18s ease}@media (prefers-reduced-motion: reduce){.fluxo,.pulso-cabo{animation:none}.pc-alavanca{transition:none}}`}</style>
        <defs>
          <DefsPecas />
          <pattern id="pe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <rect width="4" height="8" fill="#16a34a" />
            <rect x="4" width="4" height="8" fill="#facc15" />
          </pattern>
          <linearGradient id="sim-fundo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#123a8c" />
            <stop offset="1" stopColor="#0a2463" />
          </linearGradient>
          <pattern id="sim-grade" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0H0V10" fill="none" stroke="#ffffff" strokeOpacity=".05" strokeWidth=".4" />
          </pattern>
        </defs>

        {/* Caixa / placa de montagem */}
        {sim ? (
          <>
            <rect x={0} y={0} width={largura} height={altura} rx={6} fill="#071538" />
            <rect x={4} y={4} width={largura - 8} height={altura - 8} rx={4} fill="url(#sim-fundo)" />
            <rect x={4} y={4} width={largura - 8} height={altura - 8} rx={4} fill="url(#sim-grade)" />
          </>
        ) : (
          <>
            <rect x={1} y={1} width={largura - 2} height={altura - 2} rx={8} fill={metal ? "#4b5563" : "#e7e5e4"} stroke={metal ? "#1f2937" : "#a8a29e"} strokeWidth={1.5} />
            <rect x={6} y={6} width={largura - 12} height={altura - 12} rx={5} fill={metal ? "#d1d5db" : "#f5f5f4"} />
          </>
        )}
        <text x={largura - 10} y={16} textAnchor="end" fontSize={6} fontWeight={700} fill={corTextoSuave}>
          {nome || "QDC"} · {capacidadeTotal(dados.modelo)} {dados.modelo.padrao === "NEMA" ? "posições NEMA" : "módulos DIN"}
        </text>

        {/* Entrada */}
        <g>
          <text x={8} y={entradaY < 20 ? 4.6 : entradaY + 12} fontSize={3.6} fill={corTextoSuave} fontWeight={700}>
            ENTRADA {entradaY < 20 ? "" : "(por baixo)"}
          </text>
          {(["R", "S", "T", "N", "PE"] as const).map((c, i) => {
            const usada = resultado.ligacoes.some((l) => l.de.k === "entrada" && l.de.condutor === c);
            if (!usada) return null;
            const cor = c === "N" ? resultado.cores.N : c === "PE" ? resultado.cores.PE : resultado.cores[c];
            return (
              <g key={c}>
                <rect x={8 + i * 7 - 2.4} y={entradaY < 20 ? 6 : entradaY - 1} width={4.8} height={5} rx={1} fill={c === "PE" ? "url(#pe)" : hex(cor)} stroke="#111827" strokeWidth={0.3} />
                <text x={8 + i * 7} y={entradaY < 20 ? 14.5 : entradaY + 7.5} fontSize={3} textAnchor="middle" fill={corTexto}>
                  {c}
                </text>
              </g>
            );
          })}
        </g>

        {/* Trilhos */}
        {geo.linhas.map((l, i) => (l.padrao === "DIN" ? <TrilhoSVG key={i} x={l.x - 3} y={l.y + l.h / 2} w={l.w + 6} /> : null))}
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

        {/* Posições livres (modo mover) */}
        {movendo &&
          (() => {
            const c = dados.componentes.find((x) => x.id === movendo);
            const p = c && peca(c.pecaId);
            if (!c || !p || padraoDaPeca(p) === "NEMA") return null;
            const larg = modulosOcupados(p);
            return geo.linhas.flatMap((l, f) =>
              l.padrao !== "DIN"
                ? []
                : Array.from({ length: Math.round(l.w / GEO.moduloDIN) - larg + 1 }, (_, pos) =>
                    podeSoltar?.(movendo, f, pos) ? (
                      <rect
                        key={`${f}:${pos}`}
                        x={l.x + pos * GEO.moduloDIN + 1}
                        y={l.y + 2}
                        width={larg * GEO.moduloDIN - 2}
                        height={l.h - 4}
                        rx={2}
                        fill="#22c55e"
                        fillOpacity={0.14}
                        stroke="#22c55e"
                        strokeDasharray="2 1.5"
                        strokeWidth={0.6}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          aoSoltarPeca?.(movendo, f, pos);
                        }}
                      />
                    ) : null,
                  ),
            );
          })()}

        {/* Peças */}
        {comps.map(({ c, p }) => {
          const r = retanguloPeca(dados, c, geo);
          if (!r || !p) return null;
          const nema = padraoDaPeca(p) === "NEMA";
          const t = terminaisDaPeca(p, c);
          const rotulo = c.geral ? "GERAL" : p.tipo === "dr" ? "DR" : p.tipo === "dps" ? "DPS" : p.rotulo;
          const ligado = !desligados?.has(c.id);
          const sel = pecaSelecionada === c.id;
          const arrastavel = Boolean(aoSoltarPeca && sel);
          const fantasma = arrastando?.id === c.id;
          return (
            <g
              key={c.id}
              opacity={fantasma ? 0.35 : 1}
              onClick={aoTocarPeca ? (e) => (e.stopPropagation(), clicouDepoisDeArrastar.current ? (clicouDepoisDeArrastar.current = false) : aoTocarPeca(sel ? null : c.id)) : undefined}
              onPointerDown={
                arrastavel
                  ? (e) => {
                      const pt = paraMM(e);
                      if (!pt) return;
                      e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
                      setArraste({ id: c.id, dx: pt.x - (r.x + r.w / 2), dy: pt.y - (r.y + r.h / 2), p: pt, alvo: null, moveu: false });
                    }
                  : undefined
              }
              style={arrastavel ? { touchAction: "none", cursor: "grab" } : aoTocarPeca ? { cursor: "pointer" } : undefined}
            >
              {nema ? (
                <>
                  <rect x={r.x + 0.6} y={r.y + 0.6} width={r.w - 1.2} height={r.h - 1.2} rx={1.6} fill="#fafafa" stroke="#6b7280" strokeWidth={0.5} />
                  <rect x={r.x + r.w / 2 - 10} y={r.y + r.h / 2 - 4} width={20} height={8} rx={1.4} fill={ligado ? "#1f2937" : "#16a34a"} />
                  <text x={r.x + 8} y={r.y + r.h / 2 + 1.5} fontSize={4} fontWeight={700} fill="#111827">
                    {rotulo}
                  </text>
                  {sel && <rect x={r.x - 0.6} y={r.y - 0.6} width={r.w + 1.2} height={r.h + 1.2} rx={2} fill="none" stroke="#f59e0b" strokeWidth={1.2} />}
                </>
              ) : (
                <PecaSVG
                  peca={p}
                  x={r.x}
                  y={r.y}
                  w={r.w}
                  h={r.h}
                  fases={c.fases}
                  coresFase={coresFase}
                  geral={c.geral}
                  ligado={ligado}
                  energizada={energia ? energia.pecas.has(c.id) : undefined}
                  destaque={sel ? "selecionado" : null}
                  aoAlavanca={aoAlavanca && p.tipo !== "dps" ? () => aoAlavanca(c.id) : undefined}
                  aoTeste={aoTesteDR && p.tipo === "dr" ? () => aoTesteDR(c.id) : undefined}
                />
              )}
              {/* Números dos terminais */}
              {!sim &&
                [...t.linha, ...t.carga].map((term) => {
                  const xy = posicaoTerminal(dados, c, term, geo);
                  if (!xy || nema) return null;
                  const emCima = term.lado === "linha";
                  return (
                    <text key={term.t} x={xy.x + 3.3} y={emCima ? xy.y - 2.6 : xy.y + 4.2} fontSize={2.6} textAnchor="middle" fontWeight={700} fill="#1f2937">
                      {term.t}
                    </text>
                  );
                })}
              {!nema && resultado.nomes.get(c.id) && !sim && (
                <text x={r.x + r.w / 2} y={r.y + r.h + 4.2} fontSize={Math.min(3, r.w / 5)} textAnchor="middle" fill="#6b7280">
                  {(resultado.nomes.get(c.id) ?? "").replace("Disjuntor ", "")}
                </text>
              )}
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
          const vivo = !energia || energia.ligacoes.has(pt.id);
          const dentes = Array.from({ length: pt.modulos }, (_, i) => ({ x: l.x + (pt.posicao + i + 0.5) * GEO.moduloDIN, f: pt.fases[i % pt.fases.length] }));
          return (
            <g key={pt.id} opacity={(selecionada ? (selecionada === pt.id ? 1 : 0.25) : 1) * (vivo ? 1 : 0.45)}>
              <rect x={x0} y={y - 4.2} width={x1 - x0} height={3} rx={0.8} fill="#9a3412" stroke="#431407" strokeWidth={0.3} />
              {dentes.map((d, i) => (
                <g key={i}>
                  <rect x={d.x - 0.8} y={y - 1.4} width={1.6} height={2.4} fill="#c2410c" />
                  <circle cx={d.x} cy={y - 2.7} r={0.9} fill={hex(resultado.cores[d.f])} stroke="#111" strokeWidth={0.2} />
                </g>
              ))}
              {!sim && (
                <text x={x0} y={y - 5.2} fontSize={2.6} fill="#7c2d12" fontWeight={700}>
                  pente {pt.tipo}
                </text>
              )}
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
              {Array.from({ length: Math.max(b.bornes, 3) }).map((_, i) => {
                const cx = b.vertical ? b.x + 4 : b.x + GEO.bornePasso * (i + 1) - 2;
                const cy = b.vertical ? b.y + GEO.bornePasso * (i + 1) - 2 : b.y + 4;
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r={2} fill={i < b.bornes ? "url(#pc-parafuso)" : "#94a3b8"} stroke="#1f2937" strokeWidth={0.3} />
                    {i < b.bornes && <path d={`M${cx - 1.2} ${cy}h2.4M${cx} ${cy - 1.2}v2.4`} stroke="#374151" strokeWidth={0.35} />}
                  </g>
                );
              })}
              <text
                x={b.vertical ? b.x : b.x + 2}
                y={b.vertical ? b.y - 2 : b.y + GEO.alturaBarra - 2}
                fontSize={2.8}
                fontWeight={700}
                fill={b.vertical ? corTexto : "#fff"}
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
              <text x={tx} y={ty} fontSize={2.8} textAnchor="middle" fontWeight={700} fill={corTexto} opacity={opac(s.id) * (comTensao(l) ? 1 : 0.4)}>
                {s.rotulo}
              </text>
            </g>
          );
        })}

        {/* Ponteiras (terminais tubulares) nas pontas que entram em borne */}
        {rotas.map((r) => {
          const l = porId.get(r.id);
          if (!l || !comPonteira(l) || r.pontos.length < 2) return null;
          const n = r.pontos.length;
          return (
            <g key={`pt:${r.id}`}>
              {(l.de.k === "term" || l.de.k === "barra") && ponteira(l, r.pontos[0], r.pontos[1], "a")}
              {(l.para.k === "term" || l.para.k === "barra") && ponteira(l, r.pontos[n - 1], r.pontos[n - 2], "b")}
            </g>
          );
        })}
        {saidas.map((s) => {
          const l = porId.get(s.id);
          if (!l || !comPonteira(l) || (l.de.k !== "term" && l.de.k !== "barra")) return null;
          return ponteira(l, { x: s.x, y: s.y }, { x: s.x + s.dx, y: s.y + s.dy }, `ps:${s.id}`);
        })}

        {/* Peça sendo arrastada + destino de encaixe */}
        {arrastando &&
          (() => {
            const c = dados.componentes.find((x) => x.id === arrastando.id);
            const p = c && peca(c.pecaId);
            const r = c && retanguloPeca(dados, c, geo);
            if (!c || !p || !r) return null;
            const alvo = arrastando.alvo;
            const la = alvo ? geo.linhas[alvo.fileira] : null;
            const nema = padraoDaPeca(p) === "NEMA";
            const ghost =
              alvo && la
                ? nema
                  ? { x: la.x, y: la.y + alvo.posicao * GEO.posicaoNEMA, w: la.w, h: r.h }
                  : { x: la.x + alvo.posicao * GEO.moduloDIN, y: la.y, w: r.w, h: r.h }
                : null;
            return (
              <g pointerEvents="none">
                {ghost && (
                  <rect
                    x={ghost.x}
                    y={ghost.y}
                    width={ghost.w}
                    height={ghost.h}
                    rx={2}
                    fill={alvo!.ok ? "#22c55e" : "#ef4444"}
                    fillOpacity={0.22}
                    stroke={alvo!.ok ? "#16a34a" : "#dc2626"}
                    strokeWidth={0.8}
                    strokeDasharray="2.5 1.5"
                  />
                )}
                <g transform={`translate(${arrastando.p.x - arrastando.dx - (r.x + r.w / 2)} ${arrastando.p.y - arrastando.dy - (r.y + r.h / 2)})`} opacity={0.85}>
                  {nema ? (
                    <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={1.6} fill="#fafafa" stroke="#f59e0b" strokeWidth={1} />
                  ) : (
                    <PecaSVG peca={p} x={r.x} y={r.y} w={r.w} h={r.h} fases={c.fases} coresFase={coresFase} geral={c.geral} ligado={!desligados?.has(c.id)} destaque="selecionado" />
                  )}
                </g>
              </g>
            );
          })()}

        {destaque && <title>{`${destaque.deTexto} → ${destaque.paraTexto}`}</title>}
      </svg>

      {/* Barrinha de ferramentas sobre a peça selecionada */}
      {ferramentas &&
        pecaSelecionada &&
        !arrastando &&
        (() => {
          const c = dados.componentes.find((x) => x.id === pecaSelecionada);
          const r = c && retanguloPeca(dados, c, geo);
          if (!r) return null;
          const topo = r.y * k;
          const cx = (r.x + r.w / 2) * k;
          return (
            <div className="absolute z-20 -translate-x-1/2 -translate-y-full pb-2" style={{ left: Math.max(90, Math.min(cx, largura * k - 90)), top: Math.max(56, topo) }}>
              {ferramentas}
            </div>
          );
        })()}
    </div>
  );
}
