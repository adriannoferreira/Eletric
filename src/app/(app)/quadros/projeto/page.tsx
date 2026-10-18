import { and, asc, eq } from "drizzle-orm";
import { Cabecalho } from "@/components/ui";
import { AssistenteProjeto } from "@/components/quadro/assistente-projeto";
import { clientes, db, quadros } from "@/db";
import { iaConfigurada } from "@/lib/ia/claude";
import { lerQuadro } from "@/lib/eletrica/tipos";

export const metadata = { title: "Gerar projeto da obra" };

export default async function ProjetoObraPage({ searchParams }: PageProps<"/quadros/projeto">) {
  const sp = await searchParams;
  const quadroId = Number(sp.quadro) || null;
  const clienteInicial = Number(sp.cliente) || null;
  const lista = await db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).orderBy(asc(clientes.nome));
  let inicial: { id: number; nome: string; clienteId: number | null; projeto: ReturnType<typeof lerQuadro>["projeto"] } | null = null;
  if (quadroId) {
    const [q] = await db.select().from(quadros).where(and(eq(quadros.id, quadroId), eq(quadros.modelo, false)));
    if (q) inicial = { id: q.id, nome: q.nome, clienteId: q.clienteId, projeto: lerQuadro(q.dados).projeto };
  }
  return (
    <>
      <Cabecalho
        titulo={inicial ? "Dados da obra" : "Projeto da obra"}
        ajuda="Informe a obra, os ambientes e as cargas — o app monta circuitos, quadro, proteções e demanda pela NBR 5410."
        voltar={inicial ? `/quadros/${inicial.id}` : "/quadros"}
      />
      <AssistenteProjeto
        clientes={lista}
        quadroId={inicial?.id ?? null}
        nomeInicial={inicial?.nome ?? ""}
        clienteInicial={inicial?.clienteId ?? clienteInicial}
        projetoInicial={inicial?.projeto ?? null}
        iaLigada={iaConfigurada()}
      />
    </>
  );
}
