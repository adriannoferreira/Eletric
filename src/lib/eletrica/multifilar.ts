/**
 * Dados do diagrama MULTIFILAR, derivados das ligações (ligacoes.ts): cada
 * condutor separado — fases, neutro geral, neutros após cada DR (N1, N2…) e PE —
 * com os terminais reais das peças. Assim o multifilar, a vista física de
 * ligações e o unifilar contam sempre a mesma história.
 */
import { analisarQuadro, type AnaliseQuadro } from "./calculo";
import { gerarLigacoes, type Ligacao, poloNeutroDoDR, type ResultadoLigacoes, type TerminalPeca, terminaisDaPeca } from "./ligacoes";
import { type Peca, peca } from "./pecas";
import { type Componente, type Fase, fasesDisponiveis, type QuadroDados } from "./tipos";

export interface PecaMF {
  compId: string;
  nome: string;
  rotulo: string;
  polos: number;
  linha: TerminalPeca[];
  carga: TerminalPeca[];
}

export interface CondutorMF {
  ligacaoId: string;
  funcao: "F" | "N" | "PE";
  fase: Fase | null;
  /** Barramento de onde sai: "R", "N", "N1", "PE"… */
  barra: string;
  cor: string;
  secao: number;
}

export interface ColunaMF {
  circuitoId: string;
  numero: number;
  nome: string;
  potenciaW: number;
  ligacao: string;
  disjuntor: PecaMF | null;
  condutores: CondutorMF[];
}

export interface GrupoMF {
  /** DR que protege o grupo (null = circuitos sem DR parcial). */
  dr: PecaMF | null;
  /** Nome do neutro após o DR (N1, N2…) ou "N". */
  neutro: string;
  fases: Fase[];
  colunas: ColunaMF[];
}

export interface Multifilar {
  fases: Fase[];
  geral: PecaMF | null;
  drGeral: PecaMF | null;
  dps: (PecaMF & { fase: Fase | null })[];
  grupos: GrupoMF[];
  neutros: string[];
  ligacoes: ResultadoLigacoes;
}

function pecaMF(c: Componente, p: Peca, nomes: Map<string, string>): PecaMF {
  const t = terminaisDaPeca(p, c);
  return { compId: c.id, nome: nomes.get(c.id) ?? p.nome, rotulo: p.rotulo, polos: p.polos, linha: t.linha, carga: t.carga };
}

export function gerarMultifilar(q: QuadroDados, analise: AnaliseQuadro = analisarQuadro(q)): Multifilar {
  const lig = gerarLigacoes(q, analise);
  const comps = q.componentes.map((c) => ({ c, p: peca(c.pecaId) })).filter((x): x is { c: Componente; p: Peca } => Boolean(x.p));
  const geralC = comps.find((x) => x.c.geral && (x.p.tipo === "disjuntor" || x.p.tipo === "seccionadora"));
  const drGeralC = comps.find((x) => x.c.geral && x.p.tipo === "dr");
  const drs = comps.filter((x) => x.p.tipo === "dr" && !x.c.geral);

  // Nome dos neutros após cada DR, na ordem dos DRs.
  const nomeNeutro = new Map<string, string>();
  let k = 0;
  for (const d of drs) if (poloNeutroDoDR(d.p, d.c)) nomeNeutro.set(d.c.id, `N${++k}`);
  const barraParaNome = (b: string) => (b === "N" || b === "PE" ? b : b.startsWith("N:") ? (nomeNeutro.get(b.slice(2)) ?? "N") : b);

  const saidas = lig.ligacoes.filter((l) => l.para.k === "saida");
  const condutor = (l: Ligacao): CondutorMF => {
    let barra = l.funcao === "PE" ? "PE" : l.funcao === "N" ? "N" : (l.fase ?? "R");
    if (l.funcao === "N" && l.de.k === "barra") barra = barraParaNome(l.de.barra);
    if (l.funcao === "N" && l.de.k === "term") barra = nomeNeutro.get(l.de.compId) ?? "N";
    return { ligacaoId: l.id, funcao: l.funcao, fase: l.fase, barra, cor: l.cor, secao: l.secao };
  };

  const coluna = (circId: string): ColunaMF => {
    const i = q.circuitos.findIndex((c) => c.id === circId);
    const circ = q.circuitos[i];
    const dj = comps.find((x) => x.c.circuitoId === circId && x.p.tipo === "disjuntor");
    return {
      circuitoId: circId,
      numero: i + 1,
      nome: circ.nome,
      potenciaW: circ.potenciaW,
      ligacao: circ.ligacao,
      disjuntor: dj ? pecaMF(dj.c, dj.p, lig.nomes) : null,
      condutores: saidas.filter((l) => (l.para.k === "saida" ? l.para.circuitoId : null) === circId).map(condutor),
    };
  };

  const grupos: GrupoMF[] = [];
  const usados = new Set<string>();
  for (const d of drs) {
    const circs = q.circuitos.filter((c) => c.drId === d.c.id);
    circs.forEach((c) => usados.add(c.id));
    grupos.push({
      dr: pecaMF(d.c, d.p, lig.nomes),
      neutro: nomeNeutro.get(d.c.id) ?? "N",
      fases: d.c.fases,
      colunas: circs.map((c) => coluna(c.id)),
    });
  }
  const livres = q.circuitos.filter((c) => !usados.has(c.id));
  if (livres.length) grupos.push({ dr: null, neutro: "N", fases: fasesDisponiveis(q.alimentacao), colunas: livres.map((c) => coluna(c.id)) });

  return {
    fases: fasesDisponiveis(q.alimentacao),
    geral: geralC ? pecaMF(geralC.c, geralC.p, lig.nomes) : null,
    drGeral: drGeralC ? pecaMF(drGeralC.c, drGeralC.p, lig.nomes) : null,
    dps: comps.filter((x) => x.p.tipo === "dps").map((x) => ({ ...pecaMF(x.c, x.p, lig.nomes), fase: x.c.fases[0] ?? null })),
    grupos,
    neutros: ["N", ...nomeNeutro.values()],
    ligacoes: lig,
  };
}

/** Todos os bornes (peça.terminal) desenhados no multifilar. */
export function bornesDoMultifilar(m: Multifilar) {
  const s = new Set<string>();
  const add = (p: PecaMF | null) => p && [...p.linha, ...p.carga].forEach((t) => s.add(`${p.compId}.${t.t}`));
  add(m.geral);
  add(m.drGeral);
  m.dps.forEach(add);
  for (const g of m.grupos) {
    add(g.dr);
    g.colunas.forEach((c) => add(c.disjuntor));
  }
  return s;
}
