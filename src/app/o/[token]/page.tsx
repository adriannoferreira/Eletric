import { asc, eq } from "drizzle-orm";
import { CheckCircle2, MessageCircle, Zap } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { clientes, db, orcamentoItens, orcamentos, perfil } from "@/db";
import { dataCurta, linkWhatsApp, numero, reais } from "@/lib/formato";
import { numeroOrcamento, totais } from "@/lib/orcamento";
import { BotaoImprimir } from "./imprimir";

export const dynamic = "force-dynamic";

async function carregar(token: string) {
  const [o] = await db.select().from(orcamentos).where(eq(orcamentos.tokenPublico, token));
  if (!o) return null;
  const [[cliente], itens, [p]] = await Promise.all([
    db.select().from(clientes).where(eq(clientes.id, o.clienteId)),
    db.select().from(orcamentoItens).where(eq(orcamentoItens.orcamentoId, o.id)).orderBy(asc(orcamentoItens.ordem)),
    db.select().from(perfil).limit(1),
  ]);
  return { o, cliente, itens, p };
}

export async function generateMetadata({ params }: PageProps<"/o/[token]">): Promise<Metadata> {
  const d = await carregar((await params).token);
  if (!d) return { title: "Orçamento" };
  const quem = d.p?.empresa || d.p?.nome || "Eletricista";
  return {
    title: `Orçamento ${numeroOrcamento(d.o.id)} — ${quem}`,
    description: d.o.titulo,
    robots: { index: false, follow: false },
  };
}

export default async function OrcamentoPublico({ params }: PageProps<"/o/[token]">) {
  const d = await carregar((await params).token);
  if (!d) notFound();
  const { o, cliente, itens, p } = d;
  const t = totais(itens, o.desconto);
  const servicos = itens.filter((i) => i.tipo !== "material");
  const materiais = itens.filter((i) => i.tipo === "material");
  const validade = new Date(o.criadoEm.getTime() + o.validadeDias * 86_400_000);
  const nomeProf = p?.empresa || p?.nome || "Serviços Elétricos";
  const aprovado = o.status === "aprovado" || o.status === "executado";

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:py-10 print:max-w-none print:p-0">
      <article className="card overflow-hidden print:rounded-none print:border-0">
        <header className="flex flex-wrap items-start justify-between gap-4 bg-[#0d1117] p-6 text-white print:bg-white print:text-black">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#fbbf24] text-[#1a1400]">
              <Zap className="size-6" strokeWidth={2.5} />
            </span>
            <div>
              <p className="text-lg font-bold">{nomeProf}</p>
              {p?.empresa && p.nome && <p className="text-sm opacity-80">{p.nome}</p>}
              <p className="text-sm opacity-80">
                {[p?.telefone, p?.email, p?.cidade].filter(Boolean).join(" · ")}
              </p>
              {(p?.documento || p?.registroProfissional) && (
                <p className="text-xs opacity-70">
                  {[p?.documento && `CPF/CNPJ ${p.documento}`, p?.registroProfissional].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider opacity-70">Orçamento</p>
            <p className="text-xl font-bold">{numeroOrcamento(o.id)}</p>
            <p className="text-sm opacity-80">{dataCurta(o.criadoEm)}</p>
          </div>
        </header>

        <div className="space-y-6 p-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label">Cliente</p>
              <p className="font-semibold">{cliente.nome}</p>
              <p className="text-sm text-muted">{[cliente.endereco, cliente.bairro, cliente.cidade].filter(Boolean).join(", ")}</p>
            </div>
            <div>
              <p className="label">Serviço</p>
              <p className="font-semibold">{o.titulo}</p>
            </div>
          </section>

          {[
            { titulo: "Mão de obra", lista: servicos },
            { titulo: "Materiais", lista: materiais },
          ]
            .filter((g) => g.lista.length)
            .map((g) => (
              <section key={g.titulo}>
                <h2 className="mb-2 font-semibold">{g.titulo}</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="py-2 font-medium">Descrição</th>
                      <th className="py-2 text-right font-medium">Qtd</th>
                      <th className="hidden py-2 text-right font-medium sm:table-cell">Unitário</th>
                      <th className="py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.lista.map((i) => (
                      <tr key={i.id} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-2">{i.descricao}</td>
                        <td className="whitespace-nowrap py-2 text-right">{numero(i.quantidade)} {i.unidade}</td>
                        <td className="hidden whitespace-nowrap py-2 text-right sm:table-cell">{reais(i.precoUnitario)}</td>
                        <td className="whitespace-nowrap py-2 text-right font-medium">{reais(i.quantidade * i.precoUnitario)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}

          <section className="ml-auto max-w-xs space-y-1.5 text-sm">
            {t.servicos > 0 && t.materiais > 0 && (
              <>
                <p className="flex justify-between"><span className="text-muted">Mão de obra</span>{reais(t.servicos)}</p>
                <p className="flex justify-between"><span className="text-muted">Materiais</span>{reais(t.materiais)}</p>
              </>
            )}
            {o.desconto > 0 && (
              <p className="flex justify-between text-ok"><span>Desconto</span>− {reais(o.desconto)}</p>
            )}
            <p className="flex justify-between border-t border-border pt-2 text-xl font-bold">
              <span>Total</span>
              {reais(t.total)}
            </p>
          </section>

          <section className="grid gap-3 rounded-2xl bg-surface-2 p-4 text-sm sm:grid-cols-2 print:bg-white">
            {o.condicoesPagamento && <Info r="Pagamento" v={o.condicoesPagamento} />}
            {p?.chavePix && <Info r="Chave PIX" v={p.chavePix} />}
            {o.prazoExecucao && <Info r="Prazo de execução" v={o.prazoExecucao} />}
            {o.garantia && <Info r="Garantia" v={o.garantia} />}
            <Info r="Validade da proposta" v={`${o.validadeDias} dias (até ${dataCurta(validade)})`} />
          </section>

          {o.observacoes && <p className="whitespace-pre-wrap text-sm text-muted">{o.observacoes}</p>}
        </div>
      </article>

      <div className="no-print mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <BotaoImprimir />
        {aprovado ? (
          <span className="btn bg-ok-soft text-ok">
            <CheckCircle2 className="size-4" /> Orçamento aprovado
          </span>
        ) : (
          p?.telefone && (
            <a
              href={linkWhatsApp(p.telefone, `Olá! Aprovo o orçamento ${numeroOrcamento(o.id)} (${o.titulo}). Podemos agendar?`)}
              className="btn btn-whatsapp"
            >
              <MessageCircle className="size-4" /> Aprovar pelo WhatsApp
            </a>
          )
        )}
      </div>
    </main>
  );
}

function Info({ r, v }: { r: string; v: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{r}</p>
      <p className="font-medium">{v}</p>
    </div>
  );
}
