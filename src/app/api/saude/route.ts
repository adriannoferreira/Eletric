import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

const semCache = { "Cache-Control": "no-store" };

/**
 * Saúde do app para o vigia externo. Público e sem dados: só diz se está de pé.
 * 200 = banco responde e as tabelas existem (banco no Neon); 503 = banco sem resposta ou vazio.
 * Conferir os dados pega o caso de o banco subir vazio (ex.: dados fora do volume depois de reiniciar a VPS).
 */
export async function GET() {
  const inicio = Date.now();
  let temDados: boolean;
  try {
    const r = await db.execute(sql`select count(*)::int as n from information_schema.tables where table_schema = 'public'`);
    temDados = Number((r.rows[0] as { n?: number } | undefined)?.n) > 0;
  } catch {
    return NextResponse.json({ ok: false, erro: "banco sem resposta" }, { status: 503, headers: semCache });
  }
  if (!temDados) {
    return NextResponse.json({ ok: false, erro: "banco sem os dados principais" }, { status: 503, headers: semCache });
  }
  return NextResponse.json({ ok: true, banco_ms: Date.now() - inicio }, { headers: semCache });
}
