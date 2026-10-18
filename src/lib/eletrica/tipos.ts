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

/**
 * Caixa do quadro. DIN: `fileiras` trilhos × `modulosPorFileira` módulos de 18 mm.
 * NEMA: `fileiras` colunas de disjuntores encaixados no barramento × `modulosPorFileira`
 * posições por coluna, mais um trilho DIN auxiliar opcional (`trilhoAux` módulos)
 * para DR/DPS. `caixaId` aponta para o catálogo (src/lib/eletrica/caixas.ts);
 * "personalizado" ou vazio = medidas livres.
 */
export const ModeloSchema = z.object({
  fileiras: z.number().int().min(1).max(10).catch(1),
  modulosPorFileira: z.number().int().min(2).max(36).catch(12),
  instalacao: z.enum(["embutir", "sobrepor"]).catch("embutir"),
  caixaId: z.string().nullable().catch(null),
  padrao: z.enum(["DIN", "NEMA"]).catch("DIN"),
  material: z.enum(["pvc", "metalico"]).catch("pvc"),
  ip: z.enum(["IP40", "IP54", "IP65"]).catch("IP40"),
  trilhoAux: z.number().int().min(0).max(24).catch(0),
  /** Linha de referência (aparência: cor, porta, espelho). Vazio = deduzida do material/instalação. */
  linha: z.string().nullable().catch(null),
  /** Orientação da caixa. Vazio = deduzida da proporção trilhos × módulos. */
  orientacao: z.enum(["horizontal", "vertical", "quadrado"]).nullable().catch(null),
  /** Por onde entram/saem os cabos (eletrodutos). */
  saidaCabos: z.enum(["baixo", "cima"]).catch("baixo"),
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
  /** Preferências da caixa gerada (o tamanho é escolhido pelo app). */
  caixaInstalacao: z.enum(["embutir", "sobrepor"]).catch("embutir"),
  caixaMaterial: z.enum(["pvc", "metalico"]).catch("pvc"),
  caixaIP: z.enum(["IP40", "IP54", "IP65"]).catch("IP40"),
  /** Caixa fixa escolhida pelo usuário (catálogo). Vazio = o app escolhe a menor que caiba. */
  caixaId: z.string().nullable().catch(null),
});
export type Obra = z.infer<typeof ObraSchema>;

export const ProjetoObraSchema = z.object({
  obra: ObraSchema.catch(ObraSchema.parse({})),
  ambientes: z.array(AmbienteSchema).catch([]),
  cargas: z.array(CargaSchema).catch([]),
});
export type ProjetoObra = z.infer<typeof ProjetoObraSchema>;

// ---------------------------------------------------------------------------
// Inspeção (NBR 5410 seção 7) e laudo
// ---------------------------------------------------------------------------

export const RespostaInspecaoSchema = z.object({
  itemId: z.string(),
  status: z.enum(["ok", "nc", "na"]).nullable().catch(null),
  valor: z.number().nullable().catch(null),
  valor2: z.number().nullable().catch(null),
  obs: z.string().catch(""),
});
export type RespostaInspecao = z.infer<typeof RespostaInspecaoSchema>;

export const InspecaoSchema = z.object({
  id: z.string().catch(() => novoId("i")),
  data: z.string().catch(() => new Date().toISOString()),
  responsavel: z.string().catch(""),
  /** Ids (texto) dos equipamentos/instrumentos usados. */
  instrumentos: z.array(z.string()).catch([]),
  tensaoEnsaioV: z.number().catch(500),
  respostas: z.array(RespostaInspecaoSchema).catch([]),
  analiseIA: z.string().nullable().catch(null),
});
export type Inspecao = z.infer<typeof InspecaoSchema>;

export const NaoConformidadeSchema = z.object({
  descricao: z.string().catch(""),
  risco: z.enum(["alto", "medio", "baixo"]).catch("medio"),
  recomendacao: z.string().catch(""),
});
export type NaoConformidade = z.infer<typeof NaoConformidadeSchema>;

export const LaudoSchema = z.object({
  inspecaoId: z.string().nullable().catch(null),
  objetivo: z.string().catch(""),
  analise: z.string().catch(""),
  naoConformidades: z.array(NaoConformidadeSchema).catch([]),
  conclusao: z.enum(["conforme", "ressalvas", "nao_conforme"]).catch("ressalvas"),
  textoConclusao: z.string().catch(""),
  periodicidade: z.string().catch(""),
  atualizadoEm: z.string().catch(""),
});
export type Laudo = z.infer<typeof LaudoSchema>;

/**
 * Dados preparados para a ART (CREA) / TRT (CFT). O app NÃO emite o documento:
 * só organiza os dados; o nº é informado pelo profissional depois de emitir.
 */
export const RegistroArtSchema = z.object({
  tipo: z.enum(["TRT", "ART"]).catch("TRT"),
  uf: z.string().catch(""),
  /** Link do sistema do conselho salvo pelo próprio usuário. */
  linkConselho: z.string().catch(""),
  atividade: z.enum(["projeto", "execucao", "projeto_execucao", "manutencao", "inspecao"]).catch("projeto_execucao"),
  enderecoObra: z.string().catch(""),
  inicio: z.string().catch(""),
  fim: z.string().catch(""),
  descricao: z.string().catch(""),
  /** Preenchidos pelo profissional após emitir no sistema oficial. */
  numero: z.string().catch(""),
  dataEmissao: z.string().catch(""),
});
export type RegistroArt = z.infer<typeof RegistroArtSchema>;

