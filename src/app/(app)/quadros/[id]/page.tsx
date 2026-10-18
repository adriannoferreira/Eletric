import { asc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Construtor } from "@/components/quadro/construtor";
import { clientes, db, quadros } from "@/db";
import { lerQuadro } from "@/lib/eletrica/tipos";

export const metadata = { title: "Construtor de quadro" };

export default async function QuadroPage({ params }: PageProps<"/quadros/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [[q], lista] = await Promise.all([
    db.select().from(quadros).where(eq(quadros.id, id)),
    db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).orderBy(asc(clientes.nome)),
  ]);
  if (!q) notFound();

  return (
    <>
      <Link href="/quadros" className="no-print mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> Quadros
      </Link>
      <Construtor
        id={q.id}
        nomeInicial={q.nome}
        clienteIdInicial={q.clienteId}
        dadosIniciais={lerQuadro(q.dados)}
        clientes={lista}
      />
    </>
  );
}
