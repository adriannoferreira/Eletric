import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as schemaPrecos from "./schema-precos";
import * as schemaServicos from "./schema-servicos";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL não configurada. Veja o arquivo .env.example.");
}

export const db = drizzle(neon(url), { schema: { ...schema, ...schemaPrecos, ...schemaServicos } });
export * from "./schema";
export * from "./schema-precos";
export * from "./schema-servicos";
