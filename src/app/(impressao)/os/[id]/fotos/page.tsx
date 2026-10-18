import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BarraImpressao } from "@/components/os/barra-impressao";
import { lerOpcoes, RelatorioFotografico } from "@/components/os/relatorio-fotografico";
import { db, osFotos } from "@/db";
import { carregarOSCompleta } from "@/lib/servicos/carregar-os";

export const metadata = { title: "Relatório fotográfico" };

export default async function FotosOS({ params, searchParams }: PageProps<"/os/[id]/fotos">) {
  const id = Number((await params).id);
  const d = await carregarOSCompleta(id);
  if (!d) notFound();
  const sp = await searchParams;
  const { por, modo } = lerOpcoes(sp);
  const fotos = await db
    .select({ id: osFotos.id, etapa: osFotos.etapa, legenda: osFotos.legenda, criadoEm: osFotos.criadoEm })
    .from(osFotos)
    .where(eq(osFotos.osId, id))
    .orderBy(asc(osFotos.id));
  const { os, cliente, perfil } = d;
  const local = os.endereco || [cliente.endereco, cliente.bairro, cliente.cidade].filter(Boolean).join(", ");

  return (
    <>
      <BarraImpressao voltar={`/os/${id}`} auto={sp.auto === "1"} />
      <RelatorioFotografico
        perfil={perfil}
        numero={`OS ${id}`}
        cliente={cliente.nome}
        local={local}
        servico={os.titulo}
        grupos={[{ titulo: os.titulo, fotos }]}
        por={por}
        modo={modo}
        base={`/os/${id}/fotos`}
      />
    </>
  );
}
