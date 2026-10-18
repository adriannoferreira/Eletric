/**
 * Lógica do modo simulador do quadro: ponteiras por bitola, energização dos
 * cabos (liga/desliga das peças) e inversão de alimentação.
 * Tudo puro — o estado liga/desliga é só visual e não altera o projeto.
 */
import { chavePonto, configLigacoes, type Ligacao, type ResultadoLigacoes, terminaisDaPeca } from "./ligacoes";

export {
  CORES_PONTEIRA,
  corPonteira,
  type ItemPonteira,
  PONTEIRAS_CONFERIR,
  ponteirasPorBitola,
  pontasComPonteira,
} from "./ligacoes";
import { peca } from "./pecas";
import type { QuadroDados } from "./tipos";

// ---------------------------------------------------------------------------
// Energização (liga/desliga visual)
// ---------------------------------------------------------------------------

export interface Energizacao {
  /** Ligações com tensão (fase ou neutro de circuito em uso). */
  ligacoes: Set<string>;
  /** Peças com tensão chegando na entrada (linha). */
  pecas: Set<string>;
}

/**
 * Propaga a tensão a partir da entrada da concessionária. Cabos conduzem nos
 * dois sentidos; uma peça ligada conecta linha↔carga de cada polo; desligada,
 * interrompe todos os polos (inclusive o neutro do DR). Pentes interligam as
 * entradas de mesma fase; barras interligam todos os seus bornes. O DPS não
 * conduz (fica entre fase e PE). Neutro de circuito só "acende" se alguma fase
 * daquele circuito tiver tensão (sem corrente, sem fluxo). PE nunca é marcado.
 */
export function energizacao(q: QuadroDados, r: ResultadoLigacoes, desligados: ReadonlySet<string> = new Set()): Energizacao {
  const adj = new Map<string, Set<string>>();
  const liga = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  };
  // Barras: todos os bornes no mesmo nó
  const no = (p: Ligacao["de"]) => (p.k === "barra" ? `B:${p.barra}` : chavePonto(p));

  for (const l of r.ligacoes) {
    if (l.modo === "pente" || l.funcao === "PE") continue;
    liga(no(l.de), no(l.para));
  }
  const termos = new Map<string, ReturnType<typeof terminaisDaPeca>>();
  for (const c of q.componentes) {
    const p = peca(c.pecaId);
    if (!p) continue;
    const t = terminaisDaPeca(p, c);
    termos.set(c.id, t);
    if (p.tipo === "dps" || desligados.has(c.id)) continue;
    for (const a of t.linha) {
      const b = t.carga.find((x) => x.polo === a.polo);
      if (b) liga(`${c.id}.${a.t}`, `${c.id}.${b.t}`);
    }
  }
  for (const pt of r.pentes) {
    for (const f of pt.fases) {
      const nos = pt.compIds.flatMap((id) => (termos.get(id)?.linha ?? []).filter((x) => x.fase === f).map((x) => `${id}.${x.t}`));
      for (let i = 1; i < nos.length; i++) liga(nos[0], nos[i]);
    }
  }

  const visitados = new Set<string>();
  const fila = (["R", "S", "T", "N"] as const).map((c) => `E:${c}`).filter((k) => adj.has(k));
  for (const k of fila) visitados.add(k);
  while (fila.length) {
    const a = fila.shift()!;
    for (const b of adj.get(a) ?? []) {
      if (visitados.has(b)) continue;
      visitados.add(b);
      fila.push(b);
    }
  }

  const ligacoes = new Set<string>();
  const circuitosComFase = new Set<string>();
  for (const l of r.ligacoes) {
    if (l.funcao !== "F" || l.modo === "pente") continue;
    if (visitados.has(no(l.de)) && visitados.has(no(l.para))) {
      ligacoes.add(l.id);
      if (l.para.k === "saida") circuitosComFase.add(l.para.circuitoId);
    }
  }
  for (const l of r.ligacoes) {
    if (l.funcao !== "N") continue;
    if (!visitados.has(no(l.de)) || !visitados.has(no(l.para))) continue;
    if (l.para.k === "saida" && !circuitosComFase.has(l.para.circuitoId)) continue;
    ligacoes.add(l.id);
  }
  // Pente: energizado se o primeiro terminal de entrada tiver tensão
  for (const pt of r.pentes) {
    const t = termos.get(pt.compIds[0]);
    if (t?.linha.some((x) => visitados.has(`${pt.compIds[0]}.${x.t}`))) ligacoes.add(pt.id);
  }

  const pecas = new Set<string>();
  for (const [id, t] of termos) if (t.linha.some((x) => visitados.has(`${id}.${x.t}`))) pecas.add(id);
  return { ligacoes, pecas };
}

/** Peças que interrompem a alimentação quando desligadas (o DPS não tem alavanca de manobra). */
export function temAlavanca(pecaId: string) {
  const p = peca(pecaId);
  return Boolean(p && p.tipo !== "dps");
}

// ---------------------------------------------------------------------------
// Ajustes de peça
// ---------------------------------------------------------------------------

/** Liga/desliga o ajuste "inverter alimentação" (entrada pelos terminais de baixo). */
export function alternarInverter(q: QuadroDados, compId: string): QuadroDados {
  const cfg = configLigacoes(q);
  const atual = cfg.pecas[compId] ?? { jumper: false, inverter: false };
  const novo = { ...atual, inverter: !atual.inverter };
  const pecas = { ...cfg.pecas };
  if (!novo.jumper && !novo.inverter) delete pecas[compId];
  else pecas[compId] = novo;
  return { ...q, ligacoes: { ...cfg, pecas } };
}
