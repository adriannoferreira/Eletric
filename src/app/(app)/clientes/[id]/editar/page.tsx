import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/ui";
import { clientes, db } from "@/db";
import { FormCliente } from "../../form-cliente";

export const metadata = { title: "Editar cliente" };

export default async function EditarClientePage({ params }: PageProps<"/clientes/[id]/editar">) {
  const id = Number((await params).id);
  const [cliente] = Number.isInteger(id) ? await db.select().from(clientes).where(eq(clientes.id, id)) : [];
  if (!cliente) notFound();
  return (
    <>
      <Cabecalho titulo="Editar cliente" voltar={`/clientes/${id}`} />
      <FormCliente cliente={cliente} />
    </>
  );
}
