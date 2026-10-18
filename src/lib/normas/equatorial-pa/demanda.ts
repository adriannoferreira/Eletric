/**
 * Carga instalada e estimativa de demanda pelas tabelas da NT.00001 rev. 09.
 * Atenção: o padrão de entrada é dimensionado pela CARGA INSTALADA (método da TABELA 2).
 * O roteiro do item 6.4 ("Cálculo de Demanda") não consta no texto da rev. 09 (o sumário
 * aponta "Erro! Indicador não definido"); por isso a demanda aqui é uma ESTIMATIVA
 * auxiliar com as TABELAS 4 e 5, usada no critério de estudo do item 5.5.1.1.
 */
import { ref } from "./normas";

export type CategoriaCarga = "iluminacao_tomadas" | "aparelho" | "ar_condicionado" | "motor" | "outro";

export interface CargaEquatorial {
  descricao: string;
  quantidade: number;
  /** Potência unitária em W. */
  potenciaW: number;
  categoria: CategoriaCarga;
}

/**
 * TABELA 3 — potências de referência de aparelhos (W). Usar dados de placa quando houver.
 * Chuveiro não consta na TABELA 3: informar a potência de placa.
 */
export const TABELA_3: { aparelho: string; potenciaW: number; categoria: CategoriaCarga }[] = [
  { aparelho: "Ponto de luz e tomada", potenciaW: 100, categoria: "iluminacao_tomadas" },
  { aparelho: "Torneira elétrica", potenciaW: 2000, categoria: "aparelho" },
  { aparelho: "Aquecedor de água (boiler) 50 a 100 L", potenciaW: 1000, categoria: "aparelho" },
  { aparelho: "Aquecedor de água (boiler) 150 a 200 L", potenciaW: 1250, categoria: "aparelho" },
  { aparelho: "Aquecedor de água (boiler) 250 L", potenciaW: 1500, categoria: "aparelho" },
  { aparelho: "Aquecedor de água (boiler) 300 a 350 L", potenciaW: 2000, categoria: "aparelho" },
  { aparelho: "Aquecedor de água (boiler) 400 L", potenciaW: 2500, categoria: "aparelho" },
  { aparelho: "Fogão elétrico", potenciaW: 2000, categoria: "aparelho" },
  { aparelho: "Micro-ondas", potenciaW: 1200, categoria: "aparelho" },
  { aparelho: "Grill", potenciaW: 1200, categoria: "aparelho" },
  { aparelho: "Lavadora de louças", potenciaW: 1200, categoria: "aparelho" },
  { aparelho: "Máquina de lavar roupa", potenciaW: 1000, categoria: "aparelho" },
  { aparelho: "Secador de roupa (1100 a 5000 W — valor máximo)", potenciaW: 5000, categoria: "aparelho" },
  { aparelho: "Ferro elétrico", potenciaW: 550, categoria: "aparelho" },
  { aparelho: "Geladeira comum", potenciaW: 250, categoria: "aparelho" },
  { aparelho: "Secador de cabelo (1000 a 1500 W — valor máximo)", potenciaW: 1500, categoria: "aparelho" },
  { aparelho: "Torradeira", potenciaW: 800, categoria: "aparelho" },
  { aparelho: "Televisor (50 a 150 W — valor máximo)", potenciaW: 150, categoria: "aparelho" },
  { aparelho: "Ventilador (80 a 250 W — valor máximo)", potenciaW: 250, categoria: "aparelho" },
  { aparelho: "Bomba d'água 1/4 cv", potenciaW: 335, categoria: "motor" },
  { aparelho: "Bomba d'água 1/2 cv", potenciaW: 613, categoria: "motor" },
  { aparelho: "Bomba d'água 3/4 cv", potenciaW: 849, categoria: "motor" },
  { aparelho: "Bomba d'água 1 cv", potenciaW: 1051, categoria: "motor" },
  { aparelho: "Ar-condicionado janela 7.100 BTU/h", potenciaW: 900, categoria: "ar_condicionado" },
  { aparelho: "Ar-condicionado janela 10.000 BTU/h", potenciaW: 1400, categoria: "ar_condicionado" },
  { aparelho: "Ar-condicionado janela 12.000 BTU/h", potenciaW: 1600, categoria: "ar_condicionado" },
  { aparelho: "Ar-condicionado janela 18.000 BTU/h", potenciaW: 2600, categoria: "ar_condicionado" },
  { aparelho: "Ar-condicionado split 9.000 BTU/h", potenciaW: 990, categoria: "ar_condicionado" },
  { aparelho: "Ar-condicionado split 12.000 BTU/h", potenciaW: 1260, categoria: "ar_condicionado" },
  { aparelho: "Ar-condicionado split 18.000 BTU/h", potenciaW: 2180, categoria: "ar_condicionado" },
  { aparelho: "Ar-condicionado split 22.000 BTU/h", potenciaW: 2430, categoria: "ar_condicionado" },
  { aparelho: "Ar-condicionado split 24.000 BTU/h", potenciaW: 2890, categoria: "ar_condicionado" },
  { aparelho: "Ar-condicionado split 30.000 BTU/h", potenciaW: 3380, categoria: "ar_condicionado" },
  { aparelho: "Ar-condicionado split 36.000 BTU/h", potenciaW: 4195, categoria: "ar_condicionado" },
  { aparelho: "Ar-condicionado split 48.000 BTU/h", potenciaW: 4990, categoria: "ar_condicionado" },
  { aparelho: "Ar-condicionado split 60.000 BTU/h", potenciaW: 6710, categoria: "ar_condicionado" },
];

