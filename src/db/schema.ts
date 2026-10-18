import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const money = (name: string) =>
  numeric(name, { precision: 12, scale: 2, mode: "number" });

const timestamps = {
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

/** Dados do próprio eletricista (aparecem no orçamento). Linha única, id = 1. */
export const perfil = pgTable("perfil", {
  id: integer("id").primaryKey().default(1),
  nome: text("nome").notNull().default(""),
  empresa: text("empresa").notNull().default(""),
  documento: text("documento").notNull().default(""),
  telefone: text("telefone").notNull().default(""),
  email: text("email").notNull().default(""),
  cidade: text("cidade").notNull().default(""),
  chavePix: text("chave_pix").notNull().default(""),
  instagram: text("instagram").notNull().default(""),
  registroProfissional: text("registro_profissional").notNull().default(""),
  valorHora: money("valor_hora"),
  ...timestamps,
});

export const clientes = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull().default(""),
  email: text("email").notNull().default(""),
  documento: text("documento").notNull().default(""),
  endereco: text("endereco").notNull().default(""),
  bairro: text("bairro").notNull().default(""),
  cidade: text("cidade").notNull().default(""),
  /** residencial | comercial | condominio | industrial */
  tipo: text("tipo").notNull().default("residencial"),
  /** indicacao | instagram | google | whatsapp | panfleto | outro */
  origem: text("origem").notNull().default("indicacao"),
  observacoes: text("observacoes").notNull().default(""),
  ...timestamps,
});

/** Serviços e materiais com preço padrão, usados para montar orçamentos rápido. */
export const catalogo = pgTable("catalogo", {
  id: serial("id").primaryKey(),
  /** servico | material */
  tipo: text("tipo").notNull().default("servico"),
  categoria: text("categoria").notNull().default("Geral"),
  nome: text("nome").notNull(),
  descricao: text("descricao").notNull().default(""),
  unidade: text("unidade").notNull().default("un"),
  preco: money("preco").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
  ...timestamps,
});

export const orcamentos = pgTable("orcamentos", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "restrict" }),
  titulo: text("titulo").notNull(),
  /** rascunho | enviado | aprovado | recusado | executado */
  status: text("status").notNull().default("rascunho"),
  validadeDias: integer("validade_dias").notNull().default(15),
  desconto: money("desconto").notNull().default(0),
  condicoesPagamento: text("condicoes_pagamento").notNull().default(""),
  prazoExecucao: text("prazo_execucao").notNull().default(""),
  garantia: text("garantia").notNull().default("90 dias sobre a mão de obra"),
  observacoes: text("observacoes").notNull().default(""),
  /** Token do link público que o cliente abre pelo WhatsApp. */
  tokenPublico: text("token_publico").notNull().unique(),
  enviadoEm: timestamp("enviado_em", { withTimezone: true }),
  respondidoEm: timestamp("respondido_em", { withTimezone: true }),
  followups: integer("followups").notNull().default(0),
  ultimoFollowupEm: timestamp("ultimo_followup_em", { withTimezone: true }),
  ...timestamps,
});

export const orcamentoItens = pgTable("orcamento_itens", {
  id: serial("id").primaryKey(),
  orcamentoId: integer("orcamento_id")
    .notNull()
    .references(() => orcamentos.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull().default("servico"),
  descricao: text("descricao").notNull(),
  quantidade: numeric("quantidade", { precision: 10, scale: 2, mode: "number" })
    .notNull()
    .default(1),
  unidade: text("unidade").notNull().default("un"),
  precoUnitario: money("preco_unitario").notNull().default(0),
  ordem: integer("ordem").notNull().default(0),
});

/** Quadros de distribuição montados no construtor. O desenho fica em `dados`. */
export const quadros = pgTable("quadros", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").references(() => clientes.id, {
    onDelete: "set null",
  }),
  nome: text("nome").notNull(),
  dados: jsonb("dados").notNull(),
  /** true = modelo reutilizável (não aparece na lista de quadros). */
  modelo: boolean("modelo").notNull().default(false),
  descricao: text("descricao").notNull().default(""),
  ...timestamps,
});

export const equipamentos = pgTable("equipamentos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  /** ferramenta | instrumento | epi | escada | outro */
  categoria: text("categoria").notNull().default("ferramenta"),
  marca: text("marca").notNull().default(""),
  modelo: text("modelo").notNull().default(""),
  numeroSerie: text("numero_serie").notNull().default(""),
  dataCompra: date("data_compra"),
  valor: money("valor"),
  /** Calibração de instrumentos ou validade de EPI. */
  proximaVerificacao: date("proxima_verificacao"),
  /** ok | manutencao | emprestado | perdido */
  status: text("status").notNull().default("ok"),
  observacoes: text("observacoes").notNull().default(""),
  ...timestamps,
});

export const conversas = pgTable("conversas", {
  id: serial("id").primaryKey(),
  /** eletrica | vendas */
  assistente: text("assistente").notNull().default("eletrica"),
  titulo: text("titulo").notNull().default("Nova conversa"),
  ...timestamps,
});

export const mensagens = pgTable("mensagens", {
  id: serial("id").primaryKey(),
  conversaId: integer("conversa_id")
    .notNull()
    .references(() => conversas.id, { onDelete: "cascade" }),
  /** user | assistant */
  papel: text("papel").notNull(),
  conteudo: text("conteudo").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

export type Cliente = typeof clientes.$inferSelect;
export type ItemCatalogo = typeof catalogo.$inferSelect;
export type Orcamento = typeof orcamentos.$inferSelect;
export type OrcamentoItem = typeof orcamentoItens.$inferSelect;
export type Quadro = typeof quadros.$inferSelect;
export type Equipamento = typeof equipamentos.$inferSelect;
export type Perfil = typeof perfil.$inferSelect;

/** Tarefas do plano de crescimento (aba Vendas & Marketing). */
export const tarefasMarketing = pgTable("tarefas_marketing", {
  id: serial("id").primaryKey(),
  /** Identificador das tarefas sugeridas pelo app (null nas criadas pelo usuário). */
  chave: text("chave").unique(),
  /** 30 | 60 | 90 (dias) */
  fase: integer("fase").notNull().default(30),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull().default(""),
  concluida: boolean("concluida").notNull().default(false),
  concluidaEm: timestamp("concluida_em", { withTimezone: true }),
  ordem: integer("ordem").notNull().default(0),
  criadoEm: timestamp("criado_em", { withTimezone: true }).defaultNow().notNull(),
});

export type TarefaMarketing = typeof tarefasMarketing.$inferSelect;
