import { Package } from "lucide-react";
import { Vazio } from "@/components/ui";
import { catalogoComPrecos, contextoServico } from "@/lib/precos/servidor";
import { carregarCatalogoInicial } from "./actions";
import { EditorCatalogo } from "./editor";

export const metadata = { title: "Catálogo de preços" };

export default async function CatalogoPage() {
  const [itens, { config, ctx }] = await Promise.all([catalogoComPrecos(false), contextoServico()]);
  return (
    <>
      {itens.length === 0 && (
        <Vazio
          icone={Package}
          titulo="Catálogo vazio"
          texto="Carregue uma lista inicial com os serviços mais comuns, ou vá em Kits e carregue os kits sugeridos (eles criam os itens que faltarem)."
          acao={
            <form action={carregarCatalogoInicial}>
              <button className="btn btn-primary">Carregar lista inicial</button>
            </form>
          }
        />
      )}
      <EditorCatalogo
        itens={itens}
        validadeDias={config.validadeDias}
        valorHora={ctx.valorHora}
        valorHoraAjudante={ctx.valorHoraAjudante ?? (ctx.valorHora ? ctx.valorHora / 2 : null)}
        margemServico={ctx.margemServico}
      />
    </>
  );
}
