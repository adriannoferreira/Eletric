/**
 * Catálogo de caixas de quadro de distribuição (QDC) vendidas no Brasil.
 *
 * DIN: trilho 35 mm, 1 módulo = 18 mm. Capacidades e combinações trilhos × módulos
 * seguem o que é usual nas linhas de mercado (Tigre, Steck, Schneider, Siemens,
 * WEG, Cemar, Margirius, Moratori…). NEMA: disjuntores "plug-in" encaixados num
 * barramento central, em duas colunas; a capacidade é dada em nº de disjuntores
 * monopolares. Medidas são APROXIMADAS — conferir catálogo do fabricante.
 */
import type { ModeloQuadro } from "./tipos";

export type PadraoCaixa = "DIN" | "NEMA";
export type MaterialCaixa = "pvc" | "metalico";
export type GrauIP = "IP40" | "IP54" | "IP65";
export type Instalacao = "embutir" | "sobrepor";

export interface Caixa {
  id: string;
  nome: string;
  padrao: PadraoCaixa;
  instalacao: Instalacao;
  material: MaterialCaixa;
  ip: GrauIP;
  /** DIN: nº de trilhos. NEMA: nº de colunas no barramento. */
  fileiras: number;
  /** DIN: módulos por trilho. NEMA: posições (1P) por coluna. */
  modulosPorFileira: number;
  /** NEMA: módulos DIN do trilho auxiliar para DR/DPS (0 = sem). */
  trilhoAux: number;
  capacidade: number;
  barramento: boolean;
  porta: boolean;
  tampa: boolean;
  /** Medidas externas aproximadas (mm) — conferir catálogo. */
  medidas: { altura: number; largura: number; profundidade: number };
  referencia: string;
}

export const NOME_MATERIAL: Record<MaterialCaixa, string> = { pvc: "PVC / termoplástico", metalico: "Metálica (chapa de aço)" };
export const NOME_INSTALACAO: Record<Instalacao, string> = { embutir: "De embutir", sobrepor: "De sobrepor" };
export const DESCRICAO_IP: Record<GrauIP, string> = {
  IP40: "IP40 — uso interno abrigado",
  IP54: "IP54 — interno com poeira/respingos",
  IP65: "IP65 — externo ou área úmida",
};

/** Combinações usuais de trilhos × módulos por capacidade (DIN). */
const LAYOUTS_DIN: [capacidade: number, fileiras: number, modulos: number][] = [
  [4, 1, 4],
  [6, 1, 6],
  [8, 1, 8],
  [12, 1, 12],
  [16, 2, 8],
  [18, 1, 18],
  [24, 2, 12],
  [28, 2, 14],
  [32, 2, 16],
  [36, 3, 12],
  [36, 2, 18],
  [40, 2, 20],
  [44, 2, 22],
  [48, 4, 12],
  [48, 3, 16],
  [48, 2, 24],
  [54, 3, 18],
  [56, 4, 14],
  [60, 5, 12],
  [60, 3, 20],
  [72, 6, 12],
  [72, 4, 18],
  [72, 3, 24],
  [96, 8, 12],
  [96, 4, 24],
  [120, 5, 24],
  [144, 6, 24],
];

/** NEMA: capacidade em disjuntores 1P → colunas × posições; trilho DIN auxiliar. */
const LAYOUTS_NEMA: [capacidade: number, fileiras: number, posicoes: number, aux: number][] = [
  [3, 1, 3, 0],
  [6, 2, 3, 4],
  [8, 2, 4, 4],
  [12, 2, 6, 6],
  [16, 2, 8, 6],
  [18, 2, 9, 8],
  [24, 2, 12, 8],
  [28, 2, 14, 12],
  [32, 2, 16, 12],
  [42, 2, 21, 12],
  [50, 2, 25, 12],
];

const REF_PVC = "Linhas de referência: Tigre, Steck, Schneider (Mini Pragma/Resi9), Margirius, Cemar";
const REF_METAL = "Linhas de referência: Cemar, Moratori, Siemens, WEG, Steck (chapa)";
const REF_NEMA = "Linhas de referência: Cemar, Moratori, Tigre, Margirius (padrão NEMA com barramento)";

function medidasDIN(fileiras: number, modulos: number, instalacao: Instalacao, material: MaterialCaixa) {
  const largura = Math.round(modulos * 18 + (material === "metalico" ? 110 : 80));
  const altura = Math.round(fileiras * 125 + (material === "metalico" ? 110 : 80));
  const profundidade = instalacao === "embutir" ? (material === "metalico" ? 100 : 75) : material === "metalico" ? 120 : 95;
  return { altura, largura, profundidade };
}

function medidasNEMA(posicoes: number, aux: number, instalacao: Instalacao) {
  const altura = Math.round(posicoes * 26 + (aux ? 110 : 0) + 160);
  return { altura, largura: 300, profundidade: instalacao === "embutir" ? 95 : 115 };
}

function gerarCatalogo(): Caixa[] {
  const lista: Caixa[] = [];
  for (const [cap, fil, mod] of LAYOUTS_DIN) {
    const variantes: [Instalacao, MaterialCaixa, GrauIP][] = [];
    if (cap <= 72) variantes.push(["embutir", "pvc", "IP40"], ["sobrepor", "pvc", "IP40"]);
    if (cap <= 54 && fil <= 3) variantes.push(["sobrepor", "pvc", "IP65"]);
    if (cap >= 12) variantes.push(["embutir", "metalico", "IP40"], ["sobrepor", "metalico", "IP40"]);
    if (cap >= 24) variantes.push(["sobrepor", "metalico", "IP54"]);
    for (const [inst, mat, ip] of variantes) {
      const layout = `${fil}×${mod}`;
      lista.push({
        id: `din-${cap}-${fil}x${mod}-${inst}-${mat}-${ip.toLowerCase()}`,
        nome: `${cap} módulos DIN (${layout}) — ${inst === "embutir" ? "embutir" : "sobrepor"} ${mat === "pvc" ? "PVC" : "metálico"} ${ip}`,
        padrao: "DIN",
        instalacao: inst,
        material: mat,
        ip,
        fileiras: fil,
        modulosPorFileira: mod,
        trilhoAux: 0,
        capacidade: cap,
        // Caixas grandes e metálicas costumam vir com barramento/pente opcional — conferir.
        barramento: mat === "metalico" && cap >= 24,
        porta: !(mat === "pvc" && cap <= 8 && inst === "embutir"),
        tampa: true,
        medidas: medidasDIN(fil, mod, inst, mat),
        referencia: mat === "pvc" ? REF_PVC : REF_METAL,
      });
    }
  }
  for (const [cap, fil, pos, aux] of LAYOUTS_NEMA) {
    for (const [inst, mat] of [
      ["embutir", "metalico"],
      ["sobrepor", "metalico"],
      ...(cap <= 24 ? ([["embutir", "pvc"]] as const) : []),
    ] as [Instalacao, MaterialCaixa][]) {
      lista.push({
        id: `nema-${cap}-${inst}-${mat}`,
        nome: `${cap} disjuntores NEMA${aux ? ` + ${aux} DIN` : ""} — ${inst} ${mat === "pvc" ? "PVC" : "metálico"}`,
        padrao: "NEMA",
        instalacao: inst,
        material: mat,
        ip: "IP40",
        fileiras: fil,
        modulosPorFileira: pos,
        trilhoAux: aux,
        capacidade: cap,
        barramento: true,
        porta: true,
        tampa: true,
        medidas: medidasNEMA(pos, aux, inst),
        referencia: REF_NEMA,
      });
    }
  }
  return lista;
}

export const CAIXAS: Caixa[] = gerarCatalogo();
const POR_ID = new Map(CAIXAS.map((c) => [c.id, c]));

export function caixa(id: string | null | undefined) {
  return id ? POR_ID.get(id) : undefined;
}

export const PERSONALIZADO = "personalizado";

