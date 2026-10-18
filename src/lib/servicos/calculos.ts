/** Calculadoras de campo (funções puras). Valores marcados como estimativa/"conferir" devem ser validados. */

/* ---------- Ar-condicionado (estimativa prática) ---------- */

export const TAMANHOS_BTU = [7500, 9000, 12000, 18000, 22000, 24000, 30000, 36000, 48000, 60000];

/**
 * Regra prática de mercado (estimativa, não substitui cálculo de carga térmica):
 * 600 BTU/h por m² (800 com sol da tarde/cobertura), +600 por pessoa além da 1ª
 * e +600 por equipamento eletrônico que esquenta (TV, computador).
 */
export function estimarBTU(p: { areaM2: number; solTarde: boolean; pessoas: number; eletronicos: number }) {
  const porM2 = p.solTarde ? 800 : 600;
  const total = p.areaM2 * porM2 + Math.max(0, p.pessoas - 1) * 600 + Math.max(0, p.eletronicos) * 600;
  const sugerido = TAMANHOS_BTU.find((t) => t >= total) ?? null;
  return { btu: Math.round(total), sugerido };
}

/* ---------- Luminotécnico (método dos lúmens) ---------- */

export const AMBIENTES_LUX: { nome: string; lux: number; ref: "8995" | "tipico" }[] = [
  { nome: "Escritório / home office", lux: 500, ref: "8995" },
  { nome: "Sala de aula", lux: 300, ref: "8995" },
  { nome: "Loja — área de vendas", lux: 300, ref: "8995" },
  { nome: "Banheiro / sanitário", lux: 200, ref: "8995" },
  { nome: "Corredor / circulação", lux: 100, ref: "8995" },
  { nome: "Depósito", lux: 100, ref: "8995" },
  { nome: "Garagem (estacionamento interno)", lux: 75, ref: "8995" },
  { nome: "Cozinha residencial", lux: 300, ref: "tipico" },
  { nome: "Sala de estar", lux: 150, ref: "tipico" },
  { nome: "Quarto", lux: 150, ref: "tipico" },
];

/** N = E·A / (Φ·u·FM). u = fator de utilização; FM = fator de manutenção. */
export function luminarias(p: { lux: number; areaM2: number; lumensPorLuminaria: number; utilizacao: number; manutencao: number }) {
  const fluxoTotal = (p.lux * p.areaM2) / (p.utilizacao * p.manutencao);
  const n = p.lumensPorLuminaria > 0 ? Math.ceil(fluxoTotal / p.lumensPorLuminaria) : 0;
  const luxObtido = n > 0 && p.areaM2 > 0 ? (n * p.lumensPorLuminaria * p.utilizacao * p.manutencao) / p.areaM2 : 0;
  return { fluxoTotal: Math.round(fluxoTotal), quantidade: n, luxObtido: Math.round(luxObtido) };
}

/* ---------- Consumo e conta de luz ---------- */

export type Aparelho = { nome: string; watts: number; horasDia: number; diasMes: number; quantidade: number };

export const APARELHOS_TIPICOS: Aparelho[] = [
  { nome: "Chuveiro elétrico", watts: 5500, horasDia: 0.5, diasMes: 30, quantidade: 1 },
  { nome: "Ar-condicionado 12.000 BTU (inverter)", watts: 1100, horasDia: 8, diasMes: 30, quantidade: 1 },
  { nome: "Geladeira (média, ciclo do compressor)", watts: 150, horasDia: 10, diasMes: 30, quantidade: 1 },
  { nome: "Televisão LED", watts: 100, horasDia: 5, diasMes: 30, quantidade: 1 },
  { nome: "Máquina de lavar", watts: 500, horasDia: 1, diasMes: 12, quantidade: 1 },
  { nome: "Ferro de passar", watts: 1000, horasDia: 0.5, diasMes: 8, quantidade: 1 },
  { nome: "Lâmpada LED", watts: 9, horasDia: 5, diasMes: 30, quantidade: 8 },
  { nome: "Bomba d'água 1/2 cv", watts: 450, horasDia: 1, diasMes: 30, quantidade: 1 },
];

export function consumoMensal(aparelhos: Aparelho[], tarifaKWh: number | null) {
  const linhas = aparelhos.map((a) => {
    const kwh = (a.watts * a.horasDia * a.diasMes * a.quantidade) / 1000;
    return { ...a, kwh, custo: tarifaKWh ? kwh * tarifaKWh : null };
  });
  const totalKWh = linhas.reduce((s, l) => s + l.kwh, 0);
  return { linhas, totalKWh, totalCusto: tarifaKWh ? totalKWh * tarifaKWh : null };
}

/* ---------- Motores e bombas ---------- */

export const CV_W = 735.5;
export const CONTATORES_A = [9, 12, 18, 25, 32, 40, 50, 65, 80, 95];

