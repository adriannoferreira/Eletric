CREATE TABLE "tarefas_marketing" (
	"id" serial PRIMARY KEY NOT NULL,
	"chave" text,
	"fase" integer DEFAULT 30 NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"concluida" boolean DEFAULT false NOT NULL,
	"concluida_em" timestamp with time zone,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tarefas_marketing_chave_unique" UNIQUE("chave")
);
