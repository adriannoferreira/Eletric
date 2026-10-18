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
      <Sugestoes pendentes={pendentes.map((p) => ({ sugestao: p.s, nome: p.item.nome, unidade: p.item.unidade, precoAtual: p.item.preco, servicoCalculado: p.item.tipo === "servico" && !p.item.precoFixo }))} />
      <LoteIA desatualizados={velhos.length} iaLigada={iaConfigurada()} />
      <details className="card p-4 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
          Como o app escolhe o preço <span className="grid size-5 place-items-center rounded-full border border-border text-xs text-muted">?</span>
        </summary>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-muted">
          <li>Sua cotação (até {config.validadeDias} dias)</li>
          <li>Pesquisa com IA aprovada (até {config.validadeDias} dias)</li>
          <li>SINAPI + {String(config.margemSinapi).replace(".", ",")}%</li>
          <li>Preço manual</li>
        </ol>
        <p className="mt-1 text-xs text-muted">Cada variante (corrente, seção…) tem preço próprio. Pesquisa automática nos dias 1 a 5 de cada mês.</p>
      </details>
      <details className="space-y-4">
        <summary className="cursor-pointer list-none text-sm font-semibold text-muted">⋯ SINAPI e configurações</summary>
        <div className="mt-3 space-y-6">
          <ImportarSinapi uf={config.uf} referencia={config.referenciaSinapi} totalImportado={nSinapi} />
          <ReaplicarSinapi />
          <ConfigPrecosForm config={config} />
        </div>
      </details>
    </div>
  );
}
