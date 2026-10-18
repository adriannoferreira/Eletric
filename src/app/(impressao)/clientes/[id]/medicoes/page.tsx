import { asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BarraImpressao } from "@/components/os/barra-impressao";
import { type GrupoMedicoes, RelatorioMedicoes } from "@/components/os/relatorio-medicoes";
import { clientes, db, medicoes, ordensServico, perfil } from "@/db";
import { dataCurta } from "@/lib/formato";
import { listarInstrumentos } from "@/lib/servicos/instrumentos";

export const metadata = { title: "Relatório de medições da obra" };

/** Junta as medições de todas as OS do cliente num único relatório. */
export default async function MedicoesObra({ params, searchParams }: PageProps<"/clientes/[id]/medicoes">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [[cliente], [p], lista, instrumentos] = await Promise.all([
    db.select().from(clientes).where(eq(clientes.id, id)),
    db.select().from(perfil).limit(1),
    db.select().from(ordensServico).where(eq(ordensServico.clienteId, id)).orderBy(asc(ordensServico.criadoEm)),
    listarInstrumentos(),
  ]);
  if (!cliente) notFound();
  const { auto } = await searchParams;
  const meds = lista.length
    ? await db.select().from(medicoes).where(inArray(medicoes.osId, lista.map((o) => o.id))).orderBy(asc(medicoes.id))
    : [];
  const grupos: GrupoMedicoes[] = lista.map((o) => ({
    titulo: `OS ${o.id} · ${o.titulo}`,
    sub: `Aberta em ${dataCurta(o.criadoEm)}`,
    medicoes: meds.filter((m) => m.osId === o.id),
    analise: o.analiseMedicoes,
  }));
  const comMedicao = grupos.filter((g) => g.medicoes.length);

  return (
    <>
      <BarraImpressao voltar={`/clientes/${id}`} auto={auto === "1"} />
      <RelatorioMedicoes
        perfil={p ?? null}
        numero={`Obra · ${cliente.nome}`}
        cliente={cliente.nome}
        local={[cliente.endereco, cliente.bairro, cliente.cidade].filter(Boolean).join(", ")}
        servico={comMedicao.length === 1 ? comMedicao[0].titulo : `${comMedicao.length} ordens de serviço`}
        grupos={grupos}
        instrumentos={instrumentos}
      />
    </>
  );
}
