CREATE TABLE "medicoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"os_id" integer NOT NULL,
	"ponto" text DEFAULT '' NOT NULL,
	"tipo" text NOT NULL,
	"valor" numeric(14, 4) NOT NULL,
	"unidade" text DEFAULT '' NOT NULL,
	"parametros" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"limite_min" numeric(14, 4),
	"limite_max" numeric(14, 4),
	"resultado" text DEFAULT 'ok' NOT NULL,
	"instrumento_id" integer,
	"observacao" text DEFAULT '' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ordens_servico" ADD COLUMN "analise_medicoes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "medicoes" ADD CONSTRAINT "medicoes_os_id_ordens_servico_id_fk" FOREIGN KEY ("os_id") REFERENCES "public"."ordens_servico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medicoes" ADD CONSTRAINT "medicoes_instrumento_id_equipamentos_id_fk" FOREIGN KEY ("instrumento_id") REFERENCES "public"."equipamentos"("id") ON DELETE set null ON UPDATE no action;