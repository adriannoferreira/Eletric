import { eq } from "drizzle-orm";
import { catalogo, db } from "@/db";
import { ErroIA, extrairCotacaoIA } from "@/lib/precos/ia";

export const maxDuration = 120;

const TIPOS = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const MAX_BYTES = 4 * 1024 * 1024;

/** Lê uma cotação (texto colado, foto ou PDF) e devolve os itens com o item do catálogo sugerido. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ erro: "Envio inválido." }, { status: 400 });
  const texto = String(form.get("texto") ?? "").trim().slice(0, 30_000);
  const arquivo = form.get("arquivo");
  let anexo: { mediaType: string; base64: string } | undefined;
  if (arquivo instanceof File && arquivo.size > 0) {
    if (!TIPOS.has(arquivo.type)) return Response.json({ erro: "Envie foto (JPG/PNG) ou PDF." }, { status: 400 });
    if (arquivo.size > MAX_BYTES) return Response.json({ erro: "Arquivo grande demais (máx. 4 MB)." }, { status: 400 });
    anexo = { mediaType: arquivo.type, base64: Buffer.from(await arquivo.arrayBuffer()).toString("base64") };
  }
  if (!texto && !anexo) return Response.json({ erro: "Cole o texto ou envie a foto da cotação." }, { status: 400 });

  const itens = await db
    .select({ id: catalogo.id, nome: catalogo.nome, unidade: catalogo.unidade })
    .from(catalogo)
    .where(eq(catalogo.ativo, true));
  try {
    const r = await extrairCotacaoIA({ texto: texto || undefined, arquivo: anexo }, itens);
    return Response.json(r);
  } catch (e) {
    return Response.json({ erro: e instanceof ErroIA ? e.message : "Erro ao ler a cotação." }, { status: 502 });
  }
}
