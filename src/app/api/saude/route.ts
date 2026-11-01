import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Saúde do app para o vigia externo: 200 se o banco responde, 503 se não.
 * Público e sem dados: só diz se está de pé. Padrão de todos os apps da VPS nova.
 */
export async function GET() {
  const inicio = Date.now();
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, banco_ms: Date.now() - inicio }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, erro: "banco sem resposta" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
