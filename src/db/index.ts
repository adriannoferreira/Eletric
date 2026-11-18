import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import * as schemaPrecos from "./schema-precos";
import * as schemaServicos from "./schema-servicos";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL não configurada. Veja o arquivo .env.example.");
}

// Banco Postgres na VPS (Dokploy) desde 18/11/2026 — antes era o Neon (driver HTTP).
const pool = new Pool({ connectionString: url, max: 5 });

export const db = drizzle(pool, { schema: { ...schema, ...schemaPrecos, ...schemaServicos } });
export * from "./schema";
export * from "./schema-precos";
export * from "./schema-servicos";
