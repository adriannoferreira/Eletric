/**
 * Limites de fornecimento em baixa tensão e categorias de atendimento da
 * Equatorial no PARÁ (rede 220/127 V), conforme NT.00001 rev. 09:
 * itens 5.5, 6.2, 6.3.8.8 e TABELA 2 (dimensionamento por CARGA INSTALADA).
 */
import { ref } from "./normas";

export type TipoLigacao = "monofasico" | "bifasico" | "trifasico";

export const ROTULO_LIGACAO: Record<TipoLigacao, string> = {
  monofasico: "Monofásico",
  bifasico: "Bifásico",
  trifasico: "Trifásico",
};

/** Tensões e condutores por tipo de ligação no Pará (6.2.1.1 a 6.2.1.3). */
export const LIGACOES_PA: Record<
  TipoLigacao,
  { tensao: string; condutores: string; limiteKW: number; descricao: string; ref: string }
> = {
  monofasico: {
    tensao: "127 V (fase-neutro)",
    condutores: "2 condutores: 1 fase + 1 neutro",
    limiteKW: 10,
    descricao: "Até 10 kW de carga instalada, sem os equipamentos restritos do item 6.2.1.1.",
    ref: ref("NT.00001", "item 6.2.1.1"),
  },
  bifasico: {
    tensao: "220/127 V",
    condutores: "3 condutores: 2 fases + 1 neutro",
    limiteKW: 15,
    descricao: "Acima de 10 kW até 15 kW, incluindo os equipamentos não permitidos no monofásico, sem os restritos do item 6.2.1.2.",
    ref: ref("NT.00001", "item 6.2.1.2"),
  },
  trifasico: {
    tensao: "220/127 V",
    condutores: "4 condutores: 3 fases + 1 neutro",
    limiteKW: 75,
    descricao: "Até 75 kW de carga instalada, sem os equipamentos restritos do item 6.2.1.3.",
    ref: ref("NT.00001", "item 6.2.1.3"),
  },
};

/** Restrições por tipo de ligação (equipamento individual). */
export const RESTRICOES = {
  monofasico: [
    "Motor monofásico acima de 3 cv (em 127 V)",
    "Aparelho com potência individual acima de 5 kVA",
    "Máquina de solda a transformador acima de 4 kVA",
    "Raios-X acima de 4 kVA sem transformador isolador e estabilizador",
  ],
  bifasico: [
    "Motor com potência individual acima de 5 cv",
    "Aparelho com potência individual acima de 7 kVA",
    "Raios-X acima de 7 kVA sem transformador isolador e estabilizador",
  ],
  trifasico: [
    "Equipamentos não permitidos no bifásico, se alimentados fase-neutro",
    "Motor trifásico acima de 20 cv (em 220 V)",
    "Aparelho trifásico acima de 15 kVA (em 220 V)",
    "Máquina de solda a transformador acima de 15 kVA",
    "Máquina de solda trifásica com ponte retificadora acima de 30 kVA",
    "Motor monofásico acima de 5 cv",
    "Raios-X trifásico acima de 20 kVA sem transformador isolador e estabilizador",
  ],
} as const;

/** Linha da TABELA 2 (127/220 V — Pará), método de cálculo: carga instalada. */
export interface LinhaTabela2 {
  tipo: TipoLigacao;
  /** Faixa de carga instalada (kW): mínimo exclusivo, máximo inclusivo. */
  cargaDeKW: number;
  cargaAteKW: number;
  disjuntorA: number;
  /** Ramal de conexão (fornecido e instalado pela concessionária — item 6.3.2.3). */
  ramal: {
    cobreConcentricoMm2: number | null;
    cobreMultiplexadoMm2: number | null;
    aluminio: { tipo: "duplex" | "triplex" | "quadruplex"; mm2: number } | null;
  };
  /** Eletroduto de entrada em aço galvanizado (polegadas). */
  eletrodutoAco: string;
  /** Condutor de cobre isolado mínimo do cliente: fase (neutro), mm², 1 kV / 90 °C (Nota 22). */
  condutorCliente: string;
  /** Condutor de aterramento em aço cobreado (mm²). */
  aterramentoMm2: number;
  /** Eletroduto do condutor de aterramento (polegadas). */
  eletrodutoAterramento: string;
  observacao?: string;
}