export const LIMITES_PERSONALIZADO = { fileiras: [1, 10], modulos: [2, 30] } as const;

/** Linha física do quadro: trilho DIN, coluna NEMA ou trilho DIN auxiliar. */
export interface LinhaQuadro {
  padrao: PadraoCaixa;
  modulos: number;
  /** "Trilho 1", "Coluna esquerda", "Trilho DIN auxiliar"… */
  nome: string;
  auxiliar: boolean;
}

/** Linhas do quadro, na mesma ordem do índice `componente.fileira`. */
export function linhasDoModelo(m: Pick<ModeloQuadro, "fileiras" | "modulosPorFileira" | "padrao" | "trilhoAux">): LinhaQuadro[] {
  if (m.padrao === "NEMA") {
    const colunas = Array.from({ length: m.fileiras }, (_, i) => ({
      padrao: "NEMA" as const,
      modulos: m.modulosPorFileira,
      nome: m.fileiras === 2 ? (i === 0 ? "Coluna esquerda" : "Coluna direita") : `Coluna ${i + 1}`,
      auxiliar: false,
    }));
    return m.trilhoAux > 0
      ? [...colunas, { padrao: "DIN" as const, modulos: m.trilhoAux, nome: "Trilho DIN auxiliar", auxiliar: true }]
      : colunas;
  }
  return Array.from({ length: m.fileiras }, (_, i) => ({
    padrao: "DIN" as const,
    modulos: m.modulosPorFileira,
    nome: `Trilho ${i + 1}`,
    auxiliar: false,
  }));
}

export function capacidadeTotal(m: Parameters<typeof linhasDoModelo>[0]) {
  return linhasDoModelo(m).reduce((s, l) => s + l.modulos, 0);
}

/** Modelo do quadro a partir de uma caixa do catálogo. */
export function modeloDaCaixa(c: Caixa): ModeloQuadro {
  return {
    caixaId: c.id,
    fileiras: c.fileiras,
    modulosPorFileira: c.modulosPorFileira,
    instalacao: c.instalacao,
    padrao: c.padrao,
    material: c.material,
    ip: c.ip,
    trilhoAux: c.trilhoAux,
  };
}

/**
 * Caixa do catálogo equivalente a um modelo (quadros antigos não tinham `caixaId`).
 * Sem equivalente exato → undefined (tratado como "personalizado").
 */
export function caixaDoModelo(m: ModeloQuadro): Caixa | undefined {
  const exata = caixa(m.caixaId);
  if (exata) return exata;
  return CAIXAS.find(
    (c) =>
      c.padrao === m.padrao &&
      c.fileiras === m.fileiras &&
      c.modulosPorFileira === m.modulosPorFileira &&
      c.instalacao === m.instalacao &&
      c.material === m.material &&
      (m.padrao === "DIN" || c.trilhoAux === m.trilhoAux),
  );
}

export function descreverModelo(m: ModeloQuadro) {
  const c = caixaDoModelo(m);
  if (c) return c.nome;
  const cap = capacidadeTotal(m);
  return m.padrao === "NEMA"
    ? `Personalizado NEMA ${m.fileiras}×${m.modulosPorFileira}${m.trilhoAux ? ` + ${m.trilhoAux} DIN` : ""} — ${m.instalacao} ${m.material === "pvc" ? "PVC" : "metálico"}`
    : `Personalizado ${cap} módulos DIN (${m.fileiras}×${m.modulosPorFileira}) — ${m.instalacao} ${m.material === "pvc" ? "PVC" : "metálico"} ${m.ip}`;
}

export interface FiltroCaixa {
  padrao?: PadraoCaixa | null;
  instalacao?: Instalacao | null;
  material?: MaterialCaixa | null;
  ip?: GrauIP | null;
  capacidadeMin?: number;
  fileiras?: number | null;
  modulos?: number | null;
}