// ---------------------------------------------------------------------------
// Manutenção preventiva
// ---------------------------------------------------------------------------

export const PERIODICIDADES = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 } as const;
export type Periodicidade = keyof typeof PERIODICIDADES;

export const RespostaManutencaoSchema = z.object({
  itemId: z.string(),
  status: z.enum(["ok", "corrigido", "pendente"]).nullable().catch(null),
  valor: z.number().nullable().catch(null),
  obs: z.string().catch(""),
});
export type RespostaManutencao = z.infer<typeof RespostaManutencaoSchema>;

export const VisitaSchema = z.object({
  id: z.string().catch(() => novoId("v")),
  numero: z.number().int().catch(1),
  data: z.string().catch(() => new Date().toISOString()),
  tecnico: z.string().catch(""),
  respostas: z.array(RespostaManutencaoSchema).catch([]),
  trocas: z.array(z.object({ peca: z.string().catch(""), quantidade: z.number().catch(1) })).catch([]),
  recomendacoes: z.string().catch(""),
});
export type Visita = z.infer<typeof VisitaSchema>;

export const ManutencaoSchema = z.object({
  periodicidade: z.enum(["mensal", "trimestral", "semestral", "anual"]).catch("semestral"),
  /** AAAA-MM-DD */
  proximaVisita: z.string().catch(""),
  visitas: z.array(VisitaSchema).catch([]),
});
export type Manutencao = z.infer<typeof ManutencaoSchema>;

// ---------------------------------------------------------------------------
// Ligações internas do quadro (cores, ajustes manuais e montagem)
// ---------------------------------------------------------------------------

/** Cores padrão (editáveis). NBR 5410 6.1.5.3: neutro azul-claro, PE verde-amarelo/verde, fases em outras cores. */
export const CORES_PADRAO = { R: "preto", S: "vermelho", T: "branco", N: "azul", PE: "verde-amarelo", retorno: "amarelo" } as const;

export const CoresCaboSchema = z.object({
  R: z.string().catch(CORES_PADRAO.R),
  S: z.string().catch(CORES_PADRAO.S),
  T: z.string().catch(CORES_PADRAO.T),
  N: z.string().catch(CORES_PADRAO.N),
  PE: z.string().catch(CORES_PADRAO.PE),
  retorno: z.string().catch(CORES_PADRAO.retorno),
});
export type CoresCabo = z.infer<typeof CoresCaboSchema>;

export const AjusteLigacaoSchema = z.object({
  cor: z.string().nullable().catch(null),
  secao: z.number().positive().nullable().catch(null),
  /** Para a alimentação de uma sequência de disjuntores: forçar cabos em vez do pente. */
  modo: z.enum(["cabo", "pente"]).nullable().catch(null),
});
export type AjusteLigacao = z.infer<typeof AjusteLigacaoSchema>;

export const AjustePecaSchema = z.object({
  /** Alimentar por ponte (jumper) a partir do vizinho, em vez de pente. */
  jumper: z.boolean().catch(false),
  /** Alimentação chegando pelos terminais de baixo (carga) — registra inversão encontrada na obra. */
  inverter: z.boolean().catch(false),
});
export type AjustePeca = z.infer<typeof AjustePecaSchema>;

export const LigacoesConfigSchema = z.object({
  cores: CoresCaboSchema.catch(CoresCaboSchema.parse({})),
  /** Ajustes por id de ligação. */
  ajustes: z.record(z.string(), AjusteLigacaoSchema).catch({}),
  /** Ajustes por id de componente. */
  pecas: z.record(z.string(), AjustePecaSchema).catch({}),
  /** Barra de onde sai o neutro de cada circuito (registro "como está na obra"); vazio = automático. */
  neutros: z.record(z.string(), z.string()).catch({}),
  /** Ids das ligações já feitas na montagem. */
  feitas: z.array(z.string()).catch([]),
});
export type LigacoesConfig = z.infer<typeof LigacoesConfigSchema>;

export const QuadroDadosSchema = z.object({
  versao: z.number().catch(VERSAO_QUADRO),
  alimentacao: AlimentacaoSchema.catch(AlimentacaoSchema.parse({})),
  modelo: ModeloSchema.catch(ModeloSchema.parse({})),
  componentes: z.array(ComponenteSchema).catch([]),
  circuitos: z.array(CircuitoSchema).catch([]),
  /** Dados da obra quando o quadro foi gerado pelo assistente de projeto. */
  projeto: ProjetoObraSchema.nullable().catch(null),
  /** Concessionária do quadro montado do zero (com projeto da obra, vale a da obra). null = Equatorial Pará. */
  concessionaria: z.string().nullable().catch(null),
  /** Último memorial descritivo gerado pela IA (vale também para quadros montados à mão). */
  memorial: z.object({ texto: z.string(), geradoEm: z.string() }).nullable().catch(null),
  /** Itens da lista de compras já comprados (chaves de `montarListaCompras`). */
  compras: z.array(z.string()).catch([]),
  /** Histórico de inspeções (mais recente por último). */
  inspecoes: z.array(InspecaoSchema).catch([]),
  laudo: LaudoSchema.nullable().catch(null),
  art: RegistroArtSchema.nullable().catch(null),
  manutencao: ManutencaoSchema.nullable().catch(null),
  /** Cores, ajustes e progresso das ligações internas (null = tudo automático). */
  ligacoes: LigacoesConfigSchema.nullable().catch(null),
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
    concessionaria: null,
    memorial: null,
    compras: [],
    inspecoes: [],
    laudo: null,
    art: null,
    manutencao: null,
    ligacoes: null,
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