const TAB2 = ref("NT.00001", "TABELA 2");

export const TABELA_2: LinhaTabela2[] = [
  { tipo: "monofasico", cargaDeKW: 0, cargaAteKW: 3.5, disjuntorA: 32, ramal: { cobreConcentricoMm2: 6, cobreMultiplexadoMm2: 6, aluminio: { tipo: "duplex", mm2: 10 } }, eletrodutoAco: '3/4"', condutorCliente: "6(6)", aterramentoMm2: 6, eletrodutoAterramento: '1/2"' },
  { tipo: "monofasico", cargaDeKW: 3.5, cargaAteKW: 7, disjuntorA: 63, ramal: { cobreConcentricoMm2: 10, cobreMultiplexadoMm2: 10, aluminio: { tipo: "duplex", mm2: 10 } }, eletrodutoAco: '3/4"', condutorCliente: "10(10)", aterramentoMm2: 10, eletrodutoAterramento: '1/2"' },
  { tipo: "monofasico", cargaDeKW: 7, cargaAteKW: 10, disjuntorA: 80, ramal: { cobreConcentricoMm2: null, cobreMultiplexadoMm2: 10, aluminio: { tipo: "duplex", mm2: 16 } }, eletrodutoAco: '3/4"', condutorCliente: "10(10)", aterramentoMm2: 10, eletrodutoAterramento: '1/2"' },
  { tipo: "bifasico", cargaDeKW: 0, cargaAteKW: 10, disjuntorA: 50, ramal: { cobreConcentricoMm2: null, cobreMultiplexadoMm2: 6, aluminio: { tipo: "triplex", mm2: 10 } }, eletrodutoAco: '1"', condutorCliente: "10(10)", aterramentoMm2: 10, eletrodutoAterramento: '1/2"', observacao: "Carga até 10 kW com opção do cliente pelo bifásico: o cliente paga a diferença do sistema de medição e a adaptação da rede (Nota 20 da Tabela 2)." },
  { tipo: "bifasico", cargaDeKW: 10, cargaAteKW: 12, disjuntorA: 63, ramal: { cobreConcentricoMm2: null, cobreMultiplexadoMm2: 10, aluminio: { tipo: "triplex", mm2: 16 } }, eletrodutoAco: '1"', condutorCliente: "10(10)", aterramentoMm2: 10, eletrodutoAterramento: '1/2"' },
  { tipo: "bifasico", cargaDeKW: 12, cargaAteKW: 15, disjuntorA: 70, ramal: { cobreConcentricoMm2: null, cobreMultiplexadoMm2: 10, aluminio: { tipo: "triplex", mm2: 16 } }, eletrodutoAco: '1"', condutorCliente: "10(10)", aterramentoMm2: 10, eletrodutoAterramento: '1/2"' },
  { tipo: "trifasico", cargaDeKW: 0, cargaAteKW: 15, disjuntorA: 40, ramal: { cobreConcentricoMm2: null, cobreMultiplexadoMm2: 6, aluminio: { tipo: "quadruplex", mm2: 10 } }, eletrodutoAco: '1.1/2"', condutorCliente: "6(6)", aterramentoMm2: 6, eletrodutoAterramento: '1/2"', observacao: "Carga até 15 kW com opção do cliente pelo trifásico: o cliente paga a diferença do sistema de medição e a adaptação da rede (Nota 21 da Tabela 2)." },
  { tipo: "trifasico", cargaDeKW: 15, cargaAteKW: 17, disjuntorA: 50, ramal: { cobreConcentricoMm2: null, cobreMultiplexadoMm2: 10, aluminio: { tipo: "quadruplex", mm2: 16 } }, eletrodutoAco: '1.1/2"', condutorCliente: "10(10)", aterramentoMm2: 6, eletrodutoAterramento: '1/2"' },
  { tipo: "trifasico", cargaDeKW: 17, cargaAteKW: 24, disjuntorA: 70, ramal: { cobreConcentricoMm2: null, cobreMultiplexadoMm2: 16, aluminio: { tipo: "quadruplex", mm2: 25 } }, eletrodutoAco: '2"', condutorCliente: "16(16)", aterramentoMm2: 16, eletrodutoAterramento: '1"' },
  { tipo: "trifasico", cargaDeKW: 24, cargaAteKW: 35, disjuntorA: 100, ramal: { cobreConcentricoMm2: null, cobreMultiplexadoMm2: 25, aluminio: { tipo: "quadruplex", mm2: 50 } }, eletrodutoAco: '2"', condutorCliente: "25(25)", aterramentoMm2: 25, eletrodutoAterramento: '1"' },
  { tipo: "trifasico", cargaDeKW: 35, cargaAteKW: 44, disjuntorA: 125, ramal: { cobreConcentricoMm2: null, cobreMultiplexadoMm2: 35, aluminio: { tipo: "quadruplex", mm2: 70 } }, eletrodutoAco: '2.1/2"', condutorCliente: "35(25)", aterramentoMm2: 25, eletrodutoAterramento: '1"' },
  { tipo: "trifasico", cargaDeKW: 44, cargaAteKW: 52, disjuntorA: 150, ramal: { cobreConcentricoMm2: null, cobreMultiplexadoMm2: 50, aluminio: { tipo: "quadruplex", mm2: 70 } }, eletrodutoAco: '3"', condutorCliente: "50(25)", aterramentoMm2: 25, eletrodutoAterramento: '1"' },
  { tipo: "trifasico", cargaDeKW: 52, cargaAteKW: 61, disjuntorA: 175, ramal: { cobreConcentricoMm2: null, cobreMultiplexadoMm2: 70, aluminio: { tipo: "quadruplex", mm2: 95 } }, eletrodutoAco: '3"', condutorCliente: "70(35)", aterramentoMm2: 35, eletrodutoAterramento: '1"' },
  { tipo: "trifasico", cargaDeKW: 61, cargaAteKW: 75, disjuntorA: 200, ramal: { cobreConcentricoMm2: null, cobreMultiplexadoMm2: 70, aluminio: { tipo: "quadruplex", mm2: 120 } }, eletrodutoAco: '3"', condutorCliente: "70(35)", aterramentoMm2: 35, eletrodutoAterramento: '1"' },
];

