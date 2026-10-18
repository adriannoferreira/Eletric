import { count, eq } from "drizzle-orm";
import { AbasCatalogo } from "@/components/precos/abas";
import { Cabecalho } from "@/components/ui";
import { db, sugestoesPreco } from "@/db";
import { migrarVariantes } from "@/lib/precos/servidor";

/** Pesquisas com IA podem levar alguns minutos. */
export const maxDuration = 300;

export default async function CatalogoLayout({ children }: LayoutProps<"/catalogo">) {
  // Materiais antigos/genéricos ganham família e atributos (idempotente).
  await migrarVariantes();
  const [{ n }] = await db.select({ n: count() }).from(sugestoesPreco).where(eq(sugestoesPreco.status, "pendente"));
  return (
    <>
      <Cabecalho
        titulo="Catálogo e preços"
        ajuda="Serviços, materiais e kits com preços atualizados para Belém e região. Toque num item para editar, pesquisar o preço com IA ou ver o histórico."
        voltar="/"
      />
      <AbasCatalogo pendentes={n} />
      {children}
    </>
  );
}
