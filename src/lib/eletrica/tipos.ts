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

export const QuadroDadosSchema = z.object({
  versao: z.number().catch(VERSAO_QUADRO),
  alimentacao: AlimentacaoSchema.catch(AlimentacaoSchema.parse({})),
  modelo: ModeloSchema.catch(ModeloSchema.parse({})),
  componentes: z.array(ComponenteSchema).catch([]),
  circuitos: z.array(CircuitoSchema).catch([]),
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
