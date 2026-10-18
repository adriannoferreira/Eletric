import { z } from "zod";
import { METODOS } from "./tabelas";

export const FASES = ["R", "S", "T"] as const;
export type Fase = (typeof FASES)[number];

export const TIPOS_CIRCUITO = {
  iluminacao: "Iluminação",
  tug: "Tomadas de uso geral (TUG)",
  tue: "Tomada/uso específico (TUE)",
} as const;
export type TipoCircuito = keyof typeof TIPOS_CIRCUITO;

/** Ligação do circuito: fase-neutro, fase-fase (2 fases) ou trifásico. */
export const LIGACOES = { FN: "Fase + neutro", FF: "Fase + fase (2 fases)", "3F": "Trifásico (3 fases)" } as const;
export type Ligacao = keyof typeof LIGACOES;

/**
 * Locais. `molhado` = exige DR em todos os pontos (5.1.3.2.2 a/d);
 * `externo` = tomadas exigem DR (5.1.3.2.2 b).
 */
export const LOCAIS = {
  sala: { nome: "Sala", molhado: false, externo: false },
  quarto: { nome: "Quarto", molhado: false, externo: false },
  escritorio: { nome: "Escritório", molhado: false, externo: false },
  corredor: { nome: "Corredor / hall", molhado: false, externo: false },
  cozinha: { nome: "Cozinha", molhado: true, externo: false },
  copa: { nome: "Copa / copa-cozinha", molhado: true, externo: false },
  banheiro: { nome: "Banheiro (banheira/chuveiro)", molhado: true, externo: false },
  lavanderia: { nome: "Lavanderia", molhado: true, externo: false },
  area_servico: { nome: "Área de serviço", molhado: true, externo: false },
  garagem: { nome: "Garagem", molhado: true, externo: false },
  area_externa: { nome: "Área externa", molhado: false, externo: true },
  varanda: { nome: "Varanda / sacada", molhado: false, externo: true },
  varios: { nome: "Vários ambientes", molhado: false, externo: false },
  outro: { nome: "Outro", molhado: false, externo: false },
} as const;
export type Local = keyof typeof LOCAIS;

const chaves = <T extends object>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

export const AlimentacaoSchema = z.object({
  tipo: z.enum(["monofasico", "bifasico", "trifasico"]).catch("bifasico"),
  tensaoFN: z.number().positive().catch(127),
  tensaoFF: z.number().positive().catch(220),
  esquema: z.enum(["TN-S", "TN-C-S", "TT"]).catch("TN-C-S"),
});
export type Alimentacao = z.infer<typeof AlimentacaoSchema>;

export const ModeloSchema = z.object({
  fileiras: z.number().int().min(1).max(8).catch(1),
  modulosPorFileira: z.number().int().min(4).max(36).catch(12),
  instalacao: z.enum(["embutir", "sobrepor"]).catch("embutir"),
});
export type ModeloQuadro = z.infer<typeof ModeloSchema>;

export const ComponenteSchema = z.object({
  id: z.string().catch(() => novoId("x")),
  pecaId: z.string(),
  fileira: z.number().int().min(0).catch(0),
  posicao: z.number().int().min(0).catch(0),
  fases: z.array(z.enum(FASES)).catch([]),
  /** Circuito protegido por este disjuntor. */
  circuitoId: z.string().nullable().catch(null),
  /** Disjuntor geral do quadro, ou DR geral (protege todos os circuitos). */
  geral: z.boolean().catch(false),
  etiqueta: z.string().catch(""),
});
export type Componente = z.infer<typeof ComponenteSchema>;

export const CircuitoSchema = z.object({
  id: z.string().catch(() => novoId("x")),
  nome: z.string().catch("Circuito"),
  tipo: z.enum(chaves(TIPOS_CIRCUITO)).catch("tug"),
  local: z.enum(chaves(LOCAIS)).catch("outro"),
  potenciaW: z.number().min(0).catch(0),
  fatorPotencia: z.number().min(0.1).max(1).catch(1),
  ligacao: z.enum(chaves(LIGACOES)).catch("FN"),
  comprimentoM: z.number().min(0).catch(10),
  metodo: z.enum(METODOS).catch("B1"),
  /** Nº de circuitos no mesmo eletroduto (incluindo este) — Tabela 42. */
  circuitosAgrupados: z.number().int().min(1).catch(1),
  temperaturaC: z.number().catch(30),
  /** Nº de pontos (tomadas/luminárias) atendidos. */
  quantidadePontos: z.number().int().min(1).catch(1),
  /** Tomada interna que pode alimentar equipamento no exterior (5.1.3.2.2 c). */
  alimentaExterno: z.boolean().catch(false),
  /** Seção que será/foi instalada. Vazio = usar a calculada. */
  secaoAdotada: z.number().nullable().catch(null),
  /** DR (componente) que protege este circuito. */
  drId: z.string().nullable().catch(null),
});
export type Circuito = z.infer<typeof CircuitoSchema>;

export const VERSAO_QUADRO = 1;

// ---------------------------------------------------------------------------
// Dados da obra (gerador de projeto)
// ---------------------------------------------------------------------------

/** Tipos de ambiente do gerador de projeto → local usado pelo motor (DR etc.). */
export const TIPOS_AMBIENTE = {
  sala: { nome: "Sala", local: "sala" },
  quarto: { nome: "Quarto / suíte", local: "quarto" },
  cozinha: { nome: "Cozinha", local: "cozinha" },
  copa: { nome: "Copa / copa-cozinha", local: "copa" },
  banheiro: { nome: "Banheiro", local: "banheiro" },
  area_servico: { nome: "Área de serviço", local: "area_servico" },
  lavanderia: { nome: "Lavanderia", local: "lavanderia" },
  varanda: { nome: "Varanda / sacada", local: "varanda" },
  garagem: { nome: "Garagem", local: "garagem" },
  area_externa: { nome: "Área externa / quintal", local: "area_externa" },
  escritorio: { nome: "Escritório", local: "escritorio" },
  corredor: { nome: "Corredor / hall", local: "corredor" },
  outro: { nome: "Outro", local: "outro" },
} as const satisfies Record<string, { nome: string; local: Local }>;
export type TipoAmbiente = keyof typeof TIPOS_AMBIENTE;

export const AmbienteSchema = z.object({
  id: z.string().catch(() => novoId("a")),
  nome: z.string().catch("Ambiente"),
  tipo: z.enum(chaves(TIPOS_AMBIENTE)).catch("outro"),
  areaM2: z.number().min(0).catch(0),
  /** 0 = estimar pelo quadrado da área. */
  perimetroM: z.number().min(0).catch(0),
  /** Distância aproximada do ambiente até o quadro (comprimento do circuito). */
  distanciaM: z.number().min(0).catch(10),
  /** Ajustes manuais (null = usar o mínimo da NBR 5410 9.5.2). */
  luzVA: z.number().min(0).nullable().catch(null),
  tomadas: z.number().int().min(0).nullable().catch(null),
});
export type Ambiente = z.infer<typeof AmbienteSchema>;

export const CargaSchema = z.object({
  id: z.string().catch(() => novoId("t")),
  nome: z.string().catch("Equipamento"),
  /** Id do preset (chuveiro, ar…) ou "outro". */
  tipo: z.string().catch("outro"),
  potenciaW: z.number().min(0).catch(0),
  fatorPotencia: z.number().min(0.1).max(1).catch(1),
  tensaoV: z.number().positive().catch(220),
  trifasico: z.boolean().catch(false),
  quantidade: z.number().int().min(1).catch(1),
  ambienteId: z.string().nullable().catch(null),
});
export type Carga = z.infer<typeof CargaSchema>;

export const ObraSchema = z.object({
  tipoImovel: z.enum(["casa", "sobrado", "apartamento", "comercio", "outro"]).catch("casa"),
  concessionaria: z.string().catch("outra"),
  tensoes: z.enum(["127/220", "220/380"]).catch("127/220"),
  esquema: z.enum(["TN-S", "TN-C-S", "TT"]).catch("TN-C-S"),
  fornecimentoExistente: z.enum(["desconhecido", "monofasico", "bifasico", "trifasico"]).catch("desconhecido"),
  disjuntorExistenteA: z.number().min(0).nullable().catch(null),
  /** Entrada de energia por linha aérea (DPS exigido — 5.4.2.1). */
  entradaAerea: z.boolean().catch(true),
  metodo: z.enum(METODOS).catch("B1"),
  /** Nº típico de circuitos por eletroduto (Tabela 42). */
  agrupamento: z.number().int().min(1).catch(1),
  /** Proteger todos os circuitos com DR (recomendado) ou só os obrigatórios. */
  drEmTodos: z.boolean().catch(true),
  observacoes: z.string().catch(""),
});
export type Obra = z.infer<typeof ObraSchema>;

export const ProjetoObraSchema = z.object({
  obra: ObraSchema.catch(ObraSchema.parse({})),
  ambientes: z.array(AmbienteSchema).catch([]),
  cargas: z.array(CargaSchema).catch([]),
});
export type ProjetoObra = z.infer<typeof ProjetoObraSchema>;

export const QuadroDadosSchema = z.object({
  versao: z.number().catch(VERSAO_QUADRO),
  alimentacao: AlimentacaoSchema.catch(AlimentacaoSchema.parse({})),
  modelo: ModeloSchema.catch(ModeloSchema.parse({})),
  componentes: z.array(ComponenteSchema).catch([]),
  circuitos: z.array(CircuitoSchema).catch([]),
  /** Dados da obra quando o quadro foi gerado pelo assistente de projeto. */
  projeto: ProjetoObraSchema.nullable().catch(null),
  /** Último memorial descritivo gerado pela IA (vale também para quadros montados à mão). */
  memorial: z.object({ texto: z.string(), geradoEm: z.string() }).nullable().catch(null),
  /** Itens da lista de compras já comprados (chaves de `montarListaCompras`). */
  compras: z.array(z.string()).catch([]),
});
export type QuadroDados = z.infer<typeof QuadroDadosSchema>;

/** Lê o JSON salvo no banco tolerando campos faltando ou de versões antigas. */
export function lerQuadro(bruto: unknown): QuadroDados {
  const obj = bruto && typeof bruto === "object" ? bruto : {};
  const r = QuadroDadosSchema.safeParse(obj);
  if (r.success) return r.data;
  return QuadroDadosSchema.parse({});
}

export function novoQuadro(
  alimentacao: Partial<Alimentacao> = {},
  modelo: Partial<ModeloQuadro> = {},
): QuadroDados {
  return {
    versao: VERSAO_QUADRO,
    alimentacao: AlimentacaoSchema.parse(alimentacao),
    modelo: ModeloSchema.parse(modelo),
    componentes: [],
    circuitos: [],
    projeto: null,
    memorial: null,
    compras: [],
  };
}

export function novoCircuito(parcial: Partial<Circuito> = {}): Circuito {
  return CircuitoSchema.parse({ id: novoId("c"), ...parcial });
}

export function novoId(prefixo: string) {
  return `${prefixo}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Fases disponíveis conforme o tipo de fornecimento. */
export function fasesDisponiveis(a: Alimentacao): Fase[] {
  return a.tipo === "monofasico" ? ["R"] : a.tipo === "bifasico" ? ["R", "S"] : ["R", "S", "T"];
}
