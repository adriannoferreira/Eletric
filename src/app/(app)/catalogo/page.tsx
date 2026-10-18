import { asc } from "drizzle-orm";
import { Package } from "lucide-react";
import { Cabecalho, Vazio } from "@/components/ui";
import { catalogo, db } from "@/db";
import { carregarCatalogoInicial } from "./actions";
import { EditorCatalogo } from "./editor";

export const metadata = { title: "Catálogo de preços" };

export default async function CatalogoPage() {
  const itens = await db.select().from(catalogo).orderBy(asc(catalogo.categoria), asc(catalogo.nome));
  return (
    <>
      <Cabecalho
        titulo="Catálogo de preços"
        subtitulo="Seus serviços e materiais com preço padrão — usados para montar orçamentos em segundos"
        voltar="/"
      />
      {itens.length === 0 ? (
        <Vazio
          icone={Package}
          titulo="Catálogo vazio"
          texto="Carregue uma lista inicial com os serviços mais comuns e ajuste os preços à sua região, ou cadastre do zero."
          acao={
            <div className="flex flex-col gap-2 sm:flex-row">
              <form action={carregarCatalogoInicial}>
                <button className="btn btn-primary">Carregar lista inicial</button>
              </form>
            </div>
          }
        />
      ) : null}
      <EditorCatalogo itens={itens} />
    </>
  );
}
