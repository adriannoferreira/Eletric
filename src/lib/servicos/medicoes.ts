/**
 * Tipos de medição elétrica e avaliação automática contra limites de referência.
 * Os limites são de referência e estão marcados para conferência: a norma vigente,
 * o PRODIST e o fabricante do equipamento prevalecem.
 */

export type Resultado = "ok" | "aviso" | "nc";

export type Parametro = {
  chave: string;
  rotulo: string;
  opcoes?: number[];
  padrao: number;
  unidade?: string;
};

export type Avaliacao = { resultado: Resultado; criterio: string };

export type TipoMedicao = {
  chave: string;
  nome: string;
  unidade: string;
  grupo: "Tensão e corrente" | "Segurança" | "Proteção" | "Qualidade" | "Outro";
  instrumento: string;
  parametros: Parametro[];
  /** Referência mostrada no relatório. */
  referencia: string;
  conferir?: boolean;
  avaliar: (valor: number, p: Record<string, number>) => Avaliacao;
};

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** Faixas de tensão de atendimento do PRODIST Módulo 8 (baixa tensão). Conferir revisão vigente. */
const FAIXAS_TENSAO: Record<number, { adequada: [number, number]; precaria: [number, number] }> = {
  127: { adequada: [116, 133], precaria: [109, 140] },
  220: { adequada: [201, 231], precaria: [189, 233] },
  380: { adequada: [348, 396], precaria: [327, 403] },
};

function avaliarTensao(valor: number, nominal: number): Avaliacao {
  const f = FAIXAS_TENSAO[nominal];
  if (!f) {
    const d = Math.abs(valor - nominal) / nominal;
    return d <= 0.05
      ? { resultado: "ok", criterio: `±5% de ${nominal} V` }
      : { resultado: d <= 0.1 ? "aviso" : "nc", criterio: `±5% de ${nominal} V` };
  }
  const [a1, a2] = f.adequada;
  const [p1, p2] = f.precaria;
  const criterio = `adequada ${a1}–${a2} V (nominal ${nominal} V)`;
  if (valor >= a1 && valor <= a2) return { resultado: "ok", criterio };
  if (valor >= p1 && valor <= p2) return { resultado: "aviso", criterio: `${criterio}; faixa precária` };
  return { resultado: "nc", criterio: `${criterio}; faixa crítica` };
}

