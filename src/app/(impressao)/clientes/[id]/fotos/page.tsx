import { asc, desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BarraImpressao } from "@/components/os/barra-impressao";
import { type GrupoFotos, lerOpcoes, RelatorioFotografico } from "@/components/os/relatorio-fotografico";
import { clientes, db, ordensServico, osFotos, perfil } from "@/db";
import { dataCurta } from "@/lib/formato";

export const metadata = { title: "Relatório fotográfico da obra" };

/** Relatório fotográfico de toda a obra: junta as fotos de todas as OS do cliente. */
export default async function FotosObra({ params, searchParams }: PageProps<"/clientes/[id]/fotos">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [[cliente], [p]] = await Promise.all([
    db.select().from(clientes).where(eq(clientes.id, id)),
    db.select().from(perfil).limit(1),
  ]);
  if (!cliente) notFound();
  const sp = await searchParams;
  const { por, modo } = lerOpcoes(sp);

  const lista = await db
    .select()
    .from(ordensServico)
    .where(eq(ordensServico.clienteId, id))
    .orderBy(desc(ordensServico.criadoEm));
  const fotos = lista.length
    ? await db
        .select({ id: osFotos.id, osId: osFotos.osId, etapa: osFotos.etapa, legenda: osFotos.legenda, criadoEm: osFotos.criadoEm })
        .from(osFotos)
        .where(inArray(osFotos.osId, lista.map((o) => o.id)))
        .orderBy(asc(osFotos.id))
    : [];

  const grupos: GrupoFotos[] = lista
    .slice()
    .reverse()
    .map((o) => ({
      titulo: `OS ${o.id} · ${o.titulo}`,
      sub: `Aberta em ${dataCurta(o.criadoEm)}${o.endereco ? ` · ${o.endereco}` : ""}`,
      fotos: fotos.filter((f) => f.osId === o.id),
    }));
  const local = [cliente.endereco, cliente.bairro, cliente.cidade].filter(Boolean).join(", ");

  return (
    <>
      <BarraImpressao voltar={`/clientes/${id}`} auto={sp.auto === "1"} />
      <RelatorioFotografico
        perfil={p ?? null}
        numero={`Obra · ${cliente.nome}`}
        cliente={cliente.nome}
        local={local}
        servico={grupos.length === 1 ? grupos[0].titulo : `${grupos.length} ordens de serviço`}
        grupos={grupos}
        por={por}
        modo={modo}
        base={`/clientes/${id}/fotos`}
      />
    </>
  );
}
