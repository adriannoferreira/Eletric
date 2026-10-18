/**
 * Tabelas da ABNT NBR 5410:2004 (versão corrigida 2008) usadas pelo motor.
 *
 * Condutores de COBRE, isolação de PVC (70 °C no condutor), temperatura de
 * referência 30 °C (ambiente) ou 20 °C (solo, método D) — Tabela 36.
 * Os valores coincidem com a IEC 60364-5-52 (tabelas B.52.2 e B.52.4), da qual
 * a NBR 5410 deriva. Método D considera resistividade térmica do solo de 2,5 K·m/W.
 *
 * Sempre que houver revisão da norma, confira estes números na edição vigente.
 */

export const SECOES = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120] as const;
export type Secao = (typeof SECOES)[number];

export const METODOS = ["A1", "A2", "B1", "B2", "C", "D"] as const;
export type Metodo = (typeof METODOS)[number];

export const DESCRICAO_METODO: Record<Metodo, string> = {
  A1: "A1 — condutores isolados em eletroduto embutido em parede termicamente isolante",
  A2: "A2 — cabo multipolar em eletroduto embutido em parede termicamente isolante",
  B1: "B1 — condutores isolados em eletroduto aparente ou embutido em alvenaria",
  B2: "B2 — cabo multipolar em eletroduto aparente ou embutido em alvenaria",
  C: "C — cabo uni/multipolar fixado diretamente na parede ou em bandeja não perfurada",
  D: "D — cabo em eletroduto enterrado no solo",
};

/** Tabela 36 — capacidade de condução de corrente (A). Índice = posição em SECOES. */
const TABELA_36: Record<Metodo, { 2: number[]; 3: number[] }> = {
  A1: {
    2: [14.5, 19.5, 26, 34, 46, 61, 80, 99, 119, 151, 182, 210],
    3: [13.5, 18, 24, 31, 42, 56, 73, 89, 108, 136, 164, 188],
  },
  A2: {
    2: [14, 18.5, 25, 32, 43, 57, 75, 92, 110, 139, 167, 192],
    3: [13, 17.5, 23, 29, 39, 52, 68, 83, 99, 125, 150, 172],
  },
  B1: {
    2: [17.5, 24, 32, 41, 57, 76, 101, 125, 151, 192, 232, 269],
    3: [15.5, 21, 28, 36, 50, 68, 89, 110, 134, 171, 207, 239],
  },
  B2: {
    2: [16.5, 23, 30, 38, 52, 69, 90, 111, 133, 168, 201, 232],
    3: [15, 20, 27, 34, 46, 62, 80, 99, 118, 149, 179, 206],
  },
  C: {
    2: [19.5, 27, 36, 46, 63, 85, 112, 138, 168, 213, 258, 299],
    3: [17.5, 24, 32, 41, 57, 76, 96, 119, 144, 184, 223, 259],
  },
  D: {
    2: [22, 29, 38, 47, 63, 81, 104, 125, 148, 183, 216, 246],
    3: [18, 24, 31, 39, 52, 67, 86, 103, 122, 151, 179, 203],
  },
};

export function capacidadeTabela36(secao: number, metodo: Metodo, carregados: 2 | 3) {
  const i = SECOES.indexOf(secao as Secao);
  if (i < 0) return undefined;
  return TABELA_36[metodo][carregados][i];
}

/** Tabela 40 — fatores de correção de temperatura para PVC. */
const TABELA_40_AMBIENTE: [number, number][] = [
  [10, 1.22], [15, 1.17], [20, 1.12], [25, 1.06], [30, 1.0], [35, 0.94],
  [40, 0.87], [45, 0.79], [50, 0.71], [55, 0.61], [60, 0.5],
];
const TABELA_40_SOLO: [number, number][] = [
  [10, 1.1], [15, 1.05], [20, 1.0], [25, 0.95], [30, 0.89], [35, 0.84],
  [40, 0.77], [45, 0.71], [50, 0.63], [55, 0.55], [60, 0.45],
];

/**
 * Fator de temperatura. Para temperaturas entre os valores tabelados, usa a
 * faixa imediatamente superior (lado da segurança). Acima de 60 °C o PVC não
 * é adequado → retorna 0.
 */
export function fatorTemperatura(temperaturaC: number, metodo: Metodo) {
  const tabela = metodo === "D" ? TABELA_40_SOLO : TABELA_40_AMBIENTE;
  for (const [t, f] of tabela) if (temperaturaC <= t) return f;
  return 0;
}

/**
 * Tabela 42, item 1 — agrupamento em feixe, ao ar livre ou sobre superfície,
 * embutidos ou em conduto fechado (métodos A a F). `n` = nº de circuitos ou de
 * cabos multipolares no mesmo conduto.
 * Para cabos enterrados (método D) a norma usa as Tabelas 44 e 45 — aqui
 * aplicamos a 42 como aproximação; conferir na edição vigente.
 */
export function fatorAgrupamento(n: number) {
  if (n <= 1) return 1;
  const fatores: Record<number, number> = { 2: 0.8, 3: 0.7, 4: 0.65, 5: 0.6, 6: 0.57, 7: 0.54, 8: 0.52 };
  if (n <= 8) return fatores[n];
  if (n <= 11) return 0.5;
  if (n <= 15) return 0.45;
  if (n <= 19) return 0.41;
  return 0.38;
}

/** Tabela 47 — seção mínima de condutores de cobre em instalações fixas. */
export const SECAO_MINIMA = { iluminacao: 1.5, tug: 2.5, tue: 2.5 } as const;

/** Correntes nominais comerciais de disjuntores DIN (A). */
export const CORRENTES_NOMINAIS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125] as const;

/**
 * Resistividade do cobre na temperatura de serviço do PVC (70 °C):
 * ρ70 = ρ20 × [1 + α(70 − 20)] = 0,01724 × (1 + 0,00393 × 50) ≈ 0,0206 Ω·mm²/m.
 */
export const RHO_COBRE_70 = 0.0206;

/** 6.2.7.2 — queda de tensão máxima em circuitos terminais (%). */
export const QUEDA_MAX_TERMINAL = 4;

/** 6.5.4.7 — espaço reserva no quadro em função do nº de circuitos efetivos. */
export function reservaMinima(nCircuitos: number) {
  if (nCircuitos <= 0) return 0;
  if (nCircuitos <= 6) return 2;
  if (nCircuitos <= 12) return 3;
  if (nCircuitos <= 30) return 4;
  return Math.ceil(nCircuitos * 0.15);
}