/** Corrente nominal aproximada pela potência de eixo, rendimento e fator de potência. */
export function correnteMotor(p: { potencia: number; unidade: "cv" | "kW"; tensao: number; fases: 1 | 3; rendimento: number; fp: number }) {
  const pw = p.unidade === "cv" ? p.potencia * CV_W : p.potencia * 1000;
  const denom = (p.fases === 3 ? Math.sqrt(3) : 1) * p.tensao * p.rendimento * p.fp;
  const In = denom > 0 ? pw / denom : 0;
  return {
    potenciaEletricaW: Math.round(pw / p.rendimento),
    In,
    /** Condutor do circuito de motor dimensionado para ≥ 125% de In (conferir NBR 5410 6.5.1). */
    correnteCabo: In * 1.25,
    contator: CONTATORES_A.find((c) => c >= In) ?? null,
    /** Faixa típica de ajuste do relé térmico: In dentro da faixa. */
    releFaixa: [Number((In * 0.8).toFixed(1)), Number((In * 1.2).toFixed(1))] as [number, number],
  };
}

/* ---------- Solar fotovoltaico (estimativa) ---------- */

/** Custo de disponibilidade (kWh/mês) por tipo de ligação — conferir regra ANEEL vigente. */
export const DISPONIBILIDADE_KWH = { mono: 30, bi: 50, tri: 100 } as const;

export function estimarSolar(p: {
  consumoMensalKWh: number;
  ligacao: keyof typeof DISPONIBILIDADE_KWH;
  hsp: number;
  pr: number;
  potenciaModuloW: number;
  areaModuloM2: number;
}) {
  const compensar = Math.max(0, p.consumoMensalKWh - DISPONIBILIDADE_KWH[p.ligacao]);
  const kWp = p.hsp > 0 && p.pr > 0 ? compensar / (30 * p.hsp * p.pr) : 0;
  const modulos = p.potenciaModuloW > 0 ? Math.ceil((kWp * 1000) / p.potenciaModuloW) : 0;
  const kWpReal = (modulos * p.potenciaModuloW) / 1000;
  return {
    compensar,
    kWp,
    modulos,
    kWpReal,
    geracaoMensal: kWpReal * p.hsp * 30 * p.pr,
    area: modulos * p.areaModuloM2,
  };
}

/* ---------- Carregador de veículo elétrico ---------- */

export const CARREGADORES = [
  { nome: "3,7 kW (monofásico 16 A)", kW: 3.7, fases: 1 as const },
  { nome: "7,4 kW (monofásico 32 A)", kW: 7.4, fases: 1 as const },
  { nome: "11 kW (trifásico 16 A)", kW: 11, fases: 3 as const },
  { nome: "22 kW (trifásico 32 A)", kW: 22, fases: 3 as const },
];

export function carregadorVE(p: { kW: number; fases: 1 | 3; tensao: number; bateriaKWh: number; eficiencia: number }) {
  const I = (p.kW * 1000) / ((p.fases === 3 ? Math.sqrt(3) : 1) * p.tensao);
  const horas = p.kW > 0 ? p.bateriaKWh / (p.kW * p.eficiencia) : 0;
  return { I, horasCargaCompleta: horas };
}

/* ---------- Ocupação de eletroduto (NBR 5410 6.2.11.1.6) ---------- */

/** Taxa máxima de ocupação pelo nº de condutores — conferir edição vigente. */
export function taxaMaxima(nCondutores: number) {
  if (nCondutores <= 1) return 0.53;
  if (nCondutores === 2) return 0.31;
  return 0.4;
}

/** Diâmetro externo aproximado de cabos flexíveis 750 V (mm) — conferir catálogo do fabricante. */
export const DIAMETRO_CABO_MM: Record<string, number> = {
  "1,5": 3.0,
  "2,5": 3.6,
  "4": 4.2,
  "6": 4.8,
  "10": 6.0,
  "16": 7.0,
  "25": 8.9,
  "35": 10.2,
};

/** Eletrodutos corrugados: diâmetro interno aproximado (mm) — conferir fabricante. */
export const ELETRODUTOS = [
  { nome: 'DN 20 (1/2")', interno: 15.4 },
  { nome: 'DN 25 (3/4")', interno: 19.0 },
  { nome: 'DN 32 (1")', interno: 24.3 },
  { nome: 'DN 40 (1 1/4")', interno: 31.2 },
  { nome: 'DN 50 (1 1/2")', interno: 39.4 },
];

export function ocupacaoEletroduto(cabos: { secao: string; quantidade: number }[], diametroInterno: number) {
  const n = cabos.reduce((s, c) => s + c.quantidade, 0);
  const areaCabos = cabos.reduce((s, c) => s + c.quantidade * Math.PI * ((DIAMETRO_CABO_MM[c.secao] ?? 0) / 2) ** 2, 0);
  const areaTubo = Math.PI * (diametroInterno / 2) ** 2;
  const taxa = areaTubo > 0 ? areaCabos / areaTubo : 0;
  const max = taxaMaxima(n);
  const sugerido = ELETRODUTOS.find((e) => areaCabos / (Math.PI * (e.interno / 2) ** 2) <= max) ?? null;
  return { n, areaCabos, areaTubo, taxa, max, ok: taxa <= max, sugerido };
}
