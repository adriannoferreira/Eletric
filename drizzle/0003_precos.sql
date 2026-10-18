CREATE TABLE "config_precos" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"uf" text DEFAULT 'PA' NOT NULL,
	"cidade" text DEFAULT 'Belém' NOT NULL,
	"margem_sinapi" numeric(6, 2) DEFAULT 30 NOT NULL,
	"regime_sinapi" text DEFAULT 'nao_desonerado' NOT NULL,
	"referencia_sinapi" text DEFAULT '' NOT NULL,
	"margem_servico" numeric(6, 2) DEFAULT 0 NOT NULL,
	"valor_hora_ajudante" numeric(12, 2),
	"validade_dias" integer DEFAULT 60 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fornecedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"whatsapp" text DEFAULT '' NOT NULL,
	"cidade" text DEFAULT '' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kit_itens" (
	"id" serial PRIMARY KEY NOT NULL,
	"kit_id" integer NOT NULL,
	"catalogo_id" integer,
	"tipo" text DEFAULT 'material' NOT NULL,
	"descricao" text NOT NULL,
	"unidade" text DEFAULT 'un' NOT NULL,
	"quantidade" numeric(10, 3) DEFAULT 1 NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kits" (
	"id" serial PRIMARY KEY NOT NULL,
	"chave" text,
	"nome" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"categoria" text DEFAULT 'Geral' NOT NULL,
	"unidade" text DEFAULT 'un' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kits_chave_unique" UNIQUE("chave")
);
--> statement-breakpoint
CREATE TABLE "precos_historico" (
	"id" serial PRIMARY KEY NOT NULL,
	"catalogo_id" integer NOT NULL,
	"preco" numeric(12, 2) NOT NULL,
	"fonte" text NOT NULL,
	"fornecedor_id" integer,
	"fornecedor_nome" text DEFAULT '' NOT NULL,
	"referencia" text DEFAULT '' NOT NULL,
	"fontes_web" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sinapi_itens" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"codigo" text NOT NULL,
	"descricao" text NOT NULL,
	"unidade" text DEFAULT '' NOT NULL,
	"preco" numeric(14, 4),
	"regime" text DEFAULT 'nao_desonerado' NOT NULL,
	"uf" text DEFAULT 'PA' NOT NULL,
	"referencia" text DEFAULT '' NOT NULL,
	"horas_eletricista" numeric(10, 4),
	"horas_ajudante" numeric(10, 4)
);
--> statement-breakpoint
CREATE TABLE "sugestoes_preco" (
	"id" serial PRIMARY KEY NOT NULL,
	"catalogo_id" integer NOT NULL,
	"fonte" text DEFAULT 'ia' NOT NULL,
	"preco" numeric(12, 2) NOT NULL,
	"minimo" numeric(12, 2),
	"maximo" numeric(12, 2),
	"fontes_web" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"observacao" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"decidido_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "especificacao" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "fonte_preco" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "preco_atualizado_em" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "fornecedor" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "codigo_sinapi" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "horas_eletricista" numeric(8, 3);--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "horas_ajudante" numeric(8, 3);--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "multiplicador" numeric(5, 2) DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "deslocamento" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "preco_fixo" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "mercado_min" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "mercado_max" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "mercado_atualizado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orcamento_itens" ADD COLUMN "grupo" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "kit_itens" ADD CONSTRAINT "kit_itens_kit_id_kits_id_fk" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kit_itens" ADD CONSTRAINT "kit_itens_catalogo_id_catalogo_id_fk" FOREIGN KEY ("catalogo_id") REFERENCES "public"."catalogo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precos_historico" ADD CONSTRAINT "precos_historico_catalogo_id_catalogo_id_fk" FOREIGN KEY ("catalogo_id") REFERENCES "public"."catalogo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precos_historico" ADD CONSTRAINT "precos_historico_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sugestoes_preco" ADD CONSTRAINT "sugestoes_preco_catalogo_id_catalogo_id_fk" FOREIGN KEY ("catalogo_id") REFERENCES "public"."catalogo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sinapi_tipo_codigo_regime" ON "sinapi_itens" USING btree ("tipo","codigo","regime");