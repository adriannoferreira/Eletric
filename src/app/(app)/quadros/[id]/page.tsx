import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Construtor } from "@/components/quadro/construtor";
import { catalogo, clientes, db, equipamentos, orcamentoItens, orcamentos, perfil, quadros } from "@/db";
import { lerQuadro } from "@/lib/eletrica/tipos";

export const metadata = { title: "Construtor de quadro" };

export default async function QuadroPage({ params, searchParams }: PageProps<"/quadros/[id]">) {
  const id = Number((await params).id);
  const { aba } = await searchParams;
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [[q], lista, cat, [p], instrumentos] = await Promise.all([
    db.select().from(quadros).where(eq(quadros.id, id)),
    db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).orderBy(asc(clientes.nome)),
    db
      .select({ tipo: catalogo.tipo, nome: catalogo.nome, unidade: catalogo.unidade, preco: catalogo.preco })
      .from(catalogo)
      .where(eq(catalogo.ativo, true)),
    db.select().from(perfil).limit(1),
    db
      .select({
        id: equipamentos.id,
        nome: equipamentos.nome,
        marca: equipamentos.marca,
        modelo: equipamentos.modelo,
        numeroSerie: equipamentos.numeroSerie,
        proximaVerificacao: equipamentos.proximaVerificacao,
      })
      .from(equipamentos)
      .where(eq(equipamentos.categoria, "instrumento"))
      .orderBy(asc(equipamentos.nome)),
  ]);
  if (!q) notFound();

  let cliente = null;
  let valorContrato: { valor: number; titulo: string } | null = null;
  if (q.clienteId) {
    const [[c], [orc]] = await Promise.all([
      db.select().from(clientes).where(eq(clientes.id, q.clienteId)),
      db
        .select({
          titulo: orcamentos.titulo,
          desconto: orcamentos.desconto,
          bruto: sql<number>`coalesce(sum(${orcamentoItens.quantidade} * ${orcamentoItens.precoUnitario}), 0)`.mapWith(Number),
        })
        .from(orcamentos)
        .leftJoin(orcamentoItens, eq(orcamentoItens.orcamentoId, orcamentos.id))
        .where(and(eq(orcamentos.clienteId, q.clienteId), inArray(orcamentos.status, ["aprovado", "executado"])))
        .groupBy(orcamentos.id)
        .orderBy(desc(orcamentos.respondidoEm))
        .limit(1),
    ]);
    if (c) {
      cliente = { nome: c.nome, documento: c.documento, endereco: c.endereco, bairro: c.bairro, cidade: c.cidade, telefone: c.telefone, email: c.email };
    }
    if (orc) valorContrato = { valor: Math.max(0, orc.bruto - orc.desconto), titulo: orc.titulo };
  }

  return (
    <>
      <Link href={q.modelo ? "/quadros?aba=modelos" : "/quadros"} className="no-print mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ChevronLeft className="size-4" /> {q.modelo ? "Modelos" : "Quadros"}
      </Link>
      {q.modelo && (
        <p className="mb-3 rounded-xl bg-info-soft px-3 py-2 text-sm text-info">Você está editando um modelo. As alterações valem para os próximos quadros criados a partir dele.</p>
      )}
      <Construtor
        id={q.id}
        nomeInicial={q.nome}
        clienteIdInicial={q.clienteId}
        dadosIniciais={lerQuadro(q.dados)}
        clientes={lista}
        catalogo={cat}
        perfil={{
          nome: p?.nome ?? "",
          empresa: p?.empresa ?? "",
          documento: p?.documento ?? "",
          telefone: p?.telefone ?? "",
          email: p?.email ?? "",
          cidade: p?.cidade ?? "",
          registroProfissional: p?.registroProfissional ?? "",
        }}
        instrumentos={instrumentos}
        cliente={cliente}
        valorContrato={valorContrato}
        abaInicial={typeof aba === "string" ? aba : undefined}
      />
    </>
  );
}
