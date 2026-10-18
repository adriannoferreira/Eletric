ALTER TABLE "catalogo" ADD COLUMN "familia" text;--> statement-breakpoint
ALTER TABLE "catalogo" ADD COLUMN "atributos" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "kit_itens" ADD COLUMN "familia" text;--> statement-breakpoint
ALTER TABLE "kit_itens" ADD COLUMN "atributos" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "kit_itens" ADD COLUMN "variaveis" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sugestoes_preco" ADD COLUMN "especificacao" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sugestoes_preco" ADD COLUMN "ofertas" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sugestoes_preco" ADD COLUMN "motivo" text DEFAULT '' NOT NULL;