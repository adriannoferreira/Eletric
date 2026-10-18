"use client";

import { Bot, Check, ChevronDown, MessageCircle, Plus, Printer, Search, Send, Store, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { aplicarPrecosNoOrcamento, pesquisarSemPrecoIA, salvarPrecoLojaManual } from "@/app/(app)/catalogo/actions";
import { MenuAcoes } from "@/components/divulgacao";
import { linkWhatsApp, reais } from "@/lib/formato";
import { chaveLoja, type ItemComparar, mensagemCotacao, montarComparativo, type PrecoLojaEntrada } from "@/lib/precos/comparativo";
import { normalizarTexto } from "@/lib/precos/variantes";

type Loja = { id: number; nome: string; whatsapp: string };
type ItemCat = { id: number; nome: string; unidade: string };

export type DadosComparar = {
  origem: { tipo: "orcamento" | "quadro"; id: number; titulo: string } | { tipo: "manual" };
  itens: ItemComparar[];
  precos: PrecoLojaEntrada[];
  lojas: Loja[];
  catalogo: ItemCat[];
  validadeDias: number;
};

const compacto = (v: number) =>
  v >= 10_000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : reais(v);

export function Comparar({ dados }: { dados: DadosComparar }) {
  const router = useRouter();
  const [manuais, setManuais] = useState<ItemComparar[]>([]);
  const [painel, setPainel] = useState<null | "cotar" | "enviar" | "usar" | "adicionar">(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  const itens = dados.origem.tipo === "manual" ? manuais : dados.itens;
  const agora = useMemo(() => new Date(), []);
  const c = useMemo(() => montarComparativo(itens, dados.precos, { validadeDias: dados.validadeDias, agora }), [itens, dados.precos, dados.validadeDias, agora]);
  const semPreco = c.linhas.filter((l) => !l.menor);
  const lojasK = c.lojas.map((l) => ({ ...l, k: chaveLoja(l.loja) }));
  const titulo = dados.origem.tipo === "manual" ? "Seleção manual" : `${dados.origem.tipo === "orcamento" ? "Orçamento" : "Quadro"}: ${dados.origem.titulo}`;

  const tabela = (
    <table className="w-full min-w-[560px] text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted">
          <th className="px-3 py-2 font-medium">Item</th>
          <th className="px-2 py-2 text-right font-medium">Qtd</th>
          {lojasK.map((l) => (
            <th key={l.k} className="px-2 py-2 text-right font-medium">
              {l.loja}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {c.linhas.map((l) => (
          <tr key={l.item.chave} className="border-b border-border/60 align-top">
            <td className="max-w-64 px-3 py-2">
          <span className="line-clamp-2">{l.item.descricao}</span>
        </td>
            <td className="whitespace-nowrap px-2 py-2 text-right">
              {String(l.item.quantidade).replace(".", ",")} {l.item.unidade}
            </td>
            {lojasK.map((lj) => {
              const cel = l.porLoja[lj.k];
              return (
                <td
                  key={lj.k}
                  className={`whitespace-nowrap px-2 py-2 text-right ${
                    !cel ? "text-muted" : l.menor === lj.k ? "font-semibold text-ok" : cel.velho ? "text-muted" : ""
                  }`}
                  title={cel ? `${reais(cel.preco)}/${l.item.unidade} · ${cel.idadeDias} dia(s)` : undefined}
                >
                  {cel ? reais(cel.subtotal) : "—"}
                  {cel?.velho && <span className="block text-[10px]">{cel.idadeDias} dias</span>}
                </td>
              );
            })}
          </tr>
        ))}
        <tr className="font-semibold">
          <td className="px-3 py-2">Total</td>
          <td />
          {lojasK.map((l) => (
            <td key={l.k} className="whitespace-nowrap px-2 py-2 text-right">
              {reais(l.total)}
              {l.itensFaltando > 0 && <span className="block text-[10px] font-normal text-muted">faltam {l.itensFaltando}</span>}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );

  function usarPrecos(loja: string | null) {
    if (dados.origem.tipo !== "orcamento") return;
    const orcId = dados.origem.id;
    const k = loja ? chaveLoja(loja) : null;
    const lista = c.linhas
      .map((l) => {
        const cel = k ? l.porLoja[k] : l.menor ? l.porLoja[l.menor] : undefined;
        return cel ? { itemId: Number(l.item.chave), preco: cel.preco, descricao: l.item.descricao } : null;
      })
      .filter((x): x is { itemId: number; preco: number; descricao: string } => x !== null);
    iniciar(async () => {
      const n = await aplicarPrecosNoOrcamento(orcId, lista);
      setPainel(null);
      setMsg({ ok: true, texto: `${n} preço(s) aplicados no orçamento.` });
    });
  }

  const acoes = [
    { rotulo: "Pedir cotação às lojas que faltam", icone: <MessageCircle className="size-4" />, onClick: () => setPainel("cotar") },
    {
      rotulo: `Pesquisar com IA os sem preço${semPreco.length ? ` (${semPreco.filter((l) => l.item.catalogoId).length})` : ""}`,
      icone: <Bot className="size-4" />,
      onClick: () =>
        iniciar(async () => {
          setMsg(null);
          const ids = semPreco.map((l) => l.item.catalogoId).filter((n): n is number => n != null);
          if (!ids.length) return setMsg({ ok: false, texto: "Nenhum item sem preço ligado ao catálogo." });
          const r = await pesquisarSemPrecoIA(ids);
          setMsg({
            ok: r.sugestoes > 0,
            texto: `${r.sugestoes} sugestão(ões) para aprovar em Atualizar preços.${r.erros.length ? ` ${r.erros[0]}` : ""}`,
          });
        }),
    },
    { rotulo: "Enviar lista para uma loja", icone: <Send className="size-4" />, onClick: () => setPainel("enviar") },
    ...(dados.origem.tipo === "orcamento"
      ? [{ rotulo: "Usar preços de uma loja no orçamento", icone: <Store className="size-4" />, onClick: () => setPainel("usar") }]
      : []),
    { rotulo: "Imprimir / PDF", icone: <Printer className="size-4" />, onClick: () => window.print() },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm text-muted">{titulo} · {itens.length} item(ns)</p>
        <div className="no-print">
          <MenuAcoes acoes={acoes} />
        </div>
      </div>

      {dados.origem.tipo === "manual" && (
        <div className="no-print">
          <button onClick={() => setPainel("adicionar")} className="btn btn-secondary w-full">
            <Plus className="size-4" /> Adicionar itens do catálogo
          </button>
        </div>
      )}

      {itens.length > 0 && (
        <>
          <section className="grid grid-cols-3 gap-2 text-center">
            <Numero r="Melhor combinação" v={compacto(c.melhorCombinacao.total)} sub={`${c.melhorCombinacao.itensCobertos}/${itens.length} itens`} destaque />
            <Numero r={c.lojaUnica ? `Só ${c.lojaUnica.loja}` : "Loja única"} v={c.lojaUnica ? compacto(c.lojaUnica.total) : "—"} sub={c.lojaUnica ? `faltam ${c.lojaUnica.faltando.length}` : "sem preços"} />
            <Numero
              r="Economia"
              v={c.economia ? compacto(c.economia.valor) : "—"}
              sub={c.economia ? `${String(c.economia.percentual).replace(".", ",")}%` : ""}
            />
          </section>

          {msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.texto}</p>}

          {dados.origem.tipo === "orcamento" ? (
            <button disabled={pendente || c.melhorCombinacao.itensCobertos === 0} onClick={() => usarPrecos(null)} className="no-print btn btn-primary w-full">
              <Check className="size-4" /> Usar os menores preços no orçamento
            </button>
          ) : semPreco.length > 0 ? (
            <button onClick={() => setPainel("cotar")} className="no-print btn btn-primary w-full">
              <MessageCircle className="size-4" /> Pedir cotação ({semPreco.length} sem preço)
            </button>
          ) : (
            <button onClick={() => setPainel("enviar")} className="no-print btn btn-primary w-full">
              <Send className="size-4" /> Enviar lista para a loja
            </button>
          )}

          {/* Lojas */}
          {lojasK.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:px-0">
              {lojasK.map((l) => (
                <div key={l.k} className={`card w-44 shrink-0 p-3 md:w-auto ${c.lojaUnica?.loja === l.loja ? "border-accent" : ""}`}>
                  <p className="truncate text-sm font-semibold">{l.loja}</p>
                  <p className="text-lg font-bold">{compacto(l.total)}</p>
                  <p className="text-xs text-muted">
                    {l.itensCom} com preço{l.itensFaltando ? ` · faltam ${l.itensFaltando}` : ""}
                    {l.desatualizados ? <span className="text-warn"> · {l.desatualizados} antigo(s)</span> : null}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Por item (celular) */}
          <ul className="card divide-y divide-border md:hidden print:hidden">
            {c.linhas.map((l) => {
              const melhor = l.menor ? l.porLoja[l.menor] : null;
              const nomeMenor = lojasK.find((x) => x.k === l.menor)?.loja;
              const abertoAqui = aberto === l.item.chave;
              return (
                <li key={l.item.chave} className="px-3 py-2.5">
                  <button onClick={() => setAberto(abertoAqui ? null : l.item.chave)} className="flex w-full items-center gap-2 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{l.item.descricao}</span>
                      <span className="text-xs text-muted">
                        {String(l.item.quantidade).replace(".", ",")} {l.item.unidade}
                        {nomeMenor ? ` · ${nomeMenor}` : ""}
                      </span>
                    </span>
                    <span className={`shrink-0 text-sm font-semibold ${melhor ? (melhor.velho ? "text-muted" : "") : "text-danger"}`}>
                      {melhor ? reais(melhor.subtotal) : "sem preço"}
                    </span>
                    <ChevronDown className={`size-4 shrink-0 text-muted transition ${abertoAqui ? "rotate-180" : ""}`} />
                  </button>
                  {abertoAqui && <DetalheItem linha={l} lojas={lojasK} todasLojas={dados.lojas} aoSalvar={() => router.refresh()} />}
                </li>
              );
            })}
          </ul>

          {/* Tabela item × loja: recolhida no celular (rola na horizontal), aberta no notebook e na impressão */}
          <details className="card overflow-hidden md:hidden print:hidden">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">Tabela item × loja</summary>
            <div className="overflow-x-auto">{tabela}</div>
          </details>
          <div className="card hidden overflow-x-auto md:block print:block">{tabela}</div>
          {c.lojas.some((l) => l.desatualizados > 0) && (
            <p className="text-xs text-muted">Em cinza: preço com mais de {dados.validadeDias} dias.</p>
          )}
        </>
      )}

      {itens.length === 0 && dados.origem.tipo === "manual" && <p className="card p-6 text-center text-sm text-muted">Adicione itens para comparar.</p>}
      {itens.length === 0 && dados.origem.tipo !== "manual" && <p className="card p-6 text-center text-sm text-muted">Nenhum material para comparar.</p>}

      {painel === "cotar" && (
        <Folha titulo="Pedir cotação" aoFechar={() => setPainel(null)}>
          {dados.lojas.length === 0 && <p className="text-sm text-muted">Cadastre lojas na aba Cotações.</p>}
          <ul className="space-y-2">
            {dados.lojas.map((lj) => {
              const k = chaveLoja(lj.nome);
              const faltam = c.linhas.filter((l) => !l.porLoja[k] || l.porLoja[k].velho).map((l) => l.item);
              return (
                <li key={lj.id}>
                  <a
                    href={linkWhatsApp(lj.whatsapp, mensagemCotacao(lj.nome, faltam))}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-disabled={!faltam.length}
                    className={`flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm ${faltam.length ? "hover:border-accent" : "pointer-events-none opacity-50"}`}
                  >
                    <span className="font-medium">{lj.nome}</span>
                    <span className="text-xs text-muted">{faltam.length ? `${faltam.length} item(ns)` : "completa"}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </Folha>
      )}

      {painel === "enviar" && (
        <Folha titulo="Enviar lista para a loja" aoFechar={() => setPainel(null)}>
          <ul className="space-y-2">
            {dados.lojas.map((lj) => (
              <li key={lj.id}>
                <a
                  href={linkWhatsApp(lj.whatsapp, mensagemCotacao(lj.nome, itens))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm hover:border-accent"
                >
                  <span className="font-medium">{lj.nome}</span>
                  <MessageCircle className="size-4 text-muted" />
                </a>
              </li>
            ))}
            <li>
              <a
                href={linkWhatsApp("", mensagemCotacao("", itens))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-dashed border-border px-3 py-2.5 text-sm"
              >
                <span>Escolher contato no WhatsApp</span>
                <MessageCircle className="size-4 text-muted" />
              </a>
            </li>
          </ul>
        </Folha>
      )}

      {painel === "usar" && (
        <Folha titulo="Usar preços de uma loja" aoFechar={() => setPainel(null)}>
          <ul className="space-y-2">
            {lojasK.map((l) => (
              <li key={l.k}>
                <button
                  disabled={pendente}
                  onClick={() => usarPrecos(l.loja)}
                  className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm hover:border-accent"
                >
                  <span className="font-medium">{l.loja}</span>
                  <span className="text-xs text-muted">
                    {reais(l.total)} · {l.itensCom} item(ns)
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Folha>
      )}

      {painel === "adicionar" && (
        <SeletorItens
          catalogo={dados.catalogo}
          aoAdicionar={(i) => setManuais((m) => [...m.filter((x) => x.chave !== i.chave), i])}
          selecionados={manuais}
          aoRemover={(chave) => setManuais((m) => m.filter((x) => x.chave !== chave))}
          aoFechar={() => setPainel(null)}
        />
      )}
    </div>
  );
}

function Numero({ r, v, sub, destaque }: { r: string; v: string; sub?: string; destaque?: boolean }) {
  return (
    <div className={`card p-2.5 ${destaque ? "border-accent" : ""}`}>
      <p className="truncate text-[11px] text-muted">{r}</p>
      <p className="truncate text-base font-bold">{v}</p>
      {sub && <p className="truncate text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function DetalheItem({
  linha,
  lojas,
  todasLojas,
  aoSalvar,
}: {
  linha: ReturnType<typeof montarComparativo>["linhas"][number];
  lojas: { k: string; loja: string }[];
  todasLojas: Loja[];
  aoSalvar: () => void;
}) {
  const [loja, setLoja] = useState(todasLojas[0]?.nome ?? "");
  const [preco, setPreco] = useState("");
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const linhas = lojas.filter((l) => linha.porLoja[l.k]).sort((a, b) => linha.porLoja[a.k].preco - linha.porLoja[b.k].preco);
  return (
    <div className="mt-2 space-y-2 rounded-xl bg-surface-2 p-2.5 text-xs">
      {linhas.map((l) => {
        const cel = linha.porLoja[l.k];
        return (
          <p key={l.k} className={`flex justify-between ${cel.velho ? "text-muted" : ""}`}>
            <span className="truncate">
              {l.loja}
              {cel.velho ? ` · ${cel.idadeDias} dias` : ""}
            </span>
            <span className={linha.menor === l.k ? "font-semibold text-ok" : ""}>
              {reais(cel.preco)}/{linha.item.unidade}
            </span>
          </p>
        );
      })}
      {linha.item.catalogoId != null && (
        <div className="flex gap-1.5">
          <input list="lojas-comparar" value={loja} onChange={(e) => setLoja(e.target.value)} placeholder="Loja" className="input min-w-0 flex-1 px-2 py-1.5 text-xs" />
          <datalist id="lojas-comparar">
            {todasLojas.map((l) => (
              <option key={l.id} value={l.nome} />
            ))}
          </datalist>
          <input value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" placeholder="R$" className="input w-20 px-2 py-1.5 text-xs" />
          <button
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                const forn = todasLojas.find((l) => normalizarTexto(l.nome) === normalizarTexto(loja));
                const e = await salvarPrecoLojaManual(linha.item.catalogoId!, loja, Number(preco.replace(",", ".")), forn?.id);
                setErro(e);
                if (!e) {
                  setPreco("");
                  aoSalvar();
                }
              })
            }
            className="btn btn-primary px-2.5 py-1.5 text-xs"
            aria-label="Salvar preço"
          >
            <Check className="size-3.5" />
          </button>
        </div>
      )}
      {linha.item.catalogoId == null && <p className="text-warn">Item fora do catálogo: cadastre a variante para comparar.</p>}
      {erro && <p className="text-danger">{erro}</p>}
    </div>
  );
}

function Folha({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: React.ReactNode }) {
  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center md:items-center" onClick={aoFechar}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button onClick={aoFechar} className="btn btn-ghost p-2" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SeletorItens({
  catalogo,
  selecionados,
  aoAdicionar,
  aoRemover,
  aoFechar,
}: {
  catalogo: ItemCat[];
  selecionados: ItemComparar[];
  aoAdicionar: (i: ItemComparar) => void;
  aoRemover: (chave: string) => void;
  aoFechar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [qtd, setQtd] = useState<Record<number, string>>({});
  const q = normalizarTexto(busca);
  const lista = catalogo.filter((c) => !q || normalizarTexto(c.nome).includes(q)).slice(0, 40);
  return (
    <Folha titulo="Itens para comparar" aoFechar={aoFechar}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus placeholder="Buscar variante (ex.: C 20)" className="input pl-9" />
      </div>
      <ul className="divide-y divide-border">
        {lista.map((c) => {
          const sel = selecionados.find((s) => s.catalogoId === c.id);
          return (
            <li key={c.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">{c.nome}</span>
              <input
                value={qtd[c.id] ?? (sel ? String(sel.quantidade).replace(".", ",") : "1")}
                onChange={(e) => setQtd((x) => ({ ...x, [c.id]: e.target.value }))}
                inputMode="decimal"
                className="input w-16 px-2 py-1 text-sm"
                aria-label={`Quantidade (${c.unidade})`}
              />
              <span className="w-6 text-xs text-muted">{c.unidade}</span>
              {sel ? (
                <button onClick={() => aoRemover(`c${c.id}`)} className="btn btn-ghost p-1.5 text-danger" aria-label="Remover">
                  <Trash2 className="size-4" />
                </button>
              ) : null}
              <button
                onClick={() =>
                  aoAdicionar({
                    chave: `c${c.id}`,
                    catalogoId: c.id,
                    descricao: c.nome,
                    quantidade: Number((qtd[c.id] ?? "1").replace(",", ".")) || 1,
                    unidade: c.unidade,
                  })
                }
                className="btn btn-secondary p-1.5"
                aria-label="Adicionar"
              >
                {sel ? <Check className="size-4 text-ok" /> : <Plus className="size-4" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Folha>
  );
}
