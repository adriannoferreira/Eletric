import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BarraImpressao } from "@/components/os/barra-impressao";
import { RelatorioMedicoes } from "@/components/os/relatorio-medicoes";
import { db, medicoes } from "@/db";
import { carregarOSCompleta } from "@/lib/servicos/carregar-os";
import { listarInstrumentos } from "@/lib/servicos/instrumentos";

export const metadata = { title: "Relatório de medições" };

export default async function MedicoesOS({ params, searchParams }: PageProps<"/os/[id]/medicoes">) {
  const id = Number((await params).id);
  const d = await carregarOSCompleta(id);
  if (!d) notFound();
  const { auto } = await searchParams;
  const [meds, instrumentos] = await Promise.all([
    db.select().from(medicoes).where(eq(medicoes.osId, id)).orderBy(asc(medicoes.id)),
    listarInstrumentos(),
  ]);
  const { os, cliente, perfil } = d;
  const local = os.endereco || [cliente.endereco, cliente.bairro, cliente.cidade].filter(Boolean).join(", ");

  return (
    <>
      <BarraImpressao voltar={`/os/${id}`} auto={auto === "1"} />
      <RelatorioMedicoes
        perfil={perfil}
        numero={`OS ${id}`}
        cliente={cliente.nome}
        local={local}
        servico={os.titulo}
        grupos={[{ titulo: os.titulo, medicoes: meds, analise: os.analiseMedicoes }]}
        instrumentos={instrumentos}
      />
    </>
  );
}
