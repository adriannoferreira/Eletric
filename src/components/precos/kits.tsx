"use client";

import { Boxes, ChevronDown, Package, Plus, Search, Trash2, Wrench, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { carregarKits, excluirKit, salvarKit } from "@/app/(app)/catalogo/actions";
import { Campo, Vazio } from "@/components/ui";
import type { Kit, KitItem } from "@/db";
import { reais } from "@/lib/formato";
import { custoKit, expandirKit } from "@/lib/precos/kits";
import { normalizar } from "@/lib/precos/regras";

export type ItemCat = { id: number; nome: string; tipo: string; unidade: string; preco: number; categoria: string };
type KitComItens = Kit & { itens: KitItem[] };

export function EditorKits({ kits, catalogo }: { kits: KitComItens[]; catalogo: ItemCat[] }) {
  const [editando, setEditando] = useState<KitComItens | "novo" | null>(null);
  const [aberto, setAberto] = useState<number | null>(null);
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const precos = useMemo(() => new Map(catalogo.map((c) => [c.id, c])), [catalogo]);

  const botaoSugeridos = (
    <button
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const n = await carregarKits();
          setMsg(n ? `${n} kit(s) carregados. Itens que faltavam foram criados no catálogo — confira os preços.` : "Os kits sugeridos já estão carregados.");
        })
      }
      className="btn btn-secondary"
    >
      {pendente ? "Carregando…" : "Carregar kits sugeridos"}
    </button>
  );

  return (
    <>
      <p className="mb-3 text-sm text-muted">
        Serviço + materiais. No orçamento, “5 pontos de tomada” já traz tudo com preço.
      </p>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        {botaoSugeridos}
        <button onClick={() => setEditando("novo")} className="btn btn-primary">
          <Plus className="size-4" /> Novo kit
        </button>
      </div>
      {msg && <p className="mb-3 rounded-xl bg-ok-soft p-3 text-sm text-ok">{msg}</p>}

      {kits.length === 0 ? (
        <Vazio icone={Boxes} titulo="Nenhum kit ainda" texto="Comece pelos kits sugeridos (tomada, iluminação, chuveiro, ar-condicionado, DR, DPS…) e ajuste às suas obras." />
      ) : (
        <ul className="space-y-2">
          {kits.map((k) => {
            const itens = expandirKit(k, 1, precos);
            const semPreco = itens.filter((i) => i.precoUnitario <= 0).length;
            return (
              <li key={k.id} className="card">
                <button onClick={() => setAberto(aberto === k.id ? null : k.id)} className="flex w-full items-center gap-3 p-4 text-left">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft">
                    <Boxes className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{k.nome}</span>
                    <span className="text-xs text-muted">
                      {k.categoria} · {k.itens.length} itens · por {k.unidade}
                      {semPreco > 0 && <span className="text-danger"> · {semPreco} sem preço</span>}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold">{reais(custoKit(itens))}</span>
                  <ChevronDown className={`size-4 shrink-0 text-muted transition ${aberto === k.id ? "rotate-180" : ""}`} />
                </button>
                {aberto === k.id && (
                  <div className="border-t border-border px-4 pb-4 pt-3">
                    {k.descricao && <p className="mb-2 text-sm text-muted">{k.descricao}</p>}
                    <ul className="space-y-1 text-sm">
                      {itens.map((i, n) => (
                        <li key={n} className="flex justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5">
                            {i.tipo === "servico" ? <Wrench className="size-3.5 shrink-0 text-accent" /> : <Package className="size-3.5 shrink-0 text-info" />}
                            <span className="truncate">
                              {String(i.quantidade).replace(".", ",")} {i.unidade} · {i.descricao}
                            </span>
                          </span>
                          <span className={i.precoUnitario <= 0 ? "text-danger" : ""}>{reais(i.quantidade * i.precoUnitario)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => confirm(`Excluir o kit "${k.nome}"?`) && iniciar(() => excluirKit(k.id))}
                        className="btn btn-danger"
                        aria-label="Excluir kit"
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <button onClick={() => setEditando(k)} className="btn btn-secondary">
                        Editar kit
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {editando && (
        <FormKit kit={editando === "novo" ? undefined : editando} catalogo={catalogo} aoFechar={() => setEditando(null)} />
      )}
    </>
  );
}

type Linha = {
  chave: string;
  catalogoId: number | null;
  tipo: "servico" | "material";
  descricao: string;
  unidade: string;
  quantidade: string;
  familia?: string | null;
  atributos?: Record<string, string | number>;
  variaveis?: Record<string, string | number>;
};
let seq = 0;

function FormKit({ kit, catalogo, aoFechar }: { kit?: KitComItens; catalogo: ItemCat[]; aoFechar: () => void }) {
  const [nome, setNome] = useState(kit?.nome ?? "");
  const [categoria, setCategoria] = useState(kit?.categoria ?? "");
  const [unidade, setUnidade] = useState(kit?.unidade ?? "un");
  const [descricao, setDescricao] = useState(kit?.descricao ?? "");
  const [linhas, setLinhas] = useState<Linha[]>(
    () =>
      kit?.itens.map((i) => ({
        chave: `l${++seq}`,
        catalogoId: i.catalogoId,
        tipo: i.tipo === "servico" ? "servico" : "material",
        descricao: i.descricao,
        unidade: i.unidade,
        quantidade: String(i.quantidade).replace(".", ","),
        familia: i.familia,
        atributos: i.atributos,
        variaveis: i.variaveis,
      })) ?? [],
  );
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const achados = busca.trim()
    ? catalogo.filter((c) => normalizar(`${c.nome} ${c.categoria}`).includes(normalizar(busca))).slice(0, 8)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" onClick={aoFechar}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{kit ? "Editar kit" : "Novo kit"}</h2>
          <button onClick={aoFechar} className="btn btn-ghost p-2" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <Campo rotulo="Nome do kit">
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Ponto de tomada 10 A embutido" className="input" />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Categoria">
            <input value={categoria} onChange={(e) => setCategoria(e.target.value)} className="input" />
          </Campo>
          <Campo rotulo="Unidade do kit">
            <input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="un, m, ponto" className="input" />
          </Campo>
        </div>
        <Campo rotulo="Descrição">
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className="input" />
        </Campo>

        <div>
          <p className="label mb-1.5">Itens por unidade do kit</p>
          <ul className="space-y-2">
            {linhas.map((l) => (
              <li key={l.chave} className="flex items-center gap-2 rounded-xl bg-surface-2 p-2">
                {l.tipo === "servico" ? <Wrench className="size-4 shrink-0 text-accent" /> : <Package className="size-4 shrink-0 text-info" />}
                <span className="min-w-0 flex-1 truncate text-sm">{l.descricao}</span>
                <input
                  value={l.quantidade}
                  onChange={(e) => setLinhas((ls) => ls.map((x) => (x.chave === l.chave ? { ...x, quantidade: e.target.value } : x)))}
                  inputMode="decimal"
                  className="input w-20 px-2 py-1.5 text-right"
                  aria-label="Quantidade"
                />
                <span className="w-6 text-xs text-muted">{l.unidade}</span>
                <button onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))} className="btn btn-ghost p-1.5 text-muted" aria-label="Remover">
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Adicionar item do catálogo" className="input pl-10" />
          </div>
          {achados.length > 0 && (
            <ul className="mt-1 divide-y divide-border rounded-xl border border-border">
              {achados.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      setLinhas((ls) => [
                        ...ls,
                        { chave: `l${++seq}`, catalogoId: c.id, tipo: c.tipo === "servico" ? "servico" : "material", descricao: c.nome, unidade: c.unidade, quantidade: "1" },
                      ]);
                      setBusca("");
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
                  >
                    <span className="truncate">{c.nome}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {reais(c.preco)}/{c.unidade}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await salvarKit({
                id: kit?.id ?? null,
                nome,
                categoria,
                unidade,
                descricao,
                itens: linhas.map((l) => ({
                  catalogoId: l.catalogoId,
                  tipo: l.tipo,
                  descricao: l.descricao,
                  unidade: l.unidade,
                  quantidade: Number(l.quantidade.replace(",", ".")) || 0,
                  familia: l.familia ?? null,
                  atributos: l.atributos ?? {},
                  variaveis: l.variaveis ?? {},
                })),
              });
              if (r) setErro(r);
              else aoFechar();
            })
          }
          className="btn btn-primary w-full"
        >
          {pendente ? "Salvando…" : "Salvar kit"}
        </button>
      </div>
    </div>
  );
}