/** TABELA 4 — fator de demanda de aparelhos de aquecimento e eletrodomésticos (por nº de aparelhos). */
const TAB4_ATE_35: number[] = [0.8, 0.75, 0.7, 0.66, 0.62, 0.59, 0.56, 0.53, 0.51, 0.49, 0.47, 0.45, 0.43, 0.41, 0.4, 0.39, 0.38, 0.37, 0.36, 0.35, 0.34, 0.33, 0.31, 0.3, 0.3];
const TAB4_ACIMA_35: number[] = [0.8, 0.65, 0.55, 0.5, 0.45, 0.43, 0.4, 0.36, 0.35, 0.34, 0.32, 0.32, 0.32, 0.32, 0.32, 0.28, 0.28, 0.28, 0.28, 0.28, 0.26, 0.26, 0.26, 0.26, 0.26];

export function fatorTabela4(numero: number, potenciaIndividualKW: number) {
  if (numero <= 0) return 0;
  const acima = potenciaIndividualKW > 3.5;
  if (numero <= 25) return (acima ? TAB4_ACIMA_35 : TAB4_ATE_35)[numero - 1];
  if (!acima) return 0.3;
  if (numero <= 30) return 0.24;
  if (numero <= 40) return 0.22;
  if (numero <= 50) return 0.2;
  if (numero <= 60) return 0.18;
  return 0.16;
}

/** TABELA 5 — residências: 100% dos primeiros 10 kW, 35% dos 110 kW seguintes, 25% acima de 120 kW. */
export function demandaIluminacaoTomadasResidencialKW(cargaKW: number) {
  const a = Math.min(cargaKW, 10);
  const b = Math.min(Math.max(cargaKW - 10, 0), 110);
  const c = Math.max(cargaKW - 120, 0);
  return a + 0.35 * b + 0.25 * c;
}

/** Carga mínima de iluminação e tomadas para residências: 30 W/m² (TABELA 5). */
export const CARGA_MINIMA_RESIDENCIAL_W_M2 = 30;

export interface ResultadoDemanda {
  cargaInstaladaKW: number;
  demandaKW: number;
  demandaKVA: number;
  fatorPotencia: number;
  parcelas: { grupo: string; cargaKW: number; fator: string; demandaKW: number; ref: string }[];
  observacoes: string[];
}

/**
 * Carga instalada e demanda estimada de uma unidade residencial.
 * - Iluminação e tomadas: TABELA 5 (residências).
 * - Aparelhos de aquecimento e eletrodomésticos: TABELA 4, separando ≤ 3,5 kW e > 3,5 kW.
 * - Ar-condicionado, motores e outros: a rev. 09 não traz tabela de fator de demanda → 100%.
 * fatorPotencia: 1 (mono/bi) ou 0,92 (tri), como nas premissas da TABELA 2 (Nota 23).
 */
export function calcularDemandaEquatorial(cargas: CargaEquatorial[], fatorPotencia = 1): ResultadoDemanda {
  const soma = (l: CargaEquatorial[]) => l.reduce((s, c) => s + (c.quantidade * c.potenciaW) / 1000, 0);
  const ilum = cargas.filter((c) => c.categoria === "iluminacao_tomadas");
  const aparelhos = cargas.filter((c) => c.categoria === "aparelho");
  const outros = cargas.filter((c) => c.categoria !== "iluminacao_tomadas" && c.categoria !== "aparelho");

  const parcelas: ResultadoDemanda["parcelas"] = [];
  const cargaIlum = soma(ilum);
  if (cargaIlum > 0) {
    parcelas.push({
      grupo: "Iluminação e tomadas",
      cargaKW: cargaIlum,
      fator: "100% até 10 kW; 35% de 10 a 120 kW; 25% acima",
      demandaKW: demandaIluminacaoTomadasResidencialKW(cargaIlum),
      ref: ref("NT.00001", "TABELA 5"),
    });
  }
  for (const [rotulo, filtro] of [
    ["até 3,5 kW", (c: CargaEquatorial) => c.potenciaW <= 3500],
    ["acima de 3,5 kW", (c: CargaEquatorial) => c.potenciaW > 3500],
  ] as const) {
    const lista = aparelhos.filter(filtro);
    const n = lista.reduce((s, c) => s + c.quantidade, 0);
    if (!n) continue;
    const carga = soma(lista);
    const f = fatorTabela4(n, rotulo === "até 3,5 kW" ? 1 : 4);
    parcelas.push({
      grupo: `Aparelhos ${rotulo} (${n} un.)`,
      cargaKW: carga,
      fator: `${Math.round(f * 100)}%`,
      demandaKW: carga * f,
      ref: ref("NT.00001", "TABELA 4"),
    });
  }
  const cargaOutros = soma(outros);
  if (cargaOutros > 0) {
    parcelas.push({
      grupo: "Ar-condicionado, motores e outros",
      cargaKW: cargaOutros,
      fator: "100% (sem tabela específica na rev. 09)",
      demandaKW: cargaOutros,
      ref: ref("NT.00001", "TABELAS 3 a 5"),
    });
  }
  const cargaInstaladaKW = soma(cargas);
  const demandaKW = parcelas.reduce((s, p) => s + p.demandaKW, 0);
  return {
    cargaInstaladaKW,
    demandaKW,
    demandaKVA: demandaKW / fatorPotencia,
    fatorPotencia,
    parcelas,
    observacoes: [
      "O padrão de entrada é dimensionado pela carga instalada (TABELA 2). A demanda é estimativa auxiliar.",
      "Potências da TABELA 3 são estimadas; use os dados de placa quando houver (nota da TABELA 3).",
    ],
  };
}
