import { count, eq } from "drizzle-orm";
import { AbasCatalogo } from "@/components/precos/abas";
import { Cabecalho } from "@/components/ui";
import { db, sugestoesPreco } from "@/db";

/** Pesquisas com IA podem levar alguns minutos. */
export const maxDuration = 300;

export default async function CatalogoLayout({ children }: LayoutProps<"/catalogo">) {
  const [{ n }] = await db.select({ n: count() }).from(sugestoesPreco).where(eq(sugestoesPreco.status, "pendente"));
  return (
    <>
      <Cabecalho
        titulo="Catálogo e preços"
        subtitulo="Serviços, materiais e kits com preços atualizados para Belém e região"
        voltar="/"
      />
      <AbasCatalogo pendentes={n} />
      {children}
    </>
  );
}
