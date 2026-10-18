import { and, asc, eq, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PainelOS } from "@/components/os/painel-os";
import {
  catalogo,
  clientes,
  configServicos,
  db,
  orcamentos,
  ordensServico,
  osFotos,
  osHoras,
  osMateriais,
  perfil,
  visitas,
} from "@/db";

export const metadata = { title: "Ordem de serviço" };

export default async function OSDetalhePage({ params }: PageProps<"/os/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [os] = await db.select().from(ordensServico).where(eq(ordensServico.id, id));
  if (!os) notFound();

  const [[cliente], vis, outras, mats, hrs, fotos, cat, [cfg], [p], orc] = await Promise.all([
    db.select().from(clientes).where(eq(clientes.id, os.clienteId)),
    db.select().from(visitas).where(eq(visitas.osId, id)),
    db
      .select({ id: visitas.id, inicio: visitas.inicio, duracaoMin: visitas.duracaoMin })
      .from(visitas)
      .where(and(ne(visitas.osId, id), eq(visitas.status, "agendada"))),
    db.select().from(osMateriais).where(eq(osMateriais.osId, id)).orderBy(asc(osMateriais.id)),
    db.select().from(osHoras).where(eq(osHoras.osId, id)).orderBy(asc(osHoras.inicio)),
    db
      .select({ id: osFotos.id, etapa: osFotos.etapa, legenda: osFotos.legenda })
      .from(osFotos)
      .where(eq(osFotos.osId, id))
      .orderBy(asc(osFotos.id)),
    db
      .select({ id: catalogo.id, nome: catalogo.nome, unidade: catalogo.unidade, preco: catalogo.preco, tipo: catalogo.tipo })
      .from(catalogo)
      .where(eq(catalogo.ativo, true))
      .orderBy(asc(catalogo.nome)),
    db.select().from(configServicos).limit(1),
    db.select().from(perfil).limit(1),
    os.orcamentoId
      ? db.select({ id: orcamentos.id, token: orcamentos.tokenPublico }).from(orcamentos).where(eq(orcamentos.id, os.orcamentoId))
      : Promise.resolve([]),
  ]);
  if (!cliente) notFound();

  return (
    <PainelOS
      os={os}
      cliente={cliente}
      visitas={vis}
      outrasVisitas={outras}
      materiais={mats}
      horas={hrs}
      fotos={fotos}
      catalogo={cat}
      linkAvaliacao={cfg?.linkAvaliacaoGoogle ?? ""}
      garantiaPadrao={cfg?.garantiaPadraoDias ?? 90}
      nomeProfissional={p?.nome || p?.empresa || "seu eletricista"}
      orcamento={orc[0] ?? null}
    />
  );
}
