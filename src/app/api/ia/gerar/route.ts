import { z } from "zod";
import { db, perfil } from "@/db";
import { respostaEmStream } from "@/lib/ia/claude";
import { PROMPT_ELETRICA, promptVendas } from "@/lib/ia/prompts";

const Entrada = z.object({
  assistente: z.enum(["eletrica", "vendas"]),
  pedido: z.string().trim().min(1).max(60_000),
  esforco: z.enum(["low", "medium", "high"]).optional(),
});

/** Geração avulsa (sem salvar conversa): revisão de quadro, posts, mensagens etc. */
export async function POST(req: Request) {
  const dados = Entrada.safeParse(await req.json().catch(() => null));
  if (!dados.success) return new Response("Dados inválidos", { status: 400 });
  const { assistente, pedido, esforco } = dados.data;

  let system = PROMPT_ELETRICA;
  if (assistente === "vendas") {
    const [p] = await db.select().from(perfil).limit(1);
    system = promptVendas(p);
  }
  return respostaEmStream({
    system,
    esforco,
    messages: [{ role: "user", content: pedido }],
  });
}
