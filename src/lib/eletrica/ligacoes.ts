/**
 * Ligações internas do quadro de distribuição: terminais de cada peça (marcação
 * IEC/NBR — linha nos ímpares 1/3/5, carga nos pares 2/4/6, N/N' no neutro do DR),
 * barras de neutro (geral e uma por DR), barra PE, pentes e a entrada vinda do
 * padrão. Gera automaticamente a lista de cabos (origem → destino, cor, seção,
 * comprimento, terminal) a partir do QuadroDados e verifica erros de ligação.
 *
 * Tudo aqui é função pura (sem React) — usada pelo construtor, PDF, compras e testes.
 */
import { type Alerta, analisarQuadro, type AnaliseQuadro, listaMateriais, secaoProtecao, type ItemMaterial } from "./calculo";
import { linhasDoModelo } from "./caixas";
import { modulosOcupados, padraoDaPeca, peca, type Peca } from "./pecas";
import { capacidadeTabela36, SECOES } from "./tabelas";
import {
  type Componente,
  CORES_PADRAO,
  type CoresCabo,
  type Fase,
  fasesDisponiveis,
  LigacoesConfigSchema,
  type LigacoesConfig,
  type QuadroDados,
} from "./tipos";

// ---------------------------------------------------------------------------
// Cores
// ---------------------------------------------------------------------------

export const CORES_CABO: Record<string, { nome: string; hex: string; borda?: string }> = {
  preto: { nome: "Preto", hex: "#111827" },
  vermelho: { nome: "Vermelho", hex: "#dc2626" },
  branco: { nome: "Branco", hex: "#f8fafc", borda: "#64748b" },
  marrom: { nome: "Marrom", hex: "#7c4a1e" },
  cinza: { nome: "Cinza", hex: "#6b7280" },
  amarelo: { nome: "Amarelo", hex: "#eab308" },
  laranja: { nome: "Laranja", hex: "#f97316" },
  violeta: { nome: "Violeta", hex: "#7c3aed" },
  azul: { nome: "Azul-claro", hex: "#38bdf8" },
  verde: { nome: "Verde", hex: "#16a34a" },
  "verde-amarelo": { nome: "Verde-amarelo", hex: "#16a34a", borda: "#facc15" },
};

/** NBR 5410 6.1.5.3: azul-claro é do neutro e verde/verde-amarelo do PE — não podem ser usados em fase. */
export const CORES_PROIBIDAS_FASE = ["azul", "verde", "verde-amarelo"];
export const CORES_PE = ["verde-amarelo", "verde"];
export const CORES_NEUTRO = ["azul"];

export function nomeCor(c: string) {
  return CORES_CABO[c]?.nome ?? c;
}

/** Configuração efetiva (com padrões) — aceita quadros antigos sem `ligacoes`. */
export function configLigacoes(q: QuadroDados): LigacoesConfig {
  return q.ligacoes ?? LigacoesConfigSchema.parse({});
}

