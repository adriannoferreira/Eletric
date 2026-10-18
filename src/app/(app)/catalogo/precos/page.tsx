import { count, eq } from "drizzle-orm";
import { ConfigPrecosForm, LoteIA, ReaplicarSinapi, Sugestoes } from "@/components/precos/atualizar";
import { ImportarSinapi } from "@/components/precos/sinapi-import";
import { db, sinapiItens } from "@/db";
import { iaConfigurada } from "@/lib/ia/claude";
import { contextoServico, itensDesatualizados, sugestoesPendentes } from "@/lib/precos/servidor";

export const metadata = { title: "Atualizar preços" };

export default async function AtualizarPrecosPage() {
  const [{ config }, pendentes, velhos, [{ n: nSinapi }]] = await Promise.all([
    contextoServico(),
    sugestoesPendentes(),
    itensDesatualizados(500),
    db.select({ n: count() }).from(sinapiItens).where(eq(sinapiItens.uf, "PA")),
  ]);
  return (
    <div className="space-y-6">
      <section className="card space-y-1 p-4 text-sm">
        <p className="font-semibold">Como o app escolhe o preço</p>
        <ol className="list-decimal space-y-0.5 pl-5 text-muted">
          <li>
            <strong className="text-fg">Sua cotação</strong> de até {config.validadeDias} dias (aba Cotações)
          </li>
          <li>
            <strong className="text-fg">Pesquisa com IA</strong> de até {config.validadeDias} dias, aprovada por você
          </li>
          <li>
            <strong className="text-fg">SINAPI</strong> + margem de varejo de {String(config.margemSinapi).replace(".", ",")}%
          </li>
          <li>
            <strong className="text-fg">Preço manual</strong>
          </li>
        </ol>
        <p className="pt-1 text-xs text-muted">
          Serviços com “calcular pelo tempo” usam horas × seu valor/hora. Todo mês, nos dias 1 a 5, o app pesquisa sozinho os
          itens desatualizados e deixa as sugestões aqui para você aprovar.
        </p>
      </section>

      <Sugestoes pendentes={pendentes.map((p) => ({ sugestao: p.s, nome: p.item.nome, unidade: p.item.unidade, precoAtual: p.item.preco, servicoCalculado: p.item.tipo === "servico" && !p.item.precoFixo }))} />
      <LoteIA desatualizados={velhos.length} iaLigada={iaConfigurada()} />
      <ImportarSinapi uf={config.uf} referencia={config.referenciaSinapi} totalImportado={nSinapi} />
      <ReaplicarSinapi />
      <ConfigPrecosForm config={config} />
    </div>
  );
}
