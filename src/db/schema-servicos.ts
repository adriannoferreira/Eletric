import {
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { catalogo, clientes, orcamentos, quadros } from "./schema";

const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });

export type ItemChecklist = { id: string; texto: string; feito: boolean };

/** Ordem de serviço: qualquer serviço executado para um cliente. */
export const ordensServico = pgTable("ordens_servico", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "restrict" }),
  orcamentoId: integer("orcamento_id").references(() => orcamentos.id, { onDelete: "set null" }),
  quadroId: integer("quadro_id").references(() => quadros.id, { onDelete: "set null" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull().default(""),
  /** Categoria livre (ex.: "Residencial", "Corretiva"). */
  categoria: text("categoria").notNull().default("Geral"),
  /** Chave do guia de serviço usado como modelo (src/lib/servicos/guias.ts). */
  guia: text("guia"),
  endereco: text("endereco").notNull().default(""),
  /** agendada | em_andamento | pausada | concluida | cancelada */
  status: text("status").notNull().default("agendada"),
  checklist: jsonb("checklist").$type<ItemChecklist[]>().notNull().default([]),
  observacoes: text("observacoes").notNull().default(""),
  garantiaDias: integer("garantia_dias").notNull().default(90),
  valor: money("valor"),
  formaPagamento: text("forma_pagamento").notNull().default(""),
  /** a_receber | pago */
  pagamento: text("pagamento").notNull().default("a_receber"),
  pagoEm: timestamp("pago_em", { withTimezone: true }),
  /** Assinatura do cliente como data URL PNG. */
  assinatura: text("assinatura"),
  assinadoPor: text("assinado_por").notNull().default(""),
  concluidaEm: timestamp("concluida_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

/** Visitas agendadas de uma OS (uma OS pode ter várias). */
export const visitas = pgTable("visitas", {
  id: serial("id").primaryKey(),
  osId: integer("os_id")
    .notNull()
    .references(() => ordensServico.id, { onDelete: "cascade" }),
  inicio: timestamp("inicio", { withTimezone: true }).notNull(),
  duracaoMin: integer("duracao_min").notNull().default(120),
  /** agendada | realizada | cancelada */
  status: text("status").notNull().default("agendada"),
  observacao: text("observacao").notNull().default(""),
});

export const osMateriais = pgTable("os_materiais", {
  id: serial("id").primaryKey(),
  osId: integer("os_id")
    .notNull()
    .references(() => ordensServico.id, { onDelete: "cascade" }),
  catalogoId: integer("catalogo_id").references(() => catalogo.id, { onDelete: "set null" }),
  descricao: text("descricao").notNull(),
  unidade: text("unidade").notNull().default("un"),
  quantidade: numeric("quantidade", { precision: 10, scale: 2, mode: "number" }).notNull().default(1),
  precoUnitario: money("preco_unitario").notNull().default(0),
});

/** Horas trabalhadas. `fim` nulo = cronômetro rodando. */
export const osHoras = pgTable("os_horas", {
  id: serial("id").primaryKey(),
  osId: integer("os_id")
    .notNull()
    .references(() => ordensServico.id, { onDelete: "cascade" }),
  inicio: timestamp("inicio", { withTimezone: true }).notNull(),
  fim: timestamp("fim", { withTimezone: true }),
  descricao: text("descricao").notNull().default(""),
});

/** Fotos comprimidas no navegador e guardadas como data URL JPEG. */
export const osFotos = pgTable("os_fotos", {
  id: serial("id").primaryKey(),
  osId: integer("os_id")
    .notNull()
    .references(() => ordensServico.id, { onDelete: "cascade" }),
  /** antes | durante | depois */
  etapa: text("etapa").notNull().default("antes"),
  dados: text("dados").notNull(),
  legenda: text("legenda").notNull().default(""),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

/** Configurações de serviço/pós-venda (linha única, id = 1). */
export const configServicos = pgTable("config_servicos", {
  id: integer("id").primaryKey().default(1),
  linkAvaliacaoGoogle: text("link_avaliacao_google").notNull().default(""),
  garantiaPadraoDias: integer("garantia_padrao_dias").notNull().default(90),
});

export type OrdemServico = typeof ordensServico.$inferSelect;
export type Visita = typeof visitas.$inferSelect;
export type OsMaterial = typeof osMateriais.$inferSelect;
export type OsHora = typeof osHoras.$inferSelect;