export const REF_TABELA_2 = TAB2;

/** Premissas da Tabela 2 (Nota 23 e Nota 22). */
export const PREMISSAS_TABELA_2 = [
  "Monofásico e bifásico: fator de potência 1, fator de demanda 80%, queda de tensão 2% na medição (Nota 23).",
  "Trifásico: fator de potência 0,92, fator de demanda 80%, queda de tensão 2% na medição (Nota 23).",
  "Condutor do cliente dimensionado para isolação 1 kV e 90 °C; outra isolação exige verificar a seção (Nota 22).",
  "Ramal de conexão: cobre até 2 km da orla marítima; alumínio multiplexado a partir de 2 km (colunas da Tabela 2). O ramal é fornecido e instalado pela concessionária (item 6.3.2.3).",
];

export type TipoEquipamento =
  | "motor"
  | "aparelho"
  | "solda_transformador"
  | "solda_retificadora"
  | "solda_motor"
  | "raio_x"
  | "betoneira";

export interface Equipamento {
  descricao: string;
  tipo: TipoEquipamento;
  /** 1 = monofásico (127 V F-N), 2 = bifásico (220 V entre fases), 3 = trifásico. */
  fases: 1 | 2 | 3;
  cv?: number;
  kva?: number;
  /** Raios-X ligado por transformador isolador e estabilizador (não entra na restrição). */
  comTransformadorIsolador?: boolean;
}

export interface ResultadoCategoria {
  tipo: TipoLigacao | "media_tensao";
  tensao: string;
  condutores: string;
  linha: LinhaTabela2 | null;
  motivos: string[];
  /** Situações que exigem estudo da concessionária antes da ligação (item 5.5 / Nota 11). */
  estudos: string[];
  /** Impedem a ligação em baixa tensão como padrão comum. */
  bloqueios: string[];
  avisos: string[];
  referencias: string[];
}

const ordem: TipoLigacao[] = ["monofasico", "bifasico", "trifasico"];

/**
 * Enquadra a unidade consumidora (área urbana, Pará) no tipo de ligação e na faixa da TABELA 2.
 * O dimensionamento oficial do padrão é pela CARGA INSTALADA; a demanda (kVA) é usada
 * apenas no critério de estudo do item 5.5.1.1 (trifásico com demanda ≥ 22 kVA).
 */