export function filtrarCaixas(f: FiltroCaixa) {
  return CAIXAS.filter(
    (c) =>
      (!f.padrao || c.padrao === f.padrao) &&
      (!f.instalacao || c.instalacao === f.instalacao) &&
      (!f.material || c.material === f.material) &&
      (!f.ip || c.ip === f.ip) &&
      (!f.capacidadeMin || c.capacidade >= f.capacidadeMin) &&
      (!f.fileiras || c.fileiras === f.fileiras) &&
      (!f.modulos || c.modulosPorFileira === f.modulos),
  ).sort((a, b) => a.capacidade - b.capacidade || a.fileiras - b.fileiras);
}

/**
 * Quantos disjuntores 1P cabem deixando a reserva da NBR 5410 (6.5.4.7 / Tabela 59):
 * até 6 circuitos → 2; 7 a 12 → 3; 13 a 30 → 4; acima de 30 → 15%.
 * `ocupados` = módulos já usados por geral/DR/DPS.
 */
export function cabeComReserva(capacidade: number, ocupados = 0) {
  let n = 0;
  for (let c = 1; c <= capacidade; c++) {
    const reserva = c <= 6 ? 2 : c <= 12 ? 3 : c <= 30 ? 4 : Math.ceil(c * 0.15);
    if (ocupados + c + reserva <= capacidade) n = c;
  }
  return n;
}

/**
 * Troca a caixa de um quadro reaproveitando as posições: cada peça fica no mesmo
 * lugar se couber (e o padrão DIN/NEMA da linha for o da peça); senão vai para o
 * primeiro espaço livre compatível, na ordem original. Peças sem lugar voltam em
 * `naoCouberam` (e não entram no quadro).
 */
export function trocarCaixa<C extends { id: string; pecaId: string; fileira: number; posicao: number }>(
  componentes: C[],
  novo: Parameters<typeof linhasDoModelo>[0],
  largura: (pecaId: string) => { modulos: number; padrao: PadraoCaixa } | undefined,
): { componentes: C[]; naoCouberam: C[]; movidas: number } {
  const linhas = linhasDoModelo(novo);
  const mapa = linhas.map((l) => Array<boolean>(l.modulos).fill(false));
  const livre = (f: number, p: number, w: number) => {
    if (!mapa[f] || p < 0 || p + w > mapa[f].length) return false;
    for (let i = p; i < p + w; i++) if (mapa[f][i]) return false;
    return true;
  };
  const ocupar = (f: number, p: number, w: number) => {
    for (let i = p; i < p + w; i++) mapa[f][i] = true;
  };
  const ordenados = [...componentes].sort((a, b) => a.fileira - b.fileira || a.posicao - b.posicao);
  const fica = new Map<string, C>();
  const pendentes: C[] = [];
  // 1º: quem cabe no mesmo lugar fica.
  for (const c of ordenados) {
    const info = largura(c.pecaId);
    if (!info) continue;
    if (linhas[c.fileira]?.padrao === info.padrao && livre(c.fileira, c.posicao, info.modulos)) {
      ocupar(c.fileira, c.posicao, info.modulos);
      fica.set(c.id, c);
    } else pendentes.push(c);
  }
  // 2º: os outros vão para o primeiro espaço livre compatível.
  const naoCouberam: C[] = [];
  let movidas = 0;
  for (const c of pendentes) {
    const info = largura(c.pecaId)!;
    let achou: { f: number; p: number } | null = null;
    for (let f = 0; f < linhas.length && !achou; f++) {
      if (linhas[f].padrao !== info.padrao) continue;
      for (let p = 0; p + info.modulos <= linhas[f].modulos; p++)
        if (livre(f, p, info.modulos)) {
          achou = { f, p };
          break;
        }
    }
    if (!achou) {
      naoCouberam.push(c);
      continue;
    }
    ocupar(achou.f, achou.p, info.modulos);
    fica.set(c.id, { ...c, fileira: achou.f, posicao: achou.p });
    movidas++;
  }
  return { componentes: componentes.filter((c) => fica.has(c.id)).map((c) => fica.get(c.id)!), naoCouberam, movidas };
}
