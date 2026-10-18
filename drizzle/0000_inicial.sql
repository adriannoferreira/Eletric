CREATE TABLE "catalogo" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" text DEFAULT 'servico' NOT NULL,
	"categoria" text DEFAULT 'Geral' NOT NULL,
	"nome" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"unidade" text DEFAULT 'un' NOT NULL,
	"preco" numeric(12, 2) DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"telefone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"documento" text DEFAULT '' NOT NULL,
	"endereco" text DEFAULT '' NOT NULL,
	"bairro" text DEFAULT '' NOT NULL,
	"cidade" text DEFAULT '' NOT NULL,
	"tipo" text DEFAULT 'residencial' NOT NULL,
	"origem" text DEFAULT 'indicacao' NOT NULL,
	"observacoes" text DEFAULT '' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversas" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistente" text DEFAULT 'eletrica' NOT NULL,
	"titulo" text DEFAULT 'Nova conversa' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"categoria" text DEFAULT 'ferramenta' NOT NULL,
	"marca" text DEFAULT '' NOT NULL,
	"modelo" text DEFAULT '' NOT NULL,
	"numero_serie" text DEFAULT '' NOT NULL,
	"data_compra" date,
	"valor" numeric(12, 2),
	"proxima_verificacao" date,
	"status" text DEFAULT 'ok' NOT NULL,
	"observacoes" text DEFAULT '' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensagens" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversa_id" integer NOT NULL,
	"papel" text NOT NULL,
	"conteudo" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orcamento_itens" (
	"id" serial PRIMARY KEY NOT NULL,
	"orcamento_id" integer NOT NULL,
	"tipo" text DEFAULT 'servico' NOT NULL,
	"descricao" text NOT NULL,
	"quantidade" numeric(10, 2) DEFAULT 1 NOT NULL,
	"unidade" text DEFAULT 'un' NOT NULL,
	"preco_unitario" numeric(12, 2) DEFAULT 0 NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orcamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"validade_dias" integer DEFAULT 15 NOT NULL,
	"desconto" numeric(12, 2) DEFAULT 0 NOT NULL,
	"condicoes_pagamento" text DEFAULT '' NOT NULL,
	"prazo_execucao" text DEFAULT '' NOT NULL,
	"garantia" text DEFAULT '90 dias sobre a mão de obra' NOT NULL,
	"observacoes" text DEFAULT '' NOT NULL,
	"token_publico" text NOT NULL,
	"enviado_em" timestamp with time zone,
	"respondido_em" timestamp with time zone,
	"followups" integer DEFAULT 0 NOT NULL,
	"ultimo_followup_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orcamentos_token_publico_unique" UNIQUE("token_publico")
);
--> statement-breakpoint
CREATE TABLE "perfil" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"empresa" text DEFAULT '' NOT NULL,
	"documento" text DEFAULT '' NOT NULL,
	"telefone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"cidade" text DEFAULT '' NOT NULL,
	"chave_pix" text DEFAULT '' NOT NULL,
	"instagram" text DEFAULT '' NOT NULL,
	"registro_profissional" text DEFAULT '' NOT NULL,
	"valor_hora" numeric(12, 2),
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quadros" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" integer,
	"nome" text NOT NULL,
	"dados" jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_conversa_id_conversas_id_fk" FOREIGN KEY ("conversa_id") REFERENCES "public"."conversas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamento_itens" ADD CONSTRAINT "orcamento_itens_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quadros" ADD CONSTRAINT "quadros_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;