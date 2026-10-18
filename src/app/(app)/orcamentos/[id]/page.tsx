import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { clientes, db, orcamentoItens, orcamentos } from "@/db";
import { catalogoComPrecos, kitsComItens } from "@/lib/precos/servidor";
import { EditorOrcamento } from "./editor";

export const metadata = { title: "Orçamento" };

export default async function OrcamentoPage({ params }: PageProps<"/orcamentos/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [o] = await db.select().from(orcamentos).where(eq(orcamentos.id, id));
  if (!o) notFound();
  const [[cliente], itens, cat, kits] = await Promise.all([
    db.select().from(clientes).where(eq(clientes.id, o.clienteId)),
    db.select().from(orcamentoItens).where(eq(orcamentoItens.orcamentoId, id)).orderBy(asc(orcamentoItens.ordem)),
    catalogoComPrecos(true),
    kitsComItens(),
  ]);
  return <EditorOrcamento orcamento={o} cliente={cliente} itensIniciais={itens} catalogo={cat} kits={kits} />;
}
