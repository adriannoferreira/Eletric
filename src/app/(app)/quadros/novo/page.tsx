import { asc } from "drizzle-orm";
import { Cabecalho } from "@/components/ui";
import { clientes, db } from "@/db";
import { FormNovoQuadro } from "./form";

export const metadata = { title: "Novo quadro" };

export default async function NovoQuadroPage({ searchParams }: PageProps<"/quadros/novo">) {
  const { cliente } = await searchParams;
  const lista = await db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).orderBy(asc(clientes.nome));
  return (
    <>
      <Cabecalho titulo="Novo quadro" subtitulo="Escolha o fornecimento e o tamanho da caixa" voltar="/quadros" />
      <FormNovoQuadro clientes={lista} clienteInicial={typeof cliente === "string" ? cliente : ""} />
    </>
  );
}