export const TIPOS_MEDICAO: TipoMedicao[] = [
  {
    chave: "tensao_fn",
    nome: "Tensão fase-neutro",
    unidade: "V",
    grupo: "Tensão e corrente",
    instrumento: "Multímetro",
    parametros: [{ chave: "nominal", rotulo: "Tensão nominal", opcoes: [127, 220], padrao: 127, unidade: "V" }],
    referencia: "PRODIST Módulo 8 — faixas de tensão de atendimento",
    conferir: true,
    avaliar: (v, p) => avaliarTensao(v, p.nominal ?? 127),
  },
  {
    chave: "tensao_ff",
    nome: "Tensão fase-fase",
    unidade: "V",
    grupo: "Tensão e corrente",
    instrumento: "Multímetro",
    parametros: [{ chave: "nominal", rotulo: "Tensão nominal", opcoes: [220, 380], padrao: 220, unidade: "V" }],
    referencia: "PRODIST Módulo 8 — faixas de tensão de atendimento",
    conferir: true,
    avaliar: (v, p) => avaliarTensao(v, p.nominal ?? 220),
  },
  {
    chave: "tensao_npe",
    nome: "Tensão neutro-terra",
    unidade: "V",
    grupo: "Segurança",
    instrumento: "Multímetro",
    parametros: [],
    referencia: "Boa prática de campo (indício de neutro/aterramento deficiente)",
    conferir: true,
    avaliar: (v) =>
      v <= 2
        ? { resultado: "ok", criterio: "≤ 2 V" }
        : { resultado: v <= 5 ? "aviso" : "nc", criterio: "≤ 2 V (acima de 5 V: investigar)" },
  },
  {
    chave: "corrente",
    nome: "Corrente do circuito",
    unidade: "A",
    grupo: "Tensão e corrente",
    instrumento: "Alicate amperímetro",
    parametros: [{ chave: "in", rotulo: "Disjuntor (In)", padrao: 20, unidade: "A" }],
    referencia: "NBR 5410 5.3.4 — corrente de projeto ≤ corrente nominal da proteção",
    avaliar: (v, p) => {
      const inom = p.in ?? 20;
      if (v <= 0.8 * inom) return { resultado: "ok", criterio: `≤ 80% de ${fmt(inom)} A` };
      if (v <= inom) return { resultado: "aviso", criterio: `entre 80% e 100% de ${fmt(inom)} A` };
      return { resultado: "nc", criterio: `acima do disjuntor de ${fmt(inom)} A` };
    },
  },
  {
    chave: "isolamento",
    nome: "Resistência de isolamento",
    unidade: "MΩ",
    grupo: "Segurança",
    instrumento: "Megômetro",
    parametros: [{ chave: "ensaio", rotulo: "Tensão de ensaio", opcoes: [250, 500, 1000], padrao: 500, unidade: "V cc" }],
    referencia: "NBR 5410 7.3.3 / IEC 60364-6 — mínimo por tensão de ensaio",
    conferir: true,
    avaliar: (v, p) => {
      const ensaio = p.ensaio ?? 500;
      const min = ensaio <= 250 ? 0.5 : 1;
      if (v >= min) return { resultado: "ok", criterio: `≥ ${fmt(min)} MΩ a ${ensaio} V` };
      return { resultado: v >= 0.5 ? "aviso" : "nc", criterio: `≥ ${fmt(min)} MΩ a ${ensaio} V` };
    },
  },
  {
    chave: "continuidade_pe",
    nome: "Continuidade do condutor de proteção (PE)",
    unidade: "Ω",
    grupo: "Segurança",
    instrumento: "Multímetro / microhmímetro",
    parametros: [],
    referencia: "NBR 5410 7.3.2 — continuidade dos condutores de proteção",
    conferir: true,
    avaliar: (v) =>
      v <= 1 ? { resultado: "ok", criterio: "≤ 1 Ω" } : { resultado: v <= 2 ? "aviso" : "nc", criterio: "≤ 1 Ω" },
  },
  {
    chave: "aterramento",
    nome: "Resistência de aterramento",
    unidade: "Ω",
    grupo: "Segurança",
    instrumento: "Terrômetro",
    parametros: [],
    referencia: "Valor de referência usual; depende do esquema (TN/TT) e da concessionária",
    conferir: true,
    avaliar: (v) =>
      v <= 10 ? { resultado: "ok", criterio: "≤ 10 Ω" } : { resultado: v <= 25 ? "aviso" : "nc", criterio: "≤ 10 Ω (referência)" },
  },
  {
    chave: "dr_tempo",
    nome: "DR — tempo de disparo a IΔn",
    unidade: "ms",
    grupo: "Proteção",
    instrumento: "Testador de DR",
    parametros: [],
    referencia: "NBR NM 61008 — DR de uso geral: até 300 ms a IΔn",
    conferir: true,
    avaliar: (v) => (v <= 300 ? { resultado: "ok", criterio: "≤ 300 ms" } : { resultado: "nc", criterio: "≤ 300 ms" }),
  },
  {
    chave: "dr_corrente",
    nome: "DR — corrente de disparo",
    unidade: "mA",
    grupo: "Proteção",
    instrumento: "Testador de DR",
    parametros: [{ chave: "idn", rotulo: "Sensibilidade (IΔn)", opcoes: [30, 100, 300], padrao: 30, unidade: "mA" }],
    referencia: "NBR NM 61008 — disparo entre 50% e 100% de IΔn",
    conferir: true,
    avaliar: (v, p) => {
      const idn = p.idn ?? 30;
      const criterio = `entre ${fmt(idn / 2)} e ${fmt(idn)} mA`;
      return v >= idn / 2 && v <= idn ? { resultado: "ok", criterio } : { resultado: "nc", criterio };
    },
  },
  {
    chave: "temperatura",
    nome: "Temperatura de conexão/disjuntor",
    unidade: "°C",
    grupo: "Qualidade",
    instrumento: "Termômetro infravermelho / termovisor",
    parametros: [],
    referencia: "Referência de campo; conferir limite do fabricante",
    conferir: true,
    avaliar: (v) =>
      v < 60 ? { resultado: "ok", criterio: "< 60 °C" } : { resultado: v <= 70 ? "aviso" : "nc", criterio: "< 60 °C (acima de 70 °C: crítico)" },
  },
  {
    chave: "fator_potencia",
    nome: "Fator de potência",
    unidade: "",
    grupo: "Qualidade",
    instrumento: "Analisador de energia / alicate wattímetro",
    parametros: [],
    referencia: "Referência regulatória de 0,92 (aplicável a consumidores do grupo A)",
    conferir: true,
    avaliar: (v) => (v >= 0.92 ? { resultado: "ok", criterio: "≥ 0,92" } : { resultado: "aviso", criterio: "≥ 0,92 (referência)" }),
  },
  {
    chave: "desequilibrio",
    nome: "Desequilíbrio de corrente entre fases",
    unidade: "%",
    grupo: "Qualidade",
    instrumento: "Alicate amperímetro",
    parametros: [],
    referencia: "Boa prática de balanceamento de cargas",
    conferir: true,
    avaliar: (v) =>
      v <= 10 ? { resultado: "ok", criterio: "≤ 10%" } : { resultado: v <= 20 ? "aviso" : "nc", criterio: "≤ 10% (acima de 20%: rebalancear)" },
  },
  {
    chave: "outro",
    nome: "Outra medição",
    unidade: "",
    grupo: "Outro",
    instrumento: "",
    parametros: [],
    referencia: "Limites informados pelo eletricista",
    avaliar: () => ({ resultado: "ok", criterio: "sem limite definido" }),
  },
];

