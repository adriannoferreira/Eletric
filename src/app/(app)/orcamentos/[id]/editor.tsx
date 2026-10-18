"use client";

import {
  Check,
  ChevronLeft,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  MoreVertical,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Badge, Campo } from "@/components/ui";
import type { Cliente, ItemCatalogo, Orcamento, OrcamentoItem } from "@/db/schema";
import { linkWhatsApp, reais } from "@/lib/formato";
import { STATUS_ORCAMENTO } from "@/lib/opcoes";
import { numeroOrcamento, totais } from "@/lib/orcamento";
import {
  type DadosOrcamento,
  duplicarOrcamento,
  excluirOrcamento,
  mudarStatus,
  salvarOrcamento,
} from "../actions";

type Item = DadosOrcamento["itens"][number] & { chave: string };

let seq = 0;
const chave = () => `i${++seq}`;

/** Aceita "1.234,56", "1234,5" ou "1234.5". */
function lerNumero(s: string) {
  const limpo = s.trim().replace(/\s/g, "");
  const n = Number(limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo);
  return Number.isFinite(n) ? n : 0;
}

export function EditorOrcamento({
  orcamento: o,
  cliente,
  itensIniciais,
  catalogo,
}: {
  orcamento: Orcamento;
  cliente: Cliente;
  itensIniciais: OrcamentoItem[];
  catalogo: ItemCatalogo[];
}) {
  const [titulo, setTitulo] = useState(o.titulo);
  const [itens, setItens] = useState<Item[]>(() =>
    itensIniciais.map(({ tipo, descricao, quantidade, unidade, precoUnitario }) => ({
      chave: chave(),
      tipo: tipo === "material" ? "material" : "servico",
      descricao,
      quantidade,
      unidade,
      precoUnitario,
    })),
  );
  const [desconto, setDesconto] = useState(o.desconto);
  const [validadeDias, setValidadeDias] = useState(o.validadeDias);
  const [condicoesPagamento, setCondicoes] = useState(o.condicoesPagamento);
  const [prazoExecucao, setPrazo] = useState(o.prazoExecucao);
  const [garantia, setGarantia] = useState(o.garantia);
  const [observacoes, setObs] = useState(o.observacoes);
  const [sujo, setSujo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const [abrirCatalogo, setAbrirCatalogo] = useState(false);
  const [menu, setMenu] = useState(false);

  const t = useMemo(() => totais(itens, desconto), [itens, desconto]);
  const st = STATUS_ORCAMENTO[o.status] ?? STATUS_ORCAMENTO.rascunho;

  const mexeu = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setSujo(true);
  };

  function atualizarItem(k: string, campo: Partial<Item>) {
    setItens((lista) => lista.map((i) => (i.chave === k ? { ...i, ...campo } : i)));
    setSujo(true);
  }

  function adicionar(item: Omit<Item, "chave">) {
    setItens((lista) => [...lista, { ...item, chave: chave() }]);
    setSujo(true);
  }

  async function salvar() {
    const r = await salvarOrcamento(o.id, {
      titulo,
      validadeDias,
      desconto,
      condicoesPagamento,
      prazoExecucao,
      garantia,
      observacoes,
      itens: itens.map(({ tipo, descricao, quantidade, unidade, precoUnitario }) => ({ tipo, descricao, quantidade, unidade, precoUnitario })),
    });
    setErro(r.erro);
    if (!r.erro) setSujo(false);
    return !r.erro;
  }

  function enviarWhatsApp() {
    // Abre a janela já no clique (o navegador do celular bloqueia pop-up depois de await).
    const janela = window.open("", "_blank");
    iniciar(async () => {
      if (sujo && !(await salvar())) {
        janela?.close();
        return;
      }
      if (o.status === "rascunho") await mudarStatus(o.id, "enviado");
      const link = `${window.location.origin}/o/${o.tokenPublico}`;
      const primeiroNome = cliente.nome.split(" ")[0];
      const msg = `Olá ${primeiroNome}, tudo bem? Segue o orçamento de *${titulo}* (${numeroOrcamento(o.id)}), no valor de *${reais(t.total)}*.\n\nVocê pode ver todos os detalhes aqui: ${link}\n\nQualquer dúvida estou à disposição!`;
      const url = linkWhatsApp(cliente.telefone, msg);
      if (janela) janela.location.href = url;
      else window.location.href = url;
    });
  }

  return (
    <div className="pb-28 md:pb-24">
      <header className="mb-4 flex items-start gap-2">
        <Link href="/orcamentos" className="btn btn-ghost -ml-2 p-2" aria-label="Voltar">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>{numeroOrcamento(o.id)}</span>
            <Badge tom={st.tom}>{st.rotulo}</Badge>
          </div>
          <input
            value={titulo}
            onChange={(e) => mexeu(setTitulo)(e.target.value)}
            className="w-full bg-transparent text-xl font-bold tracking-tight outline-none md:text-2xl"
          />
          <Link href={`/clientes/${cliente.id}`} className="text-sm text-muted hover:underline">
            {cliente.nome}
          </Link>
        </div>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="btn btn-ghost p-2" aria-label="Mais ações">
            <MoreVertical className="size-5" />
          </button>
          {menu && (
            <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-xl" onClick={() => setMenu(false)}>
              <a href={`/o/${o.tokenPublico}`} target="_blank" className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-surface-2">
                <ExternalLink className="size-4" /> Ver como o cliente / PDF
              </a>
              <button onClick={() => iniciar(() => duplicarOrcamento(o.id))} className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-surface-2">
                <Copy className="size-4" /> Duplicar
              </button>
              <button
                onClick={() => confirm("Excluir este orçamento?") && iniciar(() => excluirOrcamento(o.id))}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-surface-2"
              >
                <Trash2 className="size-4" /> Excluir
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Andamento */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {(["enviado", "aprovado", "recusado", "executado"] as const).map((s) => (
          <button
            key={s}
            onClick={() => iniciar(() => mudarStatus(o.id, s))}
            disabled={o.status === s}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition disabled:opacity-100 ${
              o.status === s ? "border-accent bg-accent-soft" : "border-border text-muted hover:text-fg"
            }`}
          >
            {o.status === s && <Check className="mr-1 inline size-3.5" />}
            {STATUS_ORCAMENTO[s].rotulo}
          </button>
        ))}
      </div>

      {/* Itens */}
      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Itens</h2>
          <span className="text-sm text-muted">{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
        </div>
        <ul className="space-y-2">
          {itens.map((i) => (
            <li key={i.chave} className="card p-3">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => atualizarItem(i.chave, { tipo: i.tipo === "servico" ? "material" : "servico" })}
                  className={`mt-1 grid size-8 shrink-0 place-items-center rounded-lg ${i.tipo === "servico" ? "bg-accent-soft" : "bg-info-soft text-info"}`}
                  title={i.tipo === "servico" ? "Serviço (toque para mudar)" : "Material (toque para mudar)"}
                >
                  {i.tipo === "servico" ? <Wrench className="size-4" /> : <Package className="size-4" />}
                </button>
                <textarea
                  value={i.descricao}
                  onChange={(e) => atualizarItem(i.chave, { descricao: e.target.value })}
                  rows={1}
                  placeholder="Descrição do item"
                  className="min-h-10 flex-1 resize-none bg-transparent py-1.5 font-medium outline-none field-sizing-content"
                />
                <button
                  onClick={() => {
                    setItens((l) => l.filter((x) => x.chave !== i.chave));
                    setSujo(true);
                  }}
                  className="btn btn-ghost p-2 text-muted hover:text-danger"
                  aria-label="Remover item"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_1fr_1.3fr] items-end gap-2 pl-10">
                <label className="text-xs text-muted">
                  Qtd ({i.unidade})
                  <input
                    inputMode="decimal"
                    defaultValue={String(i.quantidade).replace(".", ",")}
                    onChange={(e) => atualizarItem(i.chave, { quantidade: lerNumero(e.target.value) })}
                    className="input mt-1 px-2.5 py-1.5"
                  />
                </label>
                <label className="text-xs text-muted">
                  Preço un.
                  <input
                    inputMode="decimal"
                    defaultValue={String(i.precoUnitario).replace(".", ",")}
                    onChange={(e) => atualizarItem(i.chave, { precoUnitario: lerNumero(e.target.value) })}
                    className="input mt-1 px-2.5 py-1.5"
                  />
                </label>
                <p className="pb-2 text-right font-semibold">{reais(i.quantidade * i.precoUnitario)}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => setAbrirCatalogo(true)} className="btn btn-secondary">
            <Search className="size-4" /> Do catálogo
          </button>
          <button
            onClick={() => adicionar({ tipo: "servico", descricao: "", quantidade: 1, unidade: "un", precoUnitario: 0 })}
            className="btn btn-secondary"
          >
            <Plus className="size-4" /> Item avulso
          </button>
        </div>
      </section>

      {/* Totais */}
      <section className="card mb-4 space-y-2 p-4 text-sm">
        <Linha r="Mão de obra" v={reais(t.servicos)} />
        <Linha r="Materiais" v={reais(t.materiais)} />
        <div className="flex items-center justify-between">
          <span className="text-muted">Desconto (R$)</span>
          <input
            inputMode="decimal"
            defaultValue={desconto ? String(desconto).replace(".", ",") : ""}
            placeholder="0,00"
            onChange={(e) => mexeu(setDesconto)(lerNumero(e.target.value))}
            className="input w-32 px-2.5 py-1.5 text-right"
          />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-bold">
          <span>Total</span>
          <span>{reais(t.total)}</span>
        </div>
      </section>

      {/* Condições */}
      <section className="card mb-4 grid gap-4 p-4 md:grid-cols-2">
        <Campo rotulo="Forma de pagamento">
          <input
            value={condicoesPagamento}
            onChange={(e) => mexeu(setCondicoes)(e.target.value)}
            placeholder="Ex.: 50% na aprovação e 50% na entrega (PIX)"
            className="input"
          />
        </Campo>
        <Campo rotulo="Prazo de execução">
          <input value={prazoExecucao} onChange={(e) => mexeu(setPrazo)(e.target.value)} placeholder="Ex.: 2 dias úteis" className="input" />
        </Campo>
        <Campo rotulo="Garantia">
          <input value={garantia} onChange={(e) => mexeu(setGarantia)(e.target.value)} className="input" />
        </Campo>
        <Campo rotulo="Validade da proposta (dias)">
          <input
            type="number"
            min={1}
            value={validadeDias}
            onChange={(e) => mexeu(setValidadeDias)(Math.max(1, Number(e.target.value) || 1))}
            className="input"
          />
        </Campo>
        <Campo rotulo="Observações para o cliente" className="md:col-span-2">
          <textarea
            value={observacoes}
            onChange={(e) => mexeu(setObs)(e.target.value)}
            rows={3}
            placeholder="Ex.: materiais por conta do cliente; serviço conforme NBR 5410…"
            className="input"
          />
        </Campo>
      </section>

      {/* Barra de ações fixa */}
      <div className="fixed inset-x-0 bottom-[calc(4.4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-64">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">{erro ? <span className="text-danger">{erro}</span> : sujo ? "Alterações não salvas" : "Tudo salvo"}</p>
            <p className="font-bold">{reais(t.total)}</p>
          </div>
          <button onClick={() => iniciar(async () => void (await salvar()))} disabled={salvando || !sujo} className="btn btn-secondary">
            {salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span className="hidden sm:inline">Salvar</span>
          </button>
          <button onClick={enviarWhatsApp} disabled={salvando || itens.length === 0} className="btn btn-whatsapp">
            <MessageCircle className="size-4" /> Enviar
          </button>
        </div>
      </div>

      {abrirCatalogo && (
        <SeletorCatalogo
          catalogo={catalogo}
          aoEscolher={(c) =>
            adicionar({
              tipo: c.tipo === "material" ? "material" : "servico",
              descricao: c.nome,
              quantidade: 1,
              unidade: c.unidade,
              precoUnitario: c.preco,
            })
          }
          aoFechar={() => setAbrirCatalogo(false)}
        />
      )}
    </div>
  );
}

function Linha({ r, v }: { r: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{r}</span>
      <span>{v}</span>
    </div>
  );
}

function SeletorCatalogo({
  catalogo,
  aoEscolher,
  aoFechar,
}: {
  catalogo: ItemCatalogo[];
  aoEscolher: (c: ItemCatalogo) => void;
  aoFechar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [adicionados, setAdicionados] = useState(0);
  const normal = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const lista = catalogo.filter((c) => normal(`${c.nome} ${c.categoria}`).includes(normal(busca)));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" onClick={aoFechar}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl border border-border bg-surface md:rounded-3xl"
      >
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Search className="size-4 text-muted" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus placeholder="Buscar no catálogo" className="flex-1 bg-transparent text-base outline-none" />
          <button onClick={aoFechar} className="btn btn-primary px-3 py-1.5">
            {adicionados ? `Pronto (${adicionados})` : "Fechar"}
          </button>
        </div>
        <ul className="flex-1 divide-y divide-border overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {catalogo.length === 0 && (
            <li className="p-6 text-center text-sm text-muted">
              Catálogo vazio. <Link href="/catalogo" className="text-info underline">Cadastre seus serviços</Link>.
            </li>
          )}
          {lista.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  aoEscolher(c);
                  setAdicionados((n) => n + 1);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 active:bg-accent-soft"
              >
                {c.tipo === "material" ? <Package className="size-4 shrink-0 text-info" /> : <Wrench className="size-4 shrink-0 text-accent" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{c.nome}</span>
                  <span className="text-xs text-muted">{c.categoria}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold">{reais(c.preco)}/{c.unidade}</span>
                <Plus className="size-4 shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
