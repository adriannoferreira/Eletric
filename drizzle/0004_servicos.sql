CREATE TABLE "config_servicos" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"link_avaliacao_google" text DEFAULT '' NOT NULL,
	"garantia_padrao_dias" integer DEFAULT 90 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ordens_servico" (
	"id" serial PRIMARY KEY NOT NULL,
	"cliente_id" integer NOT NULL,
	"orcamento_id" integer,
	"quadro_id" integer,
	"titulo" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"categoria" text DEFAULT 'Geral' NOT NULL,
	"guia" text,
	"endereco" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'agendada' NOT NULL,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"observacoes" text DEFAULT '' NOT NULL,
	"garantia_dias" integer DEFAULT 90 NOT NULL,
	"valor" numeric(12, 2),
	"forma_pagamento" text DEFAULT '' NOT NULL,
	"pagamento" text DEFAULT 'a_receber' NOT NULL,
	"pago_em" timestamp with time zone,
	"assinatura" text,
	"assinado_por" text DEFAULT '' NOT NULL,
	"concluida_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "os_fotos" (
	"id" serial PRIMARY KEY NOT NULL,
	"os_id" integer NOT NULL,
	"etapa" text DEFAULT 'antes' NOT NULL,
	"dados" text NOT NULL,
	"legenda" text DEFAULT '' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "os_horas" (
	"id" serial PRIMARY KEY NOT NULL,
	"os_id" integer NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone,
	"descricao" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "os_materiais" (
	"id" serial PRIMARY KEY NOT NULL,
	"os_id" integer NOT NULL,
	"catalogo_id" integer,
	"descricao" text NOT NULL,
	"unidade" text DEFAULT 'un' NOT NULL,
	"quantidade" numeric(10, 2) DEFAULT 1 NOT NULL,
	"preco_unitario" numeric(12, 2) DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitas" (
	"id" serial PRIMARY KEY NOT NULL,
	"os_id" integer NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"duracao_min" integer DEFAULT 120 NOT NULL,
	"status" text DEFAULT 'agendada' NOT NULL,
	"observacao" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_quadro_id_quadros_id_fk" FOREIGN KEY ("quadro_id") REFERENCES "public"."quadros"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "os_fotos" ADD CONSTRAINT "os_fotos_os_id_ordens_servico_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "os_horas" ADD CONSTRAINT "os_horas_os_id_ordens_servico_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "os_materiais" ADD CONSTRAINT "os_materiais_os_id_ordens_servico_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "os_materiais" ADD CONSTRAINT "os_materiais_catalogo_id_catalogo_id_fk" FOREIGN KEY ("catalogo_id") REFERENCES "public"."catalogo"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_os_id_ordens_servico_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE cascade ON UPDATE no action;