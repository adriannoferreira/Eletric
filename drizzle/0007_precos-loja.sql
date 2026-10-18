CREATE TABLE "precos_loja" (
	"id" serial PRIMARY KEY NOT NULL,
	"catalogo_id" integer NOT NULL,
	"fornecedor_id" integer,
	"loja" text NOT NULL,
	"preco" numeric(12, 2) NOT NULL,
	"fonte" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "precos_loja" ADD CONSTRAINT "precos_loja_catalogo_id_catalogo_id_fk" FOREIGN KEY ("catalogo_id") REFERENCES "public"."catalogo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precos_loja" ADD CONSTRAINT "precos_loja_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE set null ON UPDATE no action;