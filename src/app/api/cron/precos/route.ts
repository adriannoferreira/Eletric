import { timingSafeEqual } from "node:crypto";
import { atualizarEmLote } from "@/lib/precos/servidor";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function autorizado(req: Request) {
  const segredo = process.env.CRON_SECRET;
  const enviado = req.headers.get("authorization") ?? "";
  if (!segredo) return false;
  const a = Buffer.from(enviado);
  const b = Buffer.from(`Bearer ${segredo}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Chamado pela Vercel Cron (dias 1 a 5 de cada mês). Pesquisa com IA alguns
 * itens desatualizados e grava SUGESTÕES — nada é aplicado sem aprovação.
 */
export async function GET(req: Request) {
  if (!autorizado(req)) return Response.json({ erro: "Não autorizado" }, { status: 401 });
  const r = await atualizarEmLote(20, { concorrencia: 4, prazoMs: 240_000 });
  return Response.json({ ok: true, ...r });
}