export function categoriaAtendimento(
  cargaInstaladaKW: number,
  demandaKVA: number,
  equipamentos: Equipamento[] = [],
  opcoes: { opcaoCliente?: TipoLigacao; area?: "urbana" | "rural" } = {},
): ResultadoCategoria {
  const motivos: string[] = [];
  const estudos: string[] = [];
  const bloqueios: string[] = [];
  const avisos: string[] = [];
  const referencias = new Set<string>([ref("NT.00001", "item 6.2"), REF_TABELA_2]);

  if (cargaInstaladaKW > 75) {
    bloqueios.push(
      `Carga instalada de ${cargaInstaladaKW.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kW acima de 75 kW: fornecimento em média tensão (NT.00002), fora do padrão de baixa tensão.`,
    );
    referencias.add(ref("NT.00001", "item 6.2.1"));
    return {
      tipo: "media_tensao",
      tensao: "Média tensão",
      condutores: "—",
      linha: null,
      motivos,
      estudos,
      bloqueios,
      avisos,
      referencias: [...referencias],
    };
  }

  let tipo: TipoLigacao = cargaInstaladaKW <= 10 ? "monofasico" : cargaInstaladaKW <= 15 ? "bifasico" : "trifasico";
  motivos.push(`Carga instalada de ${cargaInstaladaKW.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kW → ${ROTULO_LIGACAO[tipo].toLowerCase()} pela faixa de carga (${LIGACOES_PA[tipo].ref}).`);

  const sobe = (novo: TipoLigacao, motivo: string, referencia: string) => {
    if (ordem.indexOf(novo) > ordem.indexOf(tipo)) {
      tipo = novo;
      motivos.push(motivo);
      referencias.add(referencia);
    }
  };

  for (const e of equipamentos) {
    const kva = e.kva ?? 0;
    const cv = e.cv ?? 0;
    const nome = e.descricao || e.tipo;
    if (e.fases === 3) {
      sobe("trifasico", `${nome} é trifásico: fornecimento a 4 fios (3 fases + neutro), independentemente da carga.`, ref("NT.00001", "6.2.1.1 Nota 6 / 6.2.1.2 Nota 9"));
    }
    if (e.fases === 2) {
      sobe("bifasico", `${nome} é ligado em 220 V entre fases: na rede 220/127 V exige no mínimo 2 fases.`, ref("NT.00001", "item 6.2.1.2"));
    }
    // Restrições do monofásico (6.2.1.1)
    const raioXRestrito = e.tipo === "raio_x" && !e.comTransformadorIsolador;
    if (
      (e.tipo === "motor" && e.fases === 1 && cv > 3) ||
      (e.tipo === "aparelho" && kva > 5) ||
      (e.tipo === "solda_transformador" && kva > 4) ||
      (raioXRestrito && kva > 4)
    ) {
      sobe("bifasico", `${nome} excede o limite do monofásico (item 6.2.1.1).`, ref("NT.00001", "item 6.2.1.1"));
    }
    // Restrições do bifásico (6.2.1.2)
    if ((e.tipo === "motor" && cv > 5) || (e.tipo === "aparelho" && kva > 7) || (raioXRestrito && kva > 7)) {
      sobe("trifasico", `${nome} excede o limite do bifásico (item 6.2.1.2).`, ref("NT.00001", "item 6.2.1.2"));
    }
    // Restrições do trifásico (6.2.1.3) → estudo específico (Nota 11)
    const restritoTri =
      (e.tipo === "motor" && e.fases === 3 && cv > 20) ||
      (e.tipo === "aparelho" && e.fases === 3 && kva > 15) ||
      (e.tipo === "solda_transformador" && kva > 15) ||
      (e.tipo === "solda_retificadora" && kva > 30) ||
      (e.tipo === "motor" && e.fases === 1 && cv > 5) ||
      (raioXRestrito && e.fases === 3 && kva > 20) ||
      (e.fases === 1 && ((e.tipo === "motor" && cv > 5) || (e.tipo === "aparelho" && kva > 7)));
    if (restritoTri) {
      estudos.push(`${nome}: acima dos limites do item 6.2.1.3 — a ligação depende de estudo específico da Equatorial (Nota 11).`);
      referencias.add(ref("NT.00001", "item 6.2.1.3 e Nota 11"));
    }
    // Ligações com necessidade de estudo (5.5)
    if (e.tipo === "motor") {
      if (e.fases === 1 && cv >= 2) estudos.push(`Motor monofásico de ${cv} cv (≥ 2 cv): exige estudo de rede (item 5.5.1.2).`);
      if (e.fases === 2 && cv >= 3) estudos.push(`Motor bifásico de ${cv} cv (≥ 3 cv): exige estudo de rede (item 5.5.1.3).`);
      if (e.fases === 3 && cv >= 15) estudos.push(`Motor trifásico de ${cv} cv (≥ 15 cv): exige estudo de rede (item 5.5.1.4).`);
      if (e.fases === 3 && cv > 5) {
        avisos.push(`${nome}: motor trifásico acima de 5 cv precisa de dispositivo de redução da corrente de partida (item 6.3.8.8 b, TABELA 7).`);
        referencias.add(ref("NT.00001", "item 6.3.8.8 e TABELA 7"));
      }
      if (e.fases === 3 && cv >= 5) avisos.push(`${nome}: proteção contra falta de fase antes e próxima do motor (item 6.3.8.8 g).`);
    }
    if (e.tipo === "raio_x" || e.tipo === "solda_transformador") {
      estudos.push(`${nome}: cargas perturbadoras (raios-X ou solda a transformador) exigem estudo independente da potência (item 5.5).`);
    }
    if (e.tipo === "solda_transformador" || e.tipo === "solda_retificadora" || e.tipo === "solda_motor" || e.tipo === "betoneira") {
      if (tipo === "trifasico" || e.fases === 3) estudos.push(`${nome} declarado em ligação trifásica: exige estudo (item 5.5.1.1).`);
    }
  }

  if (opcoes.opcaoCliente && ordem.indexOf(opcoes.opcaoCliente) > ordem.indexOf(tipo)) {
    tipo = opcoes.opcaoCliente;
    motivos.push(`Opção do cliente por ${ROTULO_LIGACAO[tipo].toLowerCase()}: paga a diferença do sistema de medição e a adaptação da rede (Notas 20/21 da Tabela 2; item 6.2.2.1).`);
    referencias.add(ref("NT.00001", "item 6.2.2.1"));
  }

  if (tipo === "trifasico" && demandaKVA >= 22) {
    estudos.push(`Ligação trifásica com demanda estimada de ${demandaKVA.toFixed(1)} kVA (≥ 22 kVA): exige estudo de rede (item 5.5.1.1).`);
  }
  if (estudos.length) referencias.add(ref("NT.00001", "item 5.5"));

  if (opcoes.area === "rural") {
    avisos.push(
      "Área rural: atendimento por transformador exclusivo, monofásico em 127 V ou 220 V até 50 kW de carga instalada, com padrão conforme NT.00002 (item 6.2.1.4). Esta faixa da Tabela 2 vale para área urbana.",
    );
    referencias.add(ref("NT.00001", "item 6.2.1.4"));
  }

  const linhas = TABELA_2.filter((l) => l.tipo === tipo);
  const linha =
    linhas.find((l) => cargaInstaladaKW > l.cargaDeKW && cargaInstaladaKW <= l.cargaAteKW) ??
    (cargaInstaladaKW <= linhas[0].cargaAteKW ? linhas[0] : linhas[linhas.length - 1]);

  return {
    tipo,
    tensao: LIGACOES_PA[tipo].tensao,
    condutores: LIGACOES_PA[tipo].condutores,
    linha,
    motivos,
    estudos: [...new Set(estudos)],
    bloqueios,
    avisos: [...new Set(avisos)],
    referencias: [...referencias],
  };
}

/**
 * Potência disponibilizada (Grupo B) — NT.00020 rev. 06, item 6.1.5 e):
 * kVA = I_disjuntor × V_nominal × NF / 1000 (NF = 1 ou √3). Limita a potência da microgeração.
 * Aqui: monofásico 127 V (NF 1); bifásico 220 V entre fases (NF 1); trifásico 220 V × √3.
 */
export function potenciaDisponibilizadaKVA(disjuntorA: number, tipo: TipoLigacao) {
  if (tipo === "monofasico") return (disjuntorA * 127) / 1000;
  if (tipo === "bifasico") return (disjuntorA * 220) / 1000;
  return (disjuntorA * 220 * Math.sqrt(3)) / 1000;
}