export const tipoMedicao = (chave: string) => TIPOS_MEDICAO.find((t) => t.chave === chave) ?? TIPOS_MEDICAO.at(-1)!;

/** Avalia uma medição; limites manuais (mín./máx.) têm prioridade sobre os padrões do tipo. */
export function avaliarMedicao(
  tipo: string,
  valor: number,
  parametros: Record<string, number> = {},
  limiteMin?: number | null,
  limiteMax?: number | null,
): Avaliacao {
  if (limiteMin != null || limiteMax != null) {
    const partes = [limiteMin != null && `≥ ${fmt(limiteMin)}`, limiteMax != null && `≤ ${fmt(limiteMax)}`].filter(Boolean);
    const criterio = `${partes.join(" e ")} (limite informado)`;
    const ok = (limiteMin == null || valor >= limiteMin) && (limiteMax == null || valor <= limiteMax);
    return { resultado: ok ? "ok" : "nc", criterio };
  }
  const t = tipoMedicao(tipo);
  const p = Object.fromEntries(t.parametros.map((x) => [x.chave, parametros[x.chave] ?? x.padrao]));
  return t.avaliar(valor, p);
}

/** Desequilíbrio percentual = maior desvio em relação à média ÷ média. */
export function desequilibrioPercentual(correntes: number[]) {
  const v = correntes.filter((c) => c > 0);
  if (v.length < 2) return 0;
  const media = v.reduce((s, c) => s + c, 0) / v.length;
  return (Math.max(...v.map((c) => Math.abs(c - media))) / media) * 100;
}

export function resumoResultados(lista: { resultado: string }[]) {
  const n = { ok: 0, aviso: 0, nc: 0 };
  for (const m of lista) if (m.resultado in n) n[m.resultado as Resultado]++;
  const geral: Resultado = n.nc ? "nc" : n.aviso ? "aviso" : "ok";
  return { ...n, total: lista.length, geral };
}
