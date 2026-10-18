import { eq } from "drizzle-orm";
import { db, osFotos } from "@/db";

/** Entrega a foto da OS como imagem (as fotos ficam no banco como data URL). */
export async function GET(_: Request, ctx: RouteContext<"/api/os/foto/[id]">) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return new Response("Não encontrado", { status: 404 });
  const [f] = await db.select({ dados: osFotos.dados }).from(osFotos).where(eq(osFotos.id, id));
  if (!f) return new Response("Não encontrado", { status: 404 });
  const m = /^data:(image\/[a-z]+);base64,(.*)$/.exec(f.dados);
  if (!m) return new Response("Inválido", { status: 422 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
