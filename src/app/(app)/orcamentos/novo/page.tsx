import { asc } from "drizzle-orm";
import { Cabecalho } from "@/components/ui";
import { clientes, db } from "@/db";
import { FormNovoOrcamento } from "./form";

export const metadata = { title: "Novo orçamento" };

export default async function NovoOrcamentoPage({ searchParams }: PageProps<"/orcamentos/novo">) {
  const { cliente } = await searchParams;
  const lista = await db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).orderBy(asc(clientes.nome));
  return (
    <>
      <Cabecalho titulo="Novo orçamento" voltar="/orcamentos" />
      <FormNovoOrcamento clientes={lista} clienteInicial={Number(cliente) || undefined} />
    </>
  );
}