export function corDaFase(cores: CoresCabo, f: Fase) {
  return cores[f];
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type Condutor = "R" | "S" | "T" | "N" | "PE";
export type Funcao = "F" | "N" | "PE";

export type Ponto =
  | { k: "entrada"; condutor: Condutor }
  | { k: "term"; compId: string; t: string }
  | { k: "barra"; barra: string; borne: number }
  | { k: "saida"; circuitoId: string; condutor: Funcao; fase: Fase | null }
  | { k: "carcaca" };

export type Modo = "cabo" | "pente" | "ponte" | "barramento" | "saida";

export interface Ligacao {
  id: string;
  ordem: number;
  etapa: string;
  de: Ponto;
  para: Ponto;
  funcao: Funcao;
  fase: Fase | null;
  cor: string;
  secao: number;
  comprimentoM: number;
  /** Terminal/ponteira sugerida. */
  terminal: string;
  modo: Modo;
  circuitoId: string | null;
  deTexto: string;
  paraTexto: string;
  obs?: string;
  /** Seção mínima exigida pela proteção a montante (para verificação). */
  secaoMinima?: number;
  ajustada?: boolean;
}

export interface Pente {
  id: string;
  fileira: number;
  /** Primeiro módulo e nº de módulos cobertos. */
  posicao: number;
  modulos: number;
  fases: Fase[];
  tipo: "monofásico" | "bifásico" | "trifásico";
  compIds: string[];
  montante: string;
}

export interface Barra {
  id: string;
  nome: string;
  funcao: "N" | "PE";
  /** DR dono da barra (barras de neutro após o DR). */
  drId: string | null;
  bornes: number;
}

export interface TerminalPeca {
  t: string;
  /** Índice do polo (posição horizontal). */
  polo: number;
  lado: "linha" | "carga";
  funcao: "F" | "N" | "L" | "PE";
  fase: Fase | null;
}

export interface ResultadoLigacoes {
  ligacoes: Ligacao[];
  pentes: Pente[];
  barras: Barra[];
  alertas: Alerta[];
  nomes: Map<string, string>;
  cores: CoresCabo;
  /** Seção dos cabos de entrada/alimentação interna (mm²). */
  secaoEntrada: number;
}

// ---------------------------------------------------------------------------
// Terminais de cada peça
// ---------------------------------------------------------------------------

/**
 * Terminais conforme a marcação de mercado (IEC 60898/61008): linha em cima
 * (1, 3, 5 / N), carga embaixo (2, 4, 6 / N'). DR: o último polo é o do neutro.
 * DPS: L em cima, terra embaixo. NEMA: linha no barramento (B).
 */
export function terminaisDaPeca(p: Peca, c: Pick<Componente, "fases">): { linha: TerminalPeca[]; carga: TerminalPeca[] } {
  const linha: TerminalPeca[] = [];
  const carga: TerminalPeca[] = [];
  if (p.tipo === "dps") {
    const f = c.fases[0] ?? null;
    linha.push({ t: "L", polo: 0, lado: "linha", funcao: f ? "F" : "N", fase: f });
    carga.push({ t: "PE", polo: 0, lado: "carga", funcao: "PE", fase: null });
    return { linha, carga };
  }
  if (p.tipo === "dr") {
    const usoN = poloNeutroDoDR(p, c);
    for (let i = 0; i < p.polos; i++) {
      const ehN = i === p.polos - 1;
      const fase = ehN ? (usoN ? null : (c.fases[i] ?? null)) : (c.fases[i] ?? null);
      const funcao = ehN && usoN ? "N" : "F";
      linha.push({ t: ehN ? "N" : String(2 * i + 1), polo: i, lado: "linha", funcao, fase });
      carga.push({ t: ehN ? "N'" : String(2 * i + 2), polo: i, lado: "carga", funcao, fase });
    }
    return { linha, carga };
  }
  const nema = padraoDaPeca(p) === "NEMA";
  for (let i = 0; i < p.polos; i++) {
    const fase = c.fases[i] ?? null;
    linha.push({ t: nema ? `B${i + 1}` : String(2 * i + 1), polo: i, lado: "linha", funcao: "F", fase });
    carga.push({ t: String(2 * i + 2), polo: i, lado: "carga", funcao: "F", fase });
  }
  return { linha, carga };
}

/** O polo N do DR está livre para o neutro? (DR 2P usado entre duas fases não tem.) */
export function poloNeutroDoDR(p: Peca, c: Pick<Componente, "fases">) {
  return c.fases.length < p.polos;
}

// ---------------------------------------------------------------------------
// Seções
// ---------------------------------------------------------------------------

/** Menor seção (Tabela 36, método B1) que conduz a corrente dada. */
export function secaoParaCorrente(correnteA: number, carregados: 2 | 3 = 2) {
  for (const s of SECOES) {
    const iz = capacidadeTabela36(s, "B1", carregados) ?? 0;
    if (iz >= correnteA) return s;
  }
  return SECOES[SECOES.length - 1];
}

export function capacidadeB1(secao: number, carregados: 2 | 3 = 2) {
  return capacidadeTabela36(secao, "B1", carregados) ?? 0;
}

/** Seção mínima dos condutores de ligação do DPS (classe II) — conferir na edição vigente da norma e no fabricante. */
export const SECAO_DPS = 4;

function ponteira(secao: number) {
  return `Ponteira tubular (ilhós) ${fmt(secao)} mm²`;
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

// ---------------------------------------------------------------------------
// Geometria (mm) — usada para estimar comprimentos e para o desenho
// ---------------------------------------------------------------------------

export const GEO = {
  margemX: 46,
  topo: 70,
  /** Altura da peça DIN (mm aproximado). */
  alturaPeca: 90,
  /** Espaço entre trilhos (canaleta). */
  canaleta: 40,
  moduloDIN: 18,
  posicaoNEMA: 25.4,
  larguraNEMA: 120,
  barramentoNEMA: 26,
  bornePasso: 12,
  alturaBarra: 14,
} as const;

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Posição (mm) de cada linha do quadro e de cada peça. */
export function geometria(q: QuadroDados) {
  const linhas = linhasDoModelo(q.modelo);
  const nema = q.modelo.padrao === "NEMA";
  const linhasY: { y: number; h: number; x: number; w: number; padrao: "DIN" | "NEMA" }[] = [];
  let y = GEO.topo;
  let larguraUtil = 0;
  if (nema) {
    const aux = linhas.find((l) => l.auxiliar);
    const colunas = linhas.filter((l) => !l.auxiliar);
    const auxY = y;
    if (aux) y += GEO.alturaPeca + GEO.canaleta;
    const altCol = colunas[0] ? colunas[0].modulos * GEO.posicaoNEMA : 0;
    const centro = GEO.margemX + GEO.larguraNEMA + GEO.barramentoNEMA / 2;
    colunas.forEach((_, i) => {
      linhasY.push({
        y,
        h: altCol,
        x: i === 0 ? GEO.margemX : centro + GEO.barramentoNEMA / 2,
        w: GEO.larguraNEMA,
        padrao: "NEMA",
      });
    });
    larguraUtil = GEO.larguraNEMA * 2 + GEO.barramentoNEMA;
    if (aux) {
      linhasY.push({ y: auxY, h: GEO.alturaPeca, x: GEO.margemX, w: aux.modulos * GEO.moduloDIN, padrao: "DIN" });
      larguraUtil = Math.max(larguraUtil, aux.modulos * GEO.moduloDIN);
    }
    y += altCol + GEO.canaleta;
  } else {
    for (const l of linhas) {
      linhasY.push({ y, h: GEO.alturaPeca, x: GEO.margemX, w: l.modulos * GEO.moduloDIN, padrao: "DIN" });
      larguraUtil = Math.max(larguraUtil, l.modulos * GEO.moduloDIN);
      y += GEO.alturaPeca + GEO.canaleta;
    }
  }
  return { linhas: linhasY, larguraUtil, yBarras: y, nema, centroNEMA: GEO.margemX + GEO.larguraNEMA + GEO.barramentoNEMA / 2 };
}

/** Retângulo da peça. NEMA: deitada na coluna, linha voltada para o barramento central. */
export function retanguloPeca(q: QuadroDados, c: Componente, geo = geometria(q)): Retangulo | null {
  const p = peca(c.pecaId);
  const l = geo.linhas[c.fileira];
  if (!p || !l) return null;
  if (l.padrao === "NEMA") {
    return { x: l.x, y: l.y + c.posicao * GEO.posicaoNEMA, w: l.w, h: modulosOcupados(p) * GEO.posicaoNEMA };
  }
  return { x: l.x + c.posicao * GEO.moduloDIN, y: l.y, w: modulosOcupados(p) * GEO.moduloDIN, h: GEO.alturaPeca };
}

/** Coordenada (mm) de um terminal da peça. */
export function posicaoTerminal(q: QuadroDados, c: Componente, t: TerminalPeca, geo = geometria(q)) {
  const r = retanguloPeca(q, c, geo);
  const p = peca(c.pecaId);
  if (!r || !p) return null;
  const l = geo.linhas[c.fileira];
  if (l?.padrao === "NEMA") {
    const esquerda = l.x < geo.centroNEMA;
    const yPolo = r.y + (t.polo + 0.5) * GEO.posicaoNEMA;
    // linha: no barramento (lado de dentro); carga: borne do lado de fora
    const xLinha = esquerda ? r.x + r.w : r.x;
    const xCarga = esquerda ? r.x + 6 : r.x + r.w - 6;
    return { x: t.lado === "linha" ? xLinha : xCarga, y: yPolo };
  }
  const polos = p.tipo === "dps" ? 1 : p.polos;
  const larguraPolo = (p.modulos * GEO.moduloDIN) / polos;
  const x = r.x + (t.polo + 0.5) * larguraPolo;
  return { x, y: t.lado === "linha" ? r.y + 7 : r.y + r.h - 7 };
}

// ---------------------------------------------------------------------------
// Geração
// ---------------------------------------------------------------------------

interface Fonte {
  /** "entrada" | id do componente | "barramento" (NEMA). */
  id: string;
  /** Terminal de saída para cada fase. */
  saidaFase: (f: Fase) => Ponto | null;
  /** Proteção a montante (corrente nominal) que define a seção mínima. */
  inMontante: number | null;
}

/** Nome legível de cada peça ("Disjuntor geral", "DR 1", "Disjuntor C3"…). */
export function nomesDasPecas(q: QuadroDados) {
  const nomes = new Map<string, string>();
  let nDR = 0;
  const num = new Map(q.circuitos.map((c, i) => [c.id, i + 1]));
  const ordenados = [...q.componentes].sort((a, b) => a.fileira - b.fileira || a.posicao - b.posicao);
  for (const c of ordenados) {
    const p = peca(c.pecaId);
    if (!p) continue;
    if (p.tipo === "dr") {
      nDR++;
      nomes.set(c.id, c.geral ? `DR geral (${c.etiqueta || `DR ${nDR}`})` : c.etiqueta || `DR ${nDR}`);
    } else if (c.geral) nomes.set(c.id, p.tipo === "seccionadora" ? "Seccionadora geral" : "Disjuntor geral");
    else if (p.tipo === "dps") nomes.set(c.id, `DPS ${c.fases[0] ?? "N"}`);
    else if (c.circuitoId && num.has(c.circuitoId)) nomes.set(c.id, `Disjuntor C${num.get(c.circuitoId)}`);
    else nomes.set(c.id, `${p.tipo === "seccionadora" ? "Seccionadora" : "Disjuntor"} ${p.rotulo} (T${c.fileira + 1}.${c.posicao + 1})`);
  }
  return nomes;
}

export function descreverPonto(p: Ponto, nomes: Map<string, string>, barras: Barra[], num: Map<string, number>) {
  switch (p.k) {
    case "entrada":
      return p.condutor === "PE" ? "Entrada — PE vindo do aterramento (haste)" : `Entrada (medidor/padrão) — ${p.condutor === "N" ? "neutro" : `fase ${p.condutor}`}`;
    case "term":
      return `${nomes.get(p.compId) ?? "Peça"}, terminal ${p.t}`;
    case "barra":
      return `${barras.find((b) => b.id === p.barra)?.nome ?? p.barra}, borne ${p.borne}`;
    case "saida":
      return `Saída do circuito ${num.get(p.circuitoId) ?? "?"} — ${p.condutor === "F" ? `fase ${p.fase ?? ""}` : p.condutor === "N" ? "neutro" : "PE"}`;
    case "carcaca":
      return "Carcaça/porta metálica do quadro";
  }
}

/**
 * Gera as ligações internas do quadro. A sequência segue a ordem de montagem:
 * PE → entrada → geral → DPS → DRs → pentes/disjuntores → saídas dos circuitos.
 */
export function gerarLigacoes(q: QuadroDados, analise: AnaliseQuadro = analisarQuadro(q)): ResultadoLigacoes {
  const cfg = configLigacoes(q);
  const cores = cfg.cores;
  const nomes = nomesDasPecas(q);
  const num = new Map(q.circuitos.map((c, i) => [c.id, i + 1]));
  const disp = fasesDisponiveis(q.alimentacao);
  const geo = geometria(q);
  const alertas: Alerta[] = [];
  const comps = q.componentes.map((c) => ({ c, p: peca(c.pecaId) })).filter((x): x is { c: Componente; p: Peca } => Boolean(x.p));
  const porId = new Map(comps.map((x) => [x.c.id, x]));

  const geral = comps.find((x) => x.c.geral && (x.p.tipo === "disjuntor" || x.p.tipo === "seccionadora"));
  const drGeral = comps.find((x) => x.c.geral && x.p.tipo === "dr");
  const drs = comps.filter((x) => x.p.tipo === "dr" && !x.c.geral);
  const dpss = comps.filter((x) => x.p.tipo === "dps");
  const nemaBox = q.modelo.padrao === "NEMA";

  const carregados: 2 | 3 = disp.length === 3 ? 3 : 2;
  const inGeral = geral?.p.correnteNominal ?? null;
  const secaoEntrada = inGeral ? secaoParaCorrente(inGeral, carregados) : 10;

  // ---- Barras
  const barras: Barra[] = [{ id: "N", nome: drGeral ? "Barra de neutro (após o DR geral)" : "Barra de neutro geral", funcao: "N", drId: null, bornes: 0 }];
  const comNeutro = (dr: { c: Componente; p: Peca }) => poloNeutroDoDR(dr.p, dr.c);
  for (const d of drs) {
    if (nemaBox) continue; // NEMA: DR por circuito, neutro sai direto do DR
    if (comNeutro(d)) barras.push({ id: `N:${d.c.id}`, nome: `Barra de neutro do ${nomes.get(d.c.id)}`, funcao: "N", drId: d.c.id, bornes: 0 });
  }
  barras.push({ id: "PE", nome: "Barra de terra (PE)", funcao: "PE", drId: null, bornes: 0 });
  const proximoBorne = (id: string) => {
    const b = barras.find((x) => x.id === id)!;
    b.bornes++;
    return b.bornes;
  };

  // ---- Coleta
  const ligacoes: Ligacao[] = [];
  const pentes: Pente[] = [];
  let ordem = 0;
  const pos = (p: Ponto) => posicaoPonto(q, p, geo, porId, barras);
  const comprimento = (a: Ponto, b: Ponto, extra = 0.15) => {
    const pa = pos(a);
    const pb = pos(b);
    if (!pa || !pb) return 0.5;
    const mm = (Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y)) * 1.2;
    return Math.max(0.2, Math.round((mm / 1000 + extra) * 20) / 20);
  };
  const add = (l: Omit<Ligacao, "id" | "ordem" | "deTexto" | "paraTexto" | "comprimentoM" | "terminal"> & { id?: string; comprimentoM?: number; terminal?: string }) => {
    const id = l.id ?? `${chavePonto(l.de)}>${chavePonto(l.para)}`;
    const ajuste = cfg.ajustes[id];
    const cor = ajuste?.cor ?? l.cor;
    const secao = ajuste?.secao ?? l.secao;
    const nova: Ligacao = {
      ...l,
      id,
      ordem: ++ordem,
      cor,
      secao,
      comprimentoM: l.comprimentoM ?? comprimento(l.de, l.para),
      terminal: l.terminal ?? ponteira(secao),
      deTexto: descreverPonto(l.de, nomes, barras, num),
      paraTexto: descreverPonto(l.para, nomes, barras, num),
      ajustada: Boolean(ajuste && (ajuste.cor || ajuste.secao || ajuste.modo)),
    };
    ligacoes.push(nova);
    return nova;
  };
  const corFase = (f: Fase | null) => (f ? cores[f] : cores.R);

  // 1) PE: aterramento → barra PE (e carcaça metálica)
  const secaoPEEntrada = secaoProtecao(secaoEntrada);
  add({
    etapa: "1. Aterramento",
    de: { k: "entrada", condutor: "PE" },
    para: { k: "barra", barra: "PE", borne: proximoBorne("PE") },
    funcao: "PE",
    fase: null,
    cor: cores.PE,
    secao: secaoPEEntrada,
    modo: "cabo",
    circuitoId: null,
    obs: "Condutor de proteção vindo do padrão/haste — seção pela Tabela 58 (conferir a exigência da concessionária para o condutor de aterramento).",
  });
  if (q.modelo.material === "metalico") {
    add({
      etapa: "1. Aterramento",
      de: { k: "barra", barra: "PE", borne: proximoBorne("PE") },
      para: { k: "carcaca" },
      funcao: "PE",
      fase: null,
      cor: cores.PE,
      secao: Math.min(secaoPEEntrada, 6),
      modo: "cabo",
      circuitoId: null,
      obs: "Equipotencialização da caixa e da porta metálica (cordoalha ou cabo com terminal olhal).",
      terminal: "Terminal olhal + ponteira",
    });
  }

  // 2) Entrada → geral (ou DR geral / barramento)
  const entradaFonte: Fonte = {
    id: "entrada",
    saidaFase: (f) => ({ k: "entrada", condutor: f }),
    inMontante: null,
  };
  let fonteGeral = entradaFonte;
  if (geral) {
    const t = terminaisDaPeca(geral.p, geral.c);
    const inv = cfg.pecas[geral.c.id]?.inverter;
    for (const term of inv ? t.carga : t.linha) {
      if (!term.fase) continue;
      add({
        etapa: "2. Entrada → disjuntor geral",
        de: { k: "entrada", condutor: term.fase },
        para: { k: "term", compId: geral.c.id, t: term.t },
        funcao: "F",
        fase: term.fase,
        cor: corFase(term.fase),
        secao: secaoEntrada,
        modo: "cabo",
        circuitoId: null,
        secaoMinima: secaoEntrada,
      });
    }
    fonteGeral = {
      id: geral.c.id,
      saidaFase: (f) => {
        const term = (inv ? t.linha : t.carga).find((x) => x.fase === f);
        return term ? { k: "term", compId: geral.c.id, t: term.t } : null;
      },
      inMontante: inGeral,
    };
  } else {
    alertas.push({ nivel: "aviso", mensagem: "Sem disjuntor geral: a entrada vai direto para as proteções. Confira se o padrão de entrada tem dispositivo de seccionamento." });
  }

  // Neutro de entrada
  let fonteNeutro: Ponto = { k: "entrada", condutor: "N" };
  if (drGeral && comNeutro(drGeral)) {
    add({
      etapa: "2. Entrada → disjuntor geral",
      de: { k: "entrada", condutor: "N" },
      para: { k: "term", compId: drGeral.c.id, t: "N" },
      funcao: "N",
      fase: null,
      cor: cores.N,
      secao: secaoEntrada,
      modo: "cabo",
      circuitoId: null,
      secaoMinima: secaoEntrada,
    });
    add({
      etapa: "2. Entrada → disjuntor geral",
      de: { k: "term", compId: drGeral.c.id, t: "N'" },
      para: { k: "barra", barra: "N", borne: proximoBorne("N") },
      funcao: "N",
      fase: null,
      cor: cores.N,
      secao: secaoEntrada,
      modo: "cabo",
      circuitoId: null,
      secaoMinima: secaoEntrada,
    });
  } else {
    add({
      etapa: "2. Entrada → disjuntor geral",
      de: fonteNeutro,
      para: { k: "barra", barra: "N", borne: proximoBorne("N") },
      funcao: "N",
      fase: null,
      cor: cores.N,
      secao: secaoEntrada,
      modo: "cabo",
      circuitoId: null,
      secaoMinima: secaoEntrada,
    });
  }
  fonteNeutro = { k: "barra", barra: "N", borne: 0 };

  // DR geral: alimentado pelo geral
  let fonteCircuitos: Fonte = fonteGeral;
  if (drGeral) {
    const t = terminaisDaPeca(drGeral.p, drGeral.c);
    alimentarPeca(drGeral, fonteGeral, "3. DR geral");
    fonteCircuitos = {
      id: drGeral.c.id,
      saidaFase: (f) => {
        const term = t.carga.find((x) => x.fase === f);
        return term ? { k: "term", compId: drGeral.c.id, t: term.t } : null;
      },
      inMontante: inGeral,
    };
  }

  // 3) DPS (após o geral) → PE
  for (const d of dpss) {
    const t = terminaisDaPeca(d.p, d.c);
    const L = t.linha[0];
    const origem: Ponto | null = L.fase ? fonteGeral.saidaFase(L.fase) : { k: "barra", barra: "N", borne: proximoBorne("N") };
    if (origem)
      add({
        etapa: "3. DPS",
        de: origem,
        para: { k: "term", compId: d.c.id, t: "L" },
        funcao: L.fase ? "F" : "N",
        fase: L.fase,
        cor: L.fase ? corFase(L.fase) : cores.N,
        secao: Math.min(SECAO_DPS, secaoEntrada),
        modo: "cabo",
        circuitoId: null,
        obs: "Cabo do DPS o mais curto possível (ideal < 0,5 m somando fase e terra). Seção 4 mm² mínima usual para classe II — conferir norma e fabricante.",
      });
    add({
      etapa: "3. DPS",
      de: { k: "term", compId: d.c.id, t: "PE" },
      para: { k: "barra", barra: "PE", borne: proximoBorne("PE") },
      funcao: "PE",
      fase: null,
      cor: cores.PE,
      secao: Math.min(SECAO_DPS, secaoEntrada),
      modo: "cabo",
      circuitoId: null,
    });
  }

  // 4) DRs parciais
  const fonteDR = new Map<string, Fonte>();
  for (const d of drs) {
    const t = terminaisDaPeca(d.p, d.c);
    const protegidos = q.circuitos.filter((c) => c.drId === d.c.id);
    const precisaN = protegidos.some((c) => c.ligacao === "FN" || c.ligacao === "3F");
    if (precisaN && !comNeutro(d)) {
      alertas.push({
        nivel: "erro",
        mensagem: `${nomes.get(d.c.id)} está com todos os polos em fases, mas protege circuito(s) com neutro — o neutro precisa passar pelo DR. Use DR com polo N livre (ex.: 4P) ou separe os circuitos.`,
        referencia: "NBR 5410 5.1.3.2 (DR deve envolver todos os condutores vivos, inclusive o neutro)",
      });
    }
    if (!comNeutro(d) && d.p.polos === 2) {
      alertas.push({
        nivel: "info",
        mensagem: `${nomes.get(d.c.id)} ligado entre duas fases (polo N recebe fase) — usual em 220 V F-F, mas confira se o fabricante permite.`,
      });
    }
    if (nemaBox) continue; // tratado junto com o disjuntor NEMA (DR a jusante)
    alimentarPeca(d, fonteCircuitos, "4. DRs");
    if (comNeutro(d)) {
      add({
        etapa: "4. DRs",
        de: { k: "barra", barra: "N", borne: proximoBorne("N") },
        para: { k: "term", compId: d.c.id, t: "N" },
        funcao: "N",
        fase: null,
        cor: cores.N,
        secao: secaoParaCorrente(Math.min(d.p.correnteNominal ?? 63, inGeral ?? 63)),
        modo: "cabo",
        circuitoId: null,
      });
      add({
        etapa: "4. DRs",
        de: { k: "term", compId: d.c.id, t: "N'" },
        para: { k: "barra", barra: `N:${d.c.id}`, borne: proximoBorne(`N:${d.c.id}`) },
        funcao: "N",
        fase: null,
        cor: cores.N,
        secao: secaoParaCorrente(Math.min(d.p.correnteNominal ?? 63, inGeral ?? 63)),
        modo: "cabo",
        circuitoId: null,
      });
    }
    fonteDR.set(d.c.id, {
      id: d.c.id,
      saidaFase: (f) => {
        const term = t.carga.find((x) => x.fase === f && x.funcao === "F");
        return term ? { k: "term", compId: d.c.id, t: term.t } : null;
      },
      inMontante: inGeral,
    });
  }

  // 5) Disjuntores dos circuitos (e demais), agrupados em pentes por trilho e fonte
  const montante = (x: { c: Componente; p: Peca }): Fonte => {
    const circ = x.c.circuitoId ? q.circuitos.find((c) => c.id === x.c.circuitoId) : undefined;
    if (circ?.drId && fonteDR.has(circ.drId)) return fonteDR.get(circ.drId)!;
    return fonteCircuitos;
  };
  const ramais = comps.filter((x) => (x.p.tipo === "disjuntor" || x.p.tipo === "seccionadora") && !x.c.geral);

  if (nemaBox) {
    // Barramento NEMA alimentado pelo geral (ou DR geral); disjuntores encaixados.
    for (const f of disp) {
      const o = fonteCircuitos.saidaFase(f);
      if (!o) continue;
      add({
        etapa: "5. Barramento e disjuntores",
        de: o,
        para: { k: "barra", barra: `F:${f}`, borne: 1 },
        funcao: "F",
        fase: f,
        cor: corFase(f),
        secao: secaoEntrada,
        modo: "cabo",
        circuitoId: null,
        secaoMinima: secaoEntrada,
        obs: "Terminal de entrada (lug) do barramento NEMA.",
        terminal: "Terminal do barramento (conferir aperto)",
      });
    }
    for (const x of ramais) {
      if (padraoDaPeca(x.p) !== "NEMA") {
        alimentarPeca(x, fonteCircuitos, "5. Barramento e disjuntores");
        continue;
      }
      const t = terminaisDaPeca(x.p, x.c);
      for (const term of t.linha) {
        if (!term.fase) continue;
        add({
          etapa: "5. Barramento e disjuntores",
          de: { k: "barra", barra: `F:${term.fase}`, borne: 1 },
          para: { k: "term", compId: x.c.id, t: term.t },
          funcao: "F",
          fase: term.fase,
          cor: corFase(term.fase),
          secao: 0,
          modo: "barramento",
          circuitoId: x.c.circuitoId,
          comprimentoM: 0,
          terminal: "Encaixe no barramento (plug-in)",
        });
      }
      // DR do circuito em NEMA: a jusante do disjuntor
      const circ = x.c.circuitoId ? q.circuitos.find((c) => c.id === x.c.circuitoId) : undefined;
      const dr = circ?.drId ? porId.get(circ.drId) : undefined;
      if (dr && !dr.c.geral) {
        const outros = q.circuitos.filter((c) => c.drId === dr.c.id);
        if (outros.length > 1) {
          alertas.push({
            nivel: "erro",
            mensagem: `${nomes.get(dr.c.id)} protege ${outros.length} circuitos, mas disjuntores NEMA não podem ser alimentados por um DR. Em caixa NEMA use um DR por circuito (a jusante do disjuntor) ou um DR geral.`,
          });
        } else {
          const td = terminaisDaPeca(dr.p, dr.c);
          for (const term of t.carga) {
            const entradaDR = td.linha.find((z) => z.fase === term.fase && z.funcao === "F") ?? td.linha.find((z) => z.funcao === "F");
            if (!entradaDR) continue;
            add({
              etapa: "5. Barramento e disjuntores",
              de: { k: "term", compId: x.c.id, t: term.t },
              para: { k: "term", compId: dr.c.id, t: entradaDR.t },
              funcao: "F",
              fase: term.fase,
              cor: corFase(term.fase),
              secao: circuitoSecao(circ!.id),
              modo: "cabo",
              circuitoId: circ!.id,
            });
          }
          if (comNeutro(dr))
            add({
              etapa: "5. Barramento e disjuntores",
              de: { k: "barra", barra: "N", borne: proximoBorne("N") },
              para: { k: "term", compId: dr.c.id, t: "N" },
              funcao: "N",
              fase: null,
              cor: cores.N,
              secao: circuitoSecao(circ!.id),
              modo: "cabo",
              circuitoId: circ!.id,
            });
        }
      }
    }
  } else {
    // Sequências contíguas no mesmo trilho com a mesma fonte → pente
    const porFileira = new Map<number, { c: Componente; p: Peca }[]>();
    for (const x of ramais) porFileira.set(x.c.fileira, [...(porFileira.get(x.c.fileira) ?? []), x]);
    for (const [fileira, lista] of [...porFileira].sort((a, b) => a[0] - b[0])) {
      lista.sort((a, b) => a.c.posicao - b.c.posicao);
      let run: { c: Componente; p: Peca }[] = [];
      const fechar = () => {
        if (run.length) tratarSequencia(fileira, run);
        run = [];
      };
      for (const x of lista) {
        const ant = run[run.length - 1];
        const contiguo = ant && ant.c.posicao + modulosOcupados(ant.p) === x.c.posicao;
        if (ant && (!contiguo || montante(ant).id !== montante(x).id)) fechar();
        run.push(x);
      }
      fechar();
    }
  }

  // 6) Saídas dos circuitos (fase, neutro, PE)
  for (const circ of q.circuitos) {
    const n = num.get(circ.id)!;
    const dj = comps.find((x) => x.c.circuitoId === circ.id && x.p.tipo === "disjuntor");
    const secao = circuitoSecao(circ.id);
    const etapa = `6. Saída do circuito ${n}`;
    // Em NEMA com DR a jusante, a fase sai do DR.
    const drNema = nemaBox && circ.drId ? porId.get(circ.drId) : undefined;
    const saidaPeca = drNema && !drNema.c.geral && q.circuitos.filter((c) => c.drId === drNema.c.id).length === 1 ? drNema : dj;
    if (saidaPeca) {
      const t = terminaisDaPeca(saidaPeca.p, saidaPeca.c);
      const inv = cfg.pecas[saidaPeca.c.id]?.inverter;
      const lado = inv ? t.linha : t.carga;
      for (const term of lado.filter((z) => z.funcao === "F")) {
        add({
          etapa,
          de: { k: "term", compId: saidaPeca.c.id, t: term.t },
          para: { k: "saida", circuitoId: circ.id, condutor: "F", fase: term.fase },
          funcao: "F",
          fase: term.fase,
          cor: corFase(term.fase),
          secao,
          modo: "saida",
          circuitoId: circ.id,
          comprimentoM: 0.3,
          secaoMinima: secao,
        });
      }
    }
    if (circ.ligacao === "FN" || circ.ligacao === "3F") {
      let barra = "N";
      const dr = circ.drId ? porId.get(circ.drId) : undefined;
      if (dr && !dr.c.geral && barras.some((b) => b.id === `N:${dr.c.id}`)) barra = `N:${dr.c.id}`;
      const manual = cfg.neutros[circ.id];
      if (manual && barras.some((b) => b.id === manual)) barra = manual;
      const nemaDR = drNema && !drNema.c.geral && saidaPeca === drNema && comNeutro(drNema);
      add({
        etapa,
        id: `N:${circ.id}`,
        de: nemaDR ? { k: "term", compId: drNema.c.id, t: "N'" } : { k: "barra", barra, borne: proximoBorne(barra) },
        para: { k: "saida", circuitoId: circ.id, condutor: "N", fase: null },
        funcao: "N",
        fase: null,
        cor: cores.N,
        secao,
        modo: "saida",
        circuitoId: circ.id,
        comprimentoM: 0.4,
        secaoMinima: secao,
      });
    }
    add({
      etapa,
      id: `PE:${circ.id}`,
      de: { k: "barra", barra: "PE", borne: proximoBorne("PE") },
      para: { k: "saida", circuitoId: circ.id, condutor: "PE", fase: null },
      funcao: "PE",
      fase: null,
      cor: cores.PE,
      secao: secaoProtecao(secao),
      modo: "saida",
      circuitoId: circ.id,
      comprimentoM: 0.4,
    });
  }

  return {
    ligacoes,
    pentes,
    barras,
    alertas: [...alertas, ...verificarLigacoes(q, { ligacoes, pentes, barras, cores, secaoEntrada, nomes }, analise)],
    nomes,
    cores,
    secaoEntrada,
  };

  // ---- auxiliares (usam o escopo acima)

  function circuitoSecao(circuitoId: string) {
    const r = analise.circuitos.find((x) => x.circuito.id === circuitoId);
    return r?.circuito.secaoAdotada ?? r?.dim.secao ?? 2.5;
  }

  /** Alimenta cada polo da peça a partir da fonte (um cabo por fase). */
  function alimentarPeca(x: { c: Componente; p: Peca }, fonte: Fonte, etapa: string) {
    const t = terminaisDaPeca(x.p, x.c);
    const inv = cfg.pecas[x.c.id]?.inverter;
    for (const term of inv ? t.carga : t.linha) {
      if (term.funcao !== "F" || !term.fase) continue;
      const o = fonte.saidaFase(term.fase);
      if (!o) {
        alertas.push({ nivel: "erro", mensagem: `${nomes.get(x.c.id)} ligado na fase ${term.fase}, que não existe na fonte a montante.` });
        continue;
      }
      const sec = fonte.inMontante ? secaoParaCorrente(fonte.inMontante) : secaoEntrada;
      add({
        etapa,
        de: o,
        para: { k: "term", compId: x.c.id, t: term.t },
        funcao: "F",
        fase: term.fase,
        cor: corFase(term.fase),
        secao: sec,
        modo: "cabo",
        circuitoId: x.c.circuitoId,
        secaoMinima: sec,
      });
    }
  }

  /** Sequência contígua no mesmo trilho, mesma fonte: pente se as fases seguirem a ordem; senão pontes. */
  function tratarSequencia(fileira: number, run: { c: Componente; p: Peca }[]) {
    const fonte = montante(run[0]);
    const etapa = fonte.id === fonteCircuitos.id ? "5. Disjuntores (sem DR)" : `5. Disjuntores do ${nomes.get(fonte.id)}`;
    const sec = fonte.inMontante ? secaoParaCorrente(fonte.inMontante) : secaoEntrada;
    const elegiveis = run.filter((x) => !cfg.pecas[x.c.id]?.jumper && !cfg.pecas[x.c.id]?.inverter);
    const idPente = `pente:${fileira}:${run[0].c.id}`;
    const forcarCabo = cfg.ajustes[idPente]?.modo === "cabo";
    const sequencia = fasesEmSequencia(elegiveis);
    const usarPente = !forcarCabo && elegiveis.length >= 2 && sequencia !== null && elegiveis.length === run.length;
    if (usarPente) {
      const ini = run[0].c.posicao;
      const fim = run[run.length - 1].c.posicao + modulosOcupados(run[run.length - 1].p);
      const fases = sequencia!;
      const pente: Pente = {
        id: idPente,
        fileira,
        posicao: ini,
        modulos: fim - ini,
        fases,
        tipo: fases.length === 1 ? "monofásico" : fases.length === 2 ? "bifásico" : "trifásico",
        compIds: run.map((x) => x.c.id),
        montante: fonte.id,
      };
      pentes.push(pente);
      // Um cabo de alimentação por fase até o primeiro terminal daquela fase no pente.
      for (const f of fases) {
        const primeiro = run.map((x) => ({ x, term: terminaisDaPeca(x.p, x.c).linha.find((z) => z.fase === f) })).find((y) => y.term);
        const o = fonte.saidaFase(f);
        if (!primeiro || !o) continue;
        add({
          etapa,
          de: o,
          para: { k: "term", compId: primeiro.x.c.id, t: primeiro.term!.t },
          funcao: "F",
          fase: f,
          cor: corFase(f),
          secao: sec,
          modo: "cabo",
          circuitoId: null,
          secaoMinima: sec,
          obs: `Alimenta o pente ${pente.tipo} (${pente.modulos} módulos).`,
        });
      }
      const primeiroNome = nomes.get(run[0].c.id);
      const ultimoNome = nomes.get(run[run.length - 1].c.id);
      add({
        etapa,
        id: idPente,
        de: { k: "term", compId: run[0].c.id, t: "1" },
        para: { k: "term", compId: run[run.length - 1].c.id, t: "1" },
        funcao: "F",
        fase: null,
        cor: "cinza",
        secao: sec,
        modo: "pente",
        circuitoId: null,
        comprimentoM: (pente.modulos * GEO.moduloDIN) / 1000,
        terminal: `Pente ${pente.tipo} ${pente.modulos} mód. (cortar na medida)`,
        obs: `Pente ${pente.tipo} (${fases.join("-")}) encaixado nos terminais de entrada de ${primeiroNome} até ${ultimoNome}. Capacidade do pente ≥ ${fonte.inMontante ?? "?"} A — conferir catálogo.`,
      });
      return;
    }
    if (elegiveis.length >= 2 && sequencia === null && !forcarCabo) {
      alertas.push({
        nivel: "info",
        mensagem: `Trilho ${fileira + 1}: as fases dos disjuntores ${run.map((x) => nomes.get(x.c.id)).join(", ")} não seguem a sequência de um pente — ligados com cabos (pontes). Use “Ajustar fases ao pente” para reorganizar.`,
      });
    }
    // Pontes: primeiro de cada fase vem da fonte; os seguintes, do terminal anterior da mesma fase.
    const ultimoDaFase = new Map<Fase, Ponto>();
    for (const x of run) {
      const t = terminaisDaPeca(x.p, x.c);
      const inv = cfg.pecas[x.c.id]?.inverter;
      for (const term of inv ? t.carga : t.linha) {
        if (!term.fase) continue;
        const anterior = ultimoDaFase.get(term.fase);
        const o = anterior ?? fonte.saidaFase(term.fase);
        if (!o) continue;
        const destino: Ponto = { k: "term", compId: x.c.id, t: term.t };
        add({
          etapa,
          de: o,
          para: destino,
          funcao: "F",
          fase: term.fase,
          cor: corFase(term.fase),
          secao: sec,
          modo: anterior ? "ponte" : "cabo",
          circuitoId: x.c.circuitoId,
          secaoMinima: sec,
          obs: anterior ? "Ponte (jumper) entre terminais vizinhos da mesma fase." : undefined,
        });
        ultimoDaFase.set(term.fase, destino);
      }
    }
  }
}

/**
 * Fases da sequência se os polos seguirem um pente (padrão cíclico R-S-T…
 * na ordem de aparecimento), ou null se não for possível usar pente.
 */
export function fasesEmSequencia(run: { c: Componente; p: Peca }[]): Fase[] | null {
  if (run.length === 0) return null;
  const polos: (Fase | null)[] = [];
  for (const x of run) {
    const n = x.p.tipo === "dps" ? 1 : x.p.polos;
    for (let i = 0; i < n; i++) polos.push(x.c.fases[i] ?? null);
    // Peças com módulo fracionário (1,5 por polo) quebram o passo do pente.
    if (modulosOcupados(x.p) !== n) return null;
  }
  if (polos.some((f) => !f)) return null;
  const ordem: Fase[] = [];
  for (const f of polos) if (!ordem.includes(f!)) ordem.push(f!);
  for (let i = 0; i < polos.length; i++) if (polos[i] !== ordem[i % ordem.length]) return null;
  return ordem;
}

/**
 * Reatribui as fases dos disjuntores de cada sequência (mesmo trilho, contíguos,
 * mesma fonte) para seguirem um pente (R-S-R-S… ou R-S-T…), usando só as fases
 * que a fonte oferece (ex.: um DR 2P em R só alimenta R). Em cada sequência
 * escolhe a fase inicial que deixa o quadro mais equilibrado.
 */
export function ajustarFasesAoPente(q: QuadroDados): QuadroDados {
  const disp = fasesDisponiveis(q.alimentacao);
  const analise = analisarQuadro(q);
  const ib = new Map(analise.circuitos.map((r) => [r.circuito.id, r.dim.ib]));
  const comps = q.componentes.map((c) => ({ c, p: peca(c.pecaId) })).filter((x): x is { c: Componente; p: Peca } => Boolean(x.p));
  const drGeral = comps.find((x) => x.c.geral && x.p.tipo === "dr");
  const fonteDe = (x: { c: Componente }) => {
    const circ = x.c.circuitoId ? q.circuitos.find((c) => c.id === x.c.circuitoId) : undefined;
    const dr = circ?.drId ? comps.find((y) => y.c.id === circ.drId && !y.c.geral) : undefined;
    return dr ?? drGeral ?? null;
  };
  const fasesDaFonte = (f: { c: Componente; p: Peca } | null): Fase[] => {
    if (!f) return disp;
    const usadas = f.p.tipo === "dr" && poloNeutroDoDR(f.p, f.c) ? f.c.fases : f.c.fases;
    const ok = disp.filter((x) => usadas.includes(x));
    return ok.length ? ok : disp;
  };
  const alvo = comps.filter((x) => (x.p.tipo === "disjuntor" || x.p.tipo === "seccionadora") && !x.c.geral && padraoDaPeca(x.p) === "DIN");
  // Carga atual das peças fora das sequências (geral etc. não somam).
  const carga: Record<Fase, number> = { R: 0, S: 0, T: 0 };
  const novas = new Map<string, Fase[]>();
  const porFileira = new Map<number, typeof alvo>();
  for (const x of alvo) porFileira.set(x.c.fileira, [...(porFileira.get(x.c.fileira) ?? []), x]);
  const sequencias: (typeof alvo)[] = [];
  for (const [, lista] of [...porFileira].sort((a, b) => a[0] - b[0])) {
    lista.sort((a, b) => a.c.posicao - b.c.posicao);
    let run: typeof alvo = [];
    for (const x of lista) {
      const ant = run[run.length - 1];
      if (ant && (ant.c.posicao + modulosOcupados(ant.p) !== x.c.posicao || fonteDe(ant)?.c.id !== fonteDe(x)?.c.id)) {
        sequencias.push(run);
        run = [];
      }
      run.push(x);
    }
    if (run.length) sequencias.push(run);
  }
  // Maiores cargas primeiro, para o equilíbrio ficar melhor.
  const cargaSeq = (r: typeof alvo) => r.reduce((s, x) => s + (x.c.circuitoId ? (ib.get(x.c.circuitoId) ?? 0) : 0), 0);
  sequencias.sort((a, b) => cargaSeq(b) - cargaSeq(a));
  for (const run of sequencias) {
    const fases = fasesDaFonte(fonteDe(run[0]));
    let melhor: { fases: Map<string, Fase[]>; pico: number } | null = null;
    for (let inicio = 0; inicio < fases.length; inicio++) {
      const teste = new Map<string, Fase[]>();
      const c2 = { ...carga };
      let k = inicio;
      for (const x of run) {
        const n = Math.min(x.p.polos, fases.length);
        const fs: Fase[] = [];
        for (let i = 0; i < n; i++) fs.push(fases[(k + i) % fases.length]);
        k += x.p.polos;
        teste.set(x.c.id, fs);
        const i0 = x.c.circuitoId ? (ib.get(x.c.circuitoId) ?? 0) : 0;
        for (const f of fs) c2[f] += i0;
      }
      const pico = Math.max(...disp.map((f) => c2[f]));
      if (!melhor || pico < melhor.pico) melhor = { fases: teste, pico };
    }
    for (const [id, fs] of melhor!.fases) {
      novas.set(id, fs);
      const x = run.find((y) => y.c.id === id)!;
      const i0 = x.c.circuitoId ? (ib.get(x.c.circuitoId) ?? 0) : 0;
      for (const f of fs) carga[f] += i0;
    }
  }
  return { ...q, componentes: q.componentes.map((c) => (novas.has(c.id) ? { ...c, fases: novas.get(c.id)! } : c)) };
}

// ---------------------------------------------------------------------------
// Posição dos pontos (mm)
// ---------------------------------------------------------------------------

export function chavePonto(p: Ponto) {
  switch (p.k) {
    case "entrada":
      return `E:${p.condutor}`;
    case "term":
      return `${p.compId}.${p.t}`;
    case "barra":
      return `B:${p.barra}.${p.borne}`;
    case "saida":
      return `S:${p.circuitoId}.${p.condutor}${p.fase ?? ""}`;
    case "carcaca":
      return "carcaca";
  }
}

/** Larguras/posições das barras (lado a lado, abaixo das peças). */
export function layoutBarras(q: QuadroDados, barras: Barra[], geo = geometria(q)) {
  const nemaFases = geo.nema ? fasesDisponiveis(q.alimentacao) : [];
  const largura = Math.max(geo.larguraUtil, 160);
  const itens: { id: string; x: number; y: number; w: number; bornes: number }[] = [];
  let x = GEO.margemX;
  let y = geo.yBarras;
  for (const b of barras) {
    const w = Math.max(40, (Math.max(b.bornes, 3) + 1) * GEO.bornePasso);
    if (x + w > GEO.margemX + largura && x > GEO.margemX) {
      x = GEO.margemX;
      y += GEO.alturaBarra + 26;
    }
    itens.push({ id: b.id, x, y, w, bornes: b.bornes });
    x += w + 12;
  }
  // NEMA: barramento de fases vertical no centro.
  for (const [i, f] of nemaFases.entries()) {
    const col = geo.linhas.find((l) => l.padrao === "NEMA");
    if (!col) break;
    itens.push({ id: `F:${f}`, x: geo.centroNEMA - GEO.barramentoNEMA / 2 + i * (GEO.barramentoNEMA / nemaFases.length), y: col.y - 18, w: GEO.barramentoNEMA / nemaFases.length, bornes: 1 });
  }
  return { itens, yFim: y + GEO.alturaBarra };
}

export function posicaoPonto(
  q: QuadroDados,
  p: Ponto,
  geo: ReturnType<typeof geometria>,
  porId: Map<string, { c: Componente; p: Peca }>,
  barras: Barra[],
): { x: number; y: number } | null {
  switch (p.k) {
    case "entrada": {
      const i = ["R", "S", "T", "N", "PE"].indexOf(p.condutor);
      return { x: 8 + i * 7, y: 6 };
    }
    case "carcaca":
      return { x: 4, y: geo.yBarras + 10 };
    case "term": {
      const x = porId.get(p.compId);
      if (!x) return null;
      const t = terminaisDaPeca(x.p, x.c);
      const term = [...t.linha, ...t.carga].find((z) => z.t === p.t);
      return term ? posicaoTerminal(q, x.c, term, geo) : null;
    }
    case "barra": {
      const lay = layoutBarras(q, barras, geo).itens.find((b) => b.id === p.barra);
      if (!lay) return null;
      if (p.barra.startsWith("F:")) return { x: lay.x + lay.w / 2, y: lay.y };
      return { x: lay.x + GEO.bornePasso * Math.max(1, p.borne) - 2, y: lay.y };
    }
    case "saida":
      return null;
  }
}

// ---------------------------------------------------------------------------
// Verificações
// ---------------------------------------------------------------------------

export function verificarLigacoes(
  q: QuadroDados,
  r: Pick<ResultadoLigacoes, "ligacoes" | "pentes" | "barras" | "cores" | "secaoEntrada" | "nomes">,
  analise: AnaliseQuadro = analisarQuadro(q),
): Alerta[] {
  const alertas: Alerta[] = [];
  const num = new Map(q.circuitos.map((c, i) => [c.id, i + 1]));
  const pecaDe = new Map(q.componentes.map((c) => [c.id, { c, p: peca(c.pecaId) }]));
  const drGeral = q.componentes.find((c) => c.geral && peca(c.pecaId)?.tipo === "dr");

  // Neutro na barra certa
  for (const l of r.ligacoes) {
    if (l.funcao !== "N" || l.para.k !== "saida" || !l.circuitoId) continue;
    const circ = q.circuitos.find((c) => c.id === l.circuitoId);
    if (!circ) continue;
    const origemBarra = l.de.k === "barra" ? l.de.barra : null;
    const dr = circ.drId ? pecaDe.get(circ.drId) : undefined;
    const drParcial = dr && !dr.c.geral && r.barras.some((b) => b.id === `N:${dr.c.id}`) ? dr.c.id : null;
    if (drParcial && origemBarra !== `N:${drParcial}`) {
      alertas.push({
        nivel: "erro",
        mensagem: `Neutro do circuito ${num.get(circ.id)} (protegido pelo ${r.nomes.get(drParcial)}) está na ${r.barras.find((b) => b.id === origemBarra)?.nome ?? "barra errada"}. Ele precisa sair da barra de neutro do próprio DR — senão o DR dispara sem motivo ou não protege.`,
        referencia: "NBR 5410 5.1.3.2 (o DR deve envolver fase e neutro do circuito)",
      });
    } else if (!drParcial && origemBarra?.startsWith("N:")) {
      alertas.push({
        nivel: "erro",
        mensagem: `Neutro do circuito ${num.get(circ.id)}, que não passa pelo ${r.nomes.get(origemBarra.slice(2))}, está ligado na barra de neutro desse DR — a corrente de neutro desequilibra o DR (disparo indevido).`,
        referencia: "NBR 5410 5.1.3.2",
      });
    }
  }

  // DPS sem PE
  for (const [id, x] of pecaDe) {
    if (x.p?.tipo !== "dps") continue;
    const temPE = r.ligacoes.some((l) => l.funcao === "PE" && ((l.de.k === "term" && l.de.compId === id) || (l.para.k === "term" && l.para.compId === id)));
    if (!temPE)
      alertas.push({ nivel: "erro", mensagem: `${r.nomes.get(id)} sem ligação ao PE — o DPS não escoa o surto.`, referencia: "NBR 5410 6.3.5" });
  }

  // Cores
  const avisadas = new Set<string>();
  for (const l of r.ligacoes) {
    if (l.modo === "pente" || l.modo === "barramento") continue;
    const chave = `${l.funcao}:${l.cor}`;
    if (avisadas.has(chave)) continue;
    if (l.funcao === "F" && CORES_PROIBIDAS_FASE.includes(l.cor)) {
      avisadas.add(chave);
      alertas.push({
        nivel: "erro",
        mensagem: `Fase em cor ${nomeCor(l.cor).toLowerCase()} — azul-claro é exclusivo do neutro e verde/verde-amarelo do PE.`,
        referencia: "NBR 5410 6.1.5.3",
      });
    }
    if (l.funcao === "N" && !CORES_NEUTRO.includes(l.cor)) {
      avisadas.add(chave);
      alertas.push({ nivel: "erro", mensagem: `Neutro em cor ${nomeCor(l.cor).toLowerCase()} — o neutro deve ser azul-claro.`, referencia: "NBR 5410 6.1.5.3.1" });
    }
    if (l.funcao === "PE" && !CORES_PE.includes(l.cor)) {
      avisadas.add(chave);
      alertas.push({ nivel: "erro", mensagem: `PE em cor ${nomeCor(l.cor).toLowerCase()} — use verde-amarelo (ou verde).`, referencia: "NBR 5410 6.1.5.3.2" });
    }
  }

  // Seções
  for (const l of r.ligacoes) {
    if (!l.secaoMinima || l.modo === "pente" || l.modo === "barramento") continue;
    if (l.secao < l.secaoMinima) {
      alertas.push({
        nivel: "erro",
        mensagem: `${l.deTexto} → ${l.paraTexto}: cabo de ${fmt(l.secao)} mm² menor que o exigido (${fmt(l.secaoMinima)} mm²) pela proteção a montante — o cabo não fica protegido.`,
        referencia: "NBR 5410 5.3.4.1 (In ≤ Iz) — capacidade interna pelo método B1, conferir",
      });
    }
  }

  // Pentes
  for (const p of r.pentes) {
    const fonte = pecaDe.get(p.montante)?.p;
    const In = fonte?.correnteNominal ?? q.componentes.map((c) => peca(c.pecaId)).find((x, i) => q.componentes[i].geral && x?.tipo === "disjuntor")?.correnteNominal;
    if (In && In > 63)
      alertas.push({
        nivel: "aviso",
        mensagem: `Pente ${p.tipo} do trilho ${p.fileira + 1} alimentado por proteção de ${In} A — pentes comuns são de 63 A (10 mm²) a 80 A (16 mm²). Conferir catálogo.`,
      });
  }

  // Polaridade invertida (registrada nos ajustes)
  const cfg = configLigacoes(q);
  for (const [id, a] of Object.entries(cfg.pecas)) {
    if (!a.inverter) continue;
    const x = pecaDe.get(id);
    if (!x?.p) continue;
    alertas.push(
      x.p.tipo === "dr"
        ? { nivel: "erro", mensagem: `${r.nomes.get(id)} alimentado pelos terminais de saída (N'/2/4) — DR não deve ser ligado invertido.`, referencia: "Instruções do fabricante / NBR NM 61008" }
        : { nivel: "aviso", mensagem: `${r.nomes.get(id)} alimentado por baixo (terminais de carga). Alguns disjuntores permitem — conferir o fabricante; padronize linha em cima.` },
    );
  }

  // Mais de 2 condutores no mesmo borne de peça
  const porTerminal = new Map<string, number>();
  for (const l of r.ligacoes) {
    if (l.modo === "pente" || l.modo === "barramento") continue;
    for (const p of [l.de, l.para]) if (p.k === "term") porTerminal.set(chavePonto(p), (porTerminal.get(chavePonto(p)) ?? 0) + 1);
  }
  for (const [chave, n] of porTerminal) {
    if (n <= 2) continue;
    const [compId, t] = chave.split(".");
    alertas.push({
      nivel: "aviso",
      mensagem: `${n} condutores no terminal ${t} do ${r.nomes.get(compId)} — a maioria dos bornes aceita 1 ou 2. Use pente, barramento ou borne de distribuição (conferir fabricante).`,
    });
  }

  // DR geral com neutro preso a fase
  if (drGeral) {
    const p = peca(drGeral.pecaId);
    if (p && !poloNeutroDoDR(p, drGeral) && q.circuitos.some((c) => c.ligacao === "FN"))
      alertas.push({ nivel: "erro", mensagem: "DR geral sem polo livre para o neutro, mas há circuitos fase-neutro.", referencia: "NBR 5410 5.1.3.2" });
  }
  void analise;
  return alertas;
}

// ---------------------------------------------------------------------------
// Resumos para materiais e compras
// ---------------------------------------------------------------------------

export interface CaboInterno {
  secao: number;
  cor: string;
  metros: number;
  funcoes: string[];
}

/** Metros de cabo interno do quadro, por seção e cor (sem as saídas dos circuitos, já contadas nos circuitos). */
export function cabosInternos(r: ResultadoLigacoes): CaboInterno[] {
  const mapa = new Map<string, CaboInterno>();
  for (const l of r.ligacoes) {
    if (l.modo !== "cabo" && l.modo !== "ponte") continue;
    if (l.secao <= 0) continue;
    const k = `${l.secao}|${l.cor}`;
    const atual = mapa.get(k) ?? { secao: l.secao, cor: nomeCor(l.cor).toLowerCase(), metros: 0, funcoes: [] };
    atual.metros += l.comprimentoM;
    const f = l.funcao === "F" ? "fase" : l.funcao === "N" ? "neutro" : "PE";
    if (!atual.funcoes.includes(f)) atual.funcoes.push(f);
    mapa.set(k, atual);
  }
  return [...mapa.values()]
    .map((c) => ({ ...c, metros: Math.round(c.metros * 10) / 10 }))
    .sort((a, b) => a.secao - b.secao || a.cor.localeCompare(b.cor));
}

export function resumoLigacoes(q: QuadroDados, analise: AnaliseQuadro = analisarQuadro(q)) {
  const r = gerarLigacoes(q, analise);
  return {
    pentes: r.pentes.map((p) => ({ tipo: p.tipo, modulos: p.modulos })),
    cabosInternos: cabosInternos(r),
    ponteiras: r.ligacoes.filter((l) => l.modo === "cabo" || l.modo === "ponte" || l.modo === "saida").length * 2,
  };
}

/** Lista de materiais do quadro + pentes reais e cabos internos das ligações. */
export function listaMateriaisCompleta(q: QuadroDados, analise: AnaliseQuadro = analisarQuadro(q)): ItemMaterial[] {
  const base = listaMateriais(q, analise).filter((i) => !i.descricao.startsWith("Barramento pente"));
  const r = gerarLigacoes(q, analise);
  const extra: ItemMaterial[] = r.pentes.map((p) => ({
    descricao: `Barramento pente ${p.tipo} — ${p.modulos} módulos (trilho ${p.fileira + 1})`,
    quantidade: 1,
    unidade: "un",
  }));
  for (const c of cabosInternos(r)) {
    extra.push({
      descricao: `Cabo flexível ${fmt(c.secao)} mm² — interno do quadro, ${c.cor}`,
      quantidade: Math.max(1, Math.ceil(c.metros * 1.2)),
      unidade: "m",
    });
  }
  return [...base, ...extra];
}

export { CORES_PADRAO };
