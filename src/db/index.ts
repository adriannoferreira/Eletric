import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import * as schemaPrecos from "./schema-precos";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL não configurada. Veja o arquivo .env.example.");
}

export const db = drizzle(neon(url), { schema: { ...schema, ...schemaPrecos } });
export * from "./schema";
export * from "./schema-precos";
