/**
 * Roteamento dos cabos no desenho de ligações (coordenadas em mm).
 * Cabos andam por "canaletas" horizontais entre os trilhos (uma faixa por cabo)
 * e, quando mudam de canaleta, descem/sobem por raias na lateral esquerda.
 */
import { peca } from "@/lib/eletrica/pecas";
import {
  type Barra,
  GEO,
  geometria,
  layoutBarras,
  type Ligacao,
  type Ponto,
  posicaoPonto,
  terminaisDaPeca,
} from "@/lib/eletrica/ligacoes";
import type { Componente, QuadroDados } from "@/lib/eletrica/tipos";

export interface Rota {
  id: string;
  pontos: { x: number; y: number }[];
}

export interface Saida {
  id: string;
  x: number;
  y: number;
  /** Direção do toco: para baixo (DIN/barras) ou para o lado (NEMA). */
  dx: number;
  dy: number;
  rotulo: string;
}

interface Faixa {
  topo: number;
  base: number;
  ocupacao: [number, number][][];
}

type Encaixe = "cima" | "baixo" | "esquerda" | "direita" | "barraLado" | "entradaBaixo";

export function rotear(q: QuadroDados, ligacoes: Ligacao[], barras: Barra[]) {
  const geo = geometria(q);
  const lay = layoutBarras(q, barras, geo);
  const porId = new Map(
    q.componentes.map((c) => [c.id, { c, p: peca(c.pecaId)! }] as const).filter(([, x]) => Boolean(x.p)),
  );

  // Faixas horizontais livres entre as linhas de peças
  const intervalos = [...new Set(geo.linhas.map((l) => `${l.y}|${l.y + l.h}`))]
    .map((s) => s.split("|").map(Number) as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const faixas: Faixa[] = [];
  let topo = 12;
  for (const [y0, y1] of intervalos) {
    faixas.push({ topo, base: y0 - 3, ocupacao: [] });
    topo = y1 + 3;
  }
  const yBarra = lay.vertical ? NaN : Math.min(...lay.itens.filter((i) => !i.id.startsWith("F:")).map((i) => i.y));
  faixas.push({ topo, base: Number.isFinite(yBarra) ? yBarra - 3 : topo + 34, ocupacao: [] });

  // Raias verticais à esquerda das barras laterais (caixa vertical)
  const raiasDir: [number, number][][] = [];
  const xBarrasLado = Math.min(...lay.itens.filter((i) => i.vertical).map((i) => i.x), Infinity);
  const raiaDireita = (y0: number, y1: number) => {
    const [a, b] = y0 < y1 ? [y0, y1] : [y1, y0];
    let k = 0;
    for (;;) {
      raiasDir[k] ??= [];
      if (!raiasDir[k].some(([c, d]) => a < d + 2 && b > c - 2)) break;
      k++;
    }
    raiasDir[k].push([a, b]);
    return xBarrasLado - 6 - (k % 6) * 2.6;
  };

  const faixaAcima = (y: number) => {
    let melhor = 0;
    faixas.forEach((f, i) => {
      if (f.base <= y + 0.5) melhor = i;
    });
    return melhor;
  };
  const faixaAbaixo = (y: number) => {
    const i = faixas.findIndex((f) => f.topo >= y - 0.5);
    return i < 0 ? faixas.length - 1 : i;
  };

  const pista = (fi: number, x0: number, x1: number) => {
    const f = faixas[fi];
    const [a, b] = x0 < x1 ? [x0, x1] : [x1, x0];
    let k = 0;
    for (;;) {
      f.ocupacao[k] ??= [];
      if (!f.ocupacao[k].some(([c, d]) => a < d + 2 && b > c - 2)) break;
      k++;
    }
    f.ocupacao[k].push([a, b]);
    const passo = 3.2;
    const max = Math.max(1, Math.floor((f.base - f.topo - 4) / passo));
    return f.topo + 3 + (k % max) * passo;
  };

  const raias: [number, number][][] = [];
  const raia = (y0: number, y1: number) => {
    const [a, b] = y0 < y1 ? [y0, y1] : [y1, y0];
    let k = 0;
    for (;;) {
      raias[k] ??= [];
      if (!raias[k].some(([c, d]) => a < d + 2 && b > c - 2)) break;
      k++;
    }
    raias[k].push([a, b]);
    return Math.max(3, GEO.margemX - 8 - k * 3);
  };

  const encaixe = (p: Ponto, xy: { x: number; y: number }): Encaixe => {
    if (p.k === "entrada") return q.modelo.saidaCabos === "cima" ? "baixo" : "entradaBaixo";
    if (p.k === "barra") return lay.vertical && !p.barra.startsWith("F:") ? "barraLado" : "cima";
    if (p.k === "carcaca") return "direita";
    if (p.k === "term") {
      const x = porId.get(p.compId);
      if (!x) return "cima";
      const l = geo.linhas[x.c.fileira];
      const t = terminaisDaPeca(x.p, x.c);
      const term = [...t.linha, ...t.carga].find((z) => z.t === p.t);
      if (l?.padrao === "NEMA") return xy.x < geo.centroNEMA ? "esquerda" : "direita";
      return term?.lado === "carga" ? "baixo" : "cima";
    }
    return "cima";
  };

  const rotas: Rota[] = [];
  const saidas: Saida[] = [];
  const num = new Map(q.circuitos.map((c, i) => [c.id, i + 1]));

  for (const l of ligacoes) {
    if (l.modo === "pente" || l.modo === "barramento") continue;
    const a = posicaoPonto(q, l.de, geo, porId as Map<string, { c: Componente; p: NonNullable<ReturnType<typeof peca>> }>, barras);
    if (!a) continue;
    if (l.para.k === "saida") {
      const e = encaixe(l.de, a);
      const n = num.get(l.para.circuitoId) ?? "?";
      const rot = l.funcao === "F" ? `${n}` : l.funcao === "N" ? `N${n}` : `T${n}`;
      if (e === "barraLado") saidas.push({ id: l.id, x: a.x + GEO.alturaBarra, y: a.y, dx: 14, dy: 0, rotulo: rot });
      else if (e === "esquerda") saidas.push({ id: l.id, x: a.x, y: a.y, dx: -16, dy: 0, rotulo: rot });
      else if (e === "direita") saidas.push({ id: l.id, x: a.x, y: a.y, dx: 16, dy: 0, rotulo: rot });
      else if (l.de.k === "barra") saidas.push({ id: l.id, x: a.x, y: a.y + GEO.alturaBarra, dx: 0, dy: 14, rotulo: rot });
      else saidas.push({ id: l.id, x: a.x, y: a.y, dx: 0, dy: 18, rotulo: rot });
      continue;
    }
    const b = posicaoPonto(q, l.para, geo, porId as Map<string, { c: Componente; p: NonNullable<ReturnType<typeof peca>> }>, barras);
    if (!b) continue;
    const ea = encaixe(l.de, a);
    const eb = encaixe(l.para, b);
    rotas.push({ id: l.id, pontos: caminho(a, ea, b, eb) });
  }

  function faixaDe(xy: { x: number; y: number }, e: Encaixe) {
    if (e === "baixo") return faixaAbaixo(xy.y);
    if (e === "cima") return faixaAcima(xy.y);
    return -1;
  }

  function caminho(a: { x: number; y: number }, ea: Encaixe, b: { x: number; y: number }, eb: Encaixe) {
    // Barras laterais (caixa vertical) e entrada por baixo: chegam pela lateral.
    const especial = (e: Encaixe) => e === "barraLado" || e === "entradaBaixo";
    if (especial(ea) || especial(eb)) {
      const [p, ep, o, eo] = especial(ea) ? [a, ea, b, eb] : [b, eb, a, ea];
      let pts: { x: number; y: number }[];
      if (especial(eo)) {
        // entrada por baixo ↔ barra lateral: sobe direto pelo corredor da barra
        const x = ep === "barraLado" ? raiaDireita(p.y, o.y) : raiaDireita(o.y, p.y);
        pts = [p, { x, y: p.y }, { x, y: o.y }, o];
      } else {
        const fo = faixaDe(o, eo);
        const ty = fo >= 0 ? pista(fo, ep === "barraLado" ? xBarrasLado : GEO.margemX, o.x) : o.y;
        const x = ep === "barraLado" ? raiaDireita(p.y, ty) : raia(p.y, ty);
        pts = [p, { x, y: p.y }, { x, y: ty }, { x: o.x, y: ty }, o];
      }
      return especial(ea) ? pts : pts.reverse();
    }
    // Pontos laterais (NEMA/carcaça): saem para a lateral e entram na raia.
    const lateral = (e: Encaixe) => e === "esquerda" || e === "direita";
    if (lateral(ea) || lateral(eb)) {
      const [p, ep, o, eo] = lateral(ea) ? [a, ea, b, eb] : [b, eb, a, ea];
      const fo = faixaDe(o, eo);
      const xLado = ep === "esquerda" ? Math.min(p.x - 6, raia(p.y, fo >= 0 ? faixas[fo].topo : o.y)) : p.x + 8;
      const ty = fo >= 0 ? pista(fo, xLado, o.x) : o.y;
      const pts = [p, { x: xLado, y: p.y }, { x: xLado, y: ty }, { x: o.x, y: ty }, o];
      return lateral(ea) ? pts : pts.reverse();
    }
    const fa = faixaDe(a, ea);
    const fb = faixaDe(b, eb);
    if (fa === fb) {
      const ty = pista(fa, a.x, b.x);
      return [a, { x: a.x, y: ty }, { x: b.x, y: ty }, b];
    }
    const tyA = pista(fa, Math.min(a.x, GEO.margemX), a.x);
    const tyB = pista(fb, Math.min(b.x, GEO.margemX), b.x);
    const x = raia(tyA, tyB);
    return [a, { x: a.x, y: tyA }, { x, y: tyA }, { x, y: tyB }, { x: b.x, y: tyB }, b];
  }

  return { rotas, saidas, geo, barras: lay };
}
