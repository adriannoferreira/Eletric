import {
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { catalogo } from "./schema";

const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });

export type FontePreco = "manual" | "cotacao" | "ia" | "sinapi";
export type FonteWeb = { loja: string; url: string; preco: number | null };

/** Lojas e distribuidores onde o eletricista cota material. */
export const fornecedores = pgTable("fornecedores", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  whatsapp: text("whatsapp").notNull().default(""),
  cidade: text("cidade").notNull().default(""),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

/** Todo preço que já entrou para um item, de qualquer fonte. */
export const precosHistorico = pgTable("precos_historico", {
  id: serial("id").primaryKey(),
  catalogoId: integer("catalogo_id")
    .notNull()
    .references(() => catalogo.id, { onDelete: "cascade" }),
  preco: money("preco").notNull(),
  fonte: text("fonte").$type<FontePreco>().notNull(),
  fornecedorId: integer("fornecedor_id").references(() => fornecedores.id, { onDelete: "set null" }),
  fornecedorNome: text("fornecedor_nome").notNull().default(""),
  /** Observação ou referência (ex.: "SINAPI 2026-09 PA", texto da loja). */
  referencia: text("referencia").notNull().default(""),
  fontesWeb: jsonb("fontes_web").$type<FonteWeb[]>().notNull().default([]),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

/** Preços encontrados automaticamente (IA/cron) que esperam aprovação do usuário. */
export const sugestoesPreco = pgTable("sugestoes_preco", {
  id: serial("id").primaryKey(),
  catalogoId: integer("catalogo_id")
    .notNull()
    .references(() => catalogo.id, { onDelete: "cascade" }),
  fonte: text("fonte").$type<FontePreco>().notNull().default("ia"),
  preco: money("preco").notNull(),
  minimo: money("minimo"),
  maximo: money("maximo"),
  fontesWeb: jsonb("fontes_web").$type<FonteWeb[]>().notNull().default([]),
  observacao: text("observacao").notNull().default(""),
  /** pendente | aprovada | rejeitada */
  status: text("status").notNull().default("pendente"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  decididoEm: timestamp("decidido_em", { withTimezone: true }),
});

/** Kit (composição): um serviço com os materiais que ele consome por unidade. */
export const kits = pgTable("kits", {
  id: serial("id").primaryKey(),
  /** Identifica os kits sugeridos pelo app (null nos criados pelo usuário). */
  chave: text("chave").unique(),
  nome: text("nome").notNull(),
  descricao: text("descricao").notNull().default(""),
  categoria: text("categoria").notNull().default("Geral"),
  unidade: text("unidade").notNull().default("un"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

export const kitItens = pgTable("kit_itens", {
  id: serial("id").primaryKey(),
  kitId: integer("kit_id")
    .notNull()
    .references(() => kits.id, { onDelete: "cascade" }),
  /** Item do catálogo; se for removido do catálogo, o kit mantém a descrição. */
  catalogoId: integer("catalogo_id").references(() => catalogo.id, { onDelete: "set null" }),
  tipo: text("tipo").notNull().default("material"),
  descricao: text("descricao").notNull(),
  unidade: text("unidade").notNull().default("un"),
  quantidade: numeric("quantidade", { precision: 10, scale: 3, mode: "number" }).notNull().default(1),
  ordem: integer("ordem").notNull().default(0),
});

/** Configuração de precificação (linha única, id = 1). */
export const configPrecos = pgTable("config_precos", {
  id: integer("id").primaryKey().default(1),
  uf: text("uf").notNull().default("PA"),
  cidade: text("cidade").notNull().default("Belém"),
  /** Margem aplicada sobre o preço SINAPI para chegar ao preço de varejo (%). */
  margemSinapi: numeric("margem_sinapi", { precision: 6, scale: 2, mode: "number" }).notNull().default(30),
  /** nao_desonerado | desonerado */
  regimeSinapi: text("regime_sinapi").notNull().default("nao_desonerado"),
  referenciaSinapi: text("referencia_sinapi").notNull().default(""),
  /** Margem sobre o custo das horas nos serviços calculados (%). */
  margemServico: numeric("margem_servico", { precision: 6, scale: 2, mode: "number" }).notNull().default(0),
  /** Valor/hora do ajudante; vazio = metade do valor/hora do eletricista. */
  valorHoraAjudante: money("valor_hora_ajudante"),
  /** Depois de quantos dias um preço é considerado desatualizado. */
  validadeDias: integer("validade_dias").notNull().default(60),
});

/** Itens importados da tabela SINAPI (Caixa). */
export const sinapiItens = pgTable(
  "sinapi_itens",
  {
    id: serial("id").primaryKey(),
    /** insumo | composicao */
    tipo: text("tipo").notNull(),
    codigo: text("codigo").notNull(),
    descricao: text("descricao").notNull(),
    unidade: text("unidade").notNull().default(""),
    preco: numeric("preco", { precision: 14, scale: 4, mode: "number" }),
    regime: text("regime").notNull().default("nao_desonerado"),
    uf: text("uf").notNull().default("PA"),
    referencia: text("referencia").notNull().default(""),
    horasEletricista: numeric("horas_eletricista", { precision: 10, scale: 4, mode: "number" }),
    horasAjudante: numeric("horas_ajudante", { precision: 10, scale: 4, mode: "number" }),
  },
  (t) => [uniqueIndex("sinapi_tipo_codigo_regime").on(t.tipo, t.codigo, t.regime)],
);

export type Fornecedor = typeof fornecedores.$inferSelect;
export type PrecoHistorico = typeof precosHistorico.$inferSelect;
export type SugestaoPreco = typeof sugestoesPreco.$inferSelect;
export type Kit = typeof kits.$inferSelect;
export type KitItem = typeof kitItens.$inferSelect;
export type ConfigPrecos = typeof configPrecos.$inferSelect;
export type SinapiItem = typeof sinapiItens.$inferSelect;
