"use client";

import { Bot, Check, ExternalLink, History, Link2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { SeloPreco } from "@/components/precos/selo-preco";
import { Sk } from "@/components/skeleton";
import { Campo } from "@/components/ui";
import type { ItemCatalogo, PrecoHistorico, SinapiItem, SugestaoPreco } from "@/db";
import { dataCurta, reais } from "@/lib/formato";
import { desatualizado, normalizar, precoServico, ROTULO_FONTE } from "@/lib/precos/regras";
import {
  associarSinapi,
  buscarSinapi,
  decidir,
  excluirItem,
  historicoItem,
  pesquisarItemIA,
  salvarItem,
} from "./actions";

export type ItemComPreco = ItemCatalogo & { precoSalvo: number; calculado: boolean };

type Filtro = "todos" | "servico" | "material" | "velhos" | "sem";

const FILTROS: { v: Filtro; r: string }[] = [
  { v: "todos", r: "Todos" },
  { v: "servico", r: "Serviços" },
  { v: "material", r: "Materiais" },
  { v: "velhos", r: "Desatualizados" },
  { v: "sem", r: "Sem preço" },
];

type Contexto = {
  validadeDias: number;
  valorHora: number | null;
  valorHoraAjudante: number | null;
  margemServico: number;
};

export function EditorCatalogo({ itens, ...ctx }: { itens: ItemComPreco[] } & Contexto) {
  const [editando, setEditando] = useState<ItemComPreco | "novo" | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");

  const velho = (i: ItemComPreco) => !i.calculado && desatualizado(i.precoAtualizadoEm, ctx.validadeDias);
  const semPreco = (i: ItemComPreco) => i.preco <= 0;
  const contagem = { velhos: itens.filter(velho).length, sem: itens.filter(semPreco).length };

  const q = normalizar(busca);
  const visiveis = itens.filter((i) => {
    if (q && !normalizar(`${i.nome} ${i.categoria} ${i.especificacao}`).includes(q)) return false;
    if (filtro === "servico" || filtro === "material") return i.tipo === filtro;
    if (filtro === "velhos") return velho(i);
    if (filtro === "sem") return semPreco(i);
    return true;
  });
  const porCategoria = new Map<string, ItemComPreco[]>();
  for (const i of visiveis) porCategoria.set(i.categoria, [...(porCategoria.get(i.categoria) ?? []), i]);

  return (
    <>
      {!ctx.valorHora && itens.some((i) => i.tipo === "servico" && !i.precoFixo) && (
        <p className="mb-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">
          Alguns serviços são calculados pelo tempo, mas seu valor/hora ainda não foi definido. Calcule em{" "}
          <a href="/vendas/precos" className="font-semibold underline">Vendas → Preços</a> e salve no perfil.
        </p>
      )}
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar item" className="input pl-10" />
        </div>
        <button onClick={() => setEditando("novo")} className="btn btn-primary shrink-0">
          <Plus className="size-4" /> <span className="hidden sm:inline">Novo item</span>
        </button>
      </div>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
        {FILTROS.map((f) => {
          const n = f.v === "velhos" ? contagem.velhos : f.v === "sem" ? contagem.sem : null;
          return (
            <button
              key={f.v}
              onClick={() => setFiltro(f.v)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                filtro === f.v ? "border-accent bg-accent-soft" : "border-border text-muted"
              }`}
            >
              {f.r}
              {n ? <span className={`ml-1.5 ${f.v === "todos" ? "" : "text-danger"}`}>{n}</span> : null}
            </button>
          );
        })}
      </div>

      {visiveis.length === 0 && itens.length > 0 && (
        <p className="card p-6 text-center text-sm text-muted">Nenhum item neste filtro. 👍</p>
      )}

      <div className="space-y-4">
        {[...porCategoria].map(([cat, lista]) => (
          <section key={cat}>
            <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted">{cat}</h2>
            <ul className="card divide-y divide-border">
              {lista.map((i) => (
                <li key={i.id}>
                  <button onClick={() => setEditando(i)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${i.ativo ? "" : "text-muted line-through"}`}>{i.nome}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span>
                          {i.tipo === "servico" ? "Serviço" : "Material"} · por {i.unidade}
                        </span>
                        <SeloPreco
                          fonte={i.calculado ? "calculado" : i.fontePreco}
                          data={i.precoAtualizadoEm}
                          validadeDias={ctx.validadeDias}
                          semPreco={i.preco <= 0}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold">{reais(i.preco)}</span>
                      {i.tipo === "servico" && i.mercadoMin != null && i.mercadoMax != null && (
                        <span className="block text-[11px] text-muted">
                          mercado {reais(i.mercadoMin)}–{reais(i.mercadoMax)}
                        </span>
                      )}
                    </span>
                    <Pencil className="size-4 shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {editando && (
        <FormItem
          key={editando === "novo" ? "novo" : editando.id}
          item={editando === "novo" ? undefined : editando}
          ctx={ctx}
          aoFechar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function lerNum(s: string) {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : null;
}

const fmt = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

function FormItem({ item, ctx, aoFechar }: { item?: ItemComPreco; ctx: Contexto; aoFechar: () => void }) {
  const [estado, acao, pendente] = useActionState(salvarItem, null);
  const [enviado, setEnviado] = useState(false);
  const [tipo, setTipo] = useState(item?.tipo ?? "servico");
  const [porTempo, setPorTempo] = useState(item ? !item.precoFixo : false);
  const [horasE, setHorasE] = useState(fmt(item?.horasEletricista));
  const [horasA, setHorasA] = useState(fmt(item?.horasAjudante));
  const [mult, setMult] = useState(fmt(item?.multiplicador ?? 1));
  const [desloc, setDesloc] = useState(fmt(item?.deslocamento));

  useEffect(() => {
    if (enviado && !pendente && estado === null) aoFechar();
  }, [enviado, pendente, estado, aoFechar]);

  const calculado =
    tipo === "servico" && porTempo && ctx.valorHora
      ? precoServico(
          {
            horasEletricista: lerNum(horasE),
            horasAjudante: lerNum(horasA),
            multiplicador: lerNum(mult) ?? 1,
            deslocamento: lerNum(desloc),
          },
          { valorHora: ctx.valorHora, valorHoraAjudante: ctx.valorHoraAjudante, margemServico: ctx.margemServico },
        )
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" onClick={aoFechar}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:rounded-3xl"
      >
        <form
          action={(f) => {
            setEnviado(true);
            acao(f);
          }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{item ? "Editar item" : "Novo item"}</h2>
            <button type="button" onClick={aoFechar} className="btn btn-ghost p-2" aria-label="Fechar">
              <X className="size-5" />
            </button>
          </div>
          {item && <input type="hidden" name="id" value={item.id} />}
          <Campo rotulo="Nome">
            <input name="nome" required defaultValue={item?.nome} className="input" autoFocus={!item} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Tipo">
              <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="input">
                <option value="servico">Serviço</option>
                <option value="material">Material</option>
              </select>
            </Campo>
            <Campo rotulo="Categoria">
              <input name="categoria" defaultValue={item?.categoria ?? ""} placeholder="Ex.: Iluminação" className="input" />
            </Campo>
            <Campo rotulo="Unidade">
              <input name="unidade" defaultValue={item?.unidade ?? "un"} placeholder="un, m, ponto…" className="input" />
            </Campo>
            <Campo rotulo={tipo === "servico" && porTempo ? "Preço (fixo, se não calcular)" : "Preço (R$)"}>
              <input
                name="preco"
                inputMode="decimal"
                defaultValue={item ? fmt(item.precoSalvo) : ""}
                placeholder="0,00"
                className="input"
              />
            </Campo>
          </div>
          <Campo rotulo="Especificação" dica="Ex.: 750 V, classe 5, antichama · curva C · 30 mA">
            <input name="especificacao" defaultValue={item?.especificacao ?? ""} className="input" />
          </Campo>

          {tipo === "servico" ? (
            <section className="space-y-3 rounded-2xl bg-surface-2 p-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Calcular preço pelo tempo</span>
                <input
                  type="checkbox"
                  checked={porTempo}
                  onChange={(e) => setPorTempo(e.target.checked)}
                  className="size-5 accent-[var(--accent)]"
                />
              </label>
              <input type="hidden" name="precoFixo" value={porTempo ? "off" : "on"} />
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Horas eletricista">
                  <input name="horasEletricista" inputMode="decimal" value={horasE} onChange={(e) => setHorasE(e.target.value)} placeholder="0,5" className="input" />
                </Campo>
                <Campo rotulo="Horas ajudante">
                  <input name="horasAjudante" inputMode="decimal" value={horasA} onChange={(e) => setHorasA(e.target.value)} placeholder="0" className="input" />
                </Campo>
                <Campo rotulo="Dificuldade (×)" dica="1 = normal; 1,3 = difícil">
                  <input name="multiplicador" inputMode="decimal" value={mult} onChange={(e) => setMult(e.target.value)} className="input" />
                </Campo>
                <Campo rotulo="Deslocamento (R$)">
                  <input name="deslocamento" inputMode="decimal" value={desloc} onChange={(e) => setDesloc(e.target.value)} placeholder="0" className="input" />
                </Campo>
              </div>
              {porTempo &&
                (ctx.valorHora ? (
                  <p className="text-sm">
                    Preço calculado: <strong>{reais(calculado ?? 0)}</strong>
                    <span className="block text-xs text-muted">
                      Valor/hora {reais(ctx.valorHora)} · ajudante {reais(ctx.valorHoraAjudante ?? ctx.valorHora / 2)}
                      {ctx.margemServico ? ` · margem ${ctx.margemServico}%` : ""}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-warn">Defina seu valor/hora em Vendas → Preços para calcular.</p>
                ))}
              {item?.mercadoMin != null && item.mercadoMax != null && (
                <p className="text-xs text-muted">
                  Faixa de mercado em Belém e região: {reais(item.mercadoMin)} a {reais(item.mercadoMax)}
                  {item.mercadoAtualizadoEm && ` (pesquisa de ${dataCurta(item.mercadoAtualizadoEm)})`}
                </p>
              )}
            </section>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Fornecedor">
                <input name="fornecedor" defaultValue={item?.fornecedor ?? ""} className="input" />
              </Campo>
              <Campo rotulo="Código SINAPI">
                <input name="codigoSinapi" defaultValue={item?.codigoSinapi ?? ""} inputMode="numeric" className="input" />
              </Campo>
            </div>
          )}
          {tipo === "servico" && <input type="hidden" name="codigoSinapi" value={item?.codigoSinapi ?? ""} />}

          {estado && <p className="text-sm text-danger">{estado}</p>}
          <div className="flex gap-2">
            {item && (
              <button
                type="button"
                className="btn btn-danger"
                aria-label="Excluir item"
                onClick={async () => {
                  if (confirm("Excluir este item? Ele sai também dos kits.")) {
                    await excluirItem(item.id);
                    aoFechar();
                  }
                }}
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <button className="btn btn-primary flex-1" disabled={pendente}>
              {pendente ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>

        {item && (
          <div className="mt-5 space-y-3 border-t border-border pt-4">
            <PesquisaIA item={item} />
            <SinapiItem item={item} />
            <Historico id={item.id} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Pesquisa o preço na web com IA e mostra a sugestão para aprovar. */
export function PesquisaIA({ item }: { item: Pick<ItemCatalogo, "id" | "tipo" | "precoFixo"> }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sug, setSug] = useState<SugestaoPreco | null>(null);
  const [feito, setFeito] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {!sug && (
        <button
          type="button"
          disabled={pendente}
          onClick={() => {
            setErro(null);
            setFeito(null);
            iniciar(async () => {
              const r = await pesquisarItemIA(item.id);
              if (r.ok) setSug(r.sugestao);
              else setErro(r.erro);
            });
          }}
          className="btn btn-secondary w-full"
        >
          <Bot className="size-4" /> {pendente ? "Pesquisando lojas de Belém…" : "Pesquisar preço com IA"}
        </button>
      )}
      {pendente && (
        <div className="space-y-2 rounded-2xl border border-border p-3" aria-label="Pesquisando">
          <Sk className="h-4 w-40" />
          <div className="grid grid-cols-3 gap-2">
            <Sk className="h-10" />
            <Sk className="h-10" />
            <Sk className="h-10" />
          </div>
          <Sk className="h-3 w-3/4" />
          <Sk className="h-3 w-2/3" />
          <p className="text-xs text-muted">A IA pesquisa na web; pode levar até 1 minuto.</p>
        </div>
      )}
      {erro && <p className="text-sm text-danger">{erro}</p>}
      {feito && <p className="text-sm text-ok">{feito}</p>}
      {sug && <CartaoSugestao sugestao={sug} servicoCalculado={item.tipo === "servico" && !item.precoFixo} aoDecidir={(m) => { setSug(null); setFeito(m); }} />}
    </div>
  );
}

export function CartaoSugestao({
  sugestao: s,
  titulo,
  servicoCalculado,
  aoDecidir,
}: {
  sugestao: SugestaoPreco;
  titulo?: string;
  servicoCalculado?: boolean;
  aoDecidir?: (mensagem: string) => void;
}) {
  const [preco, setPreco] = useState(fmt(s.preco));
  const [pendente, iniciar] = useTransition();
  return (
    <div className="space-y-3 rounded-2xl border border-info/40 bg-info-soft/40 p-3">
      {titulo && <p className="font-semibold">{titulo}</p>}
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        {[
          { r: "Mínimo", v: s.minimo },
          { r: "Mediano", v: s.preco },
          { r: "Máximo", v: s.maximo },
        ].map((x) => (
          <div key={x.r} className="rounded-xl bg-surface p-2">
            <p className="text-[11px] text-muted">{x.r}</p>
            <p className="font-semibold">{x.v != null ? reais(x.v) : "—"}</p>
          </div>
        ))}
      </div>
      {s.observacao && <p className="text-xs text-muted">{s.observacao}</p>}
      {s.fontesWeb.length > 0 && (
        <ul className="space-y-1 text-xs">
          {s.fontesWeb.map((f, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <ExternalLink className="size-3 shrink-0 text-muted" />
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="truncate text-info underline">
                {f.loja || f.url}
              </a>
              {f.preco != null && <span className="shrink-0 text-muted">{reais(f.preco)}</span>}
            </li>
          ))}
        </ul>
      )}
      {servicoCalculado ? (
        <p className="text-xs text-muted">
          Este serviço é calculado pelo tempo: aprovar só registra a faixa de mercado para comparação.
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        {!servicoCalculado && (
          <label className="flex-1 text-xs text-muted">
            Preço a usar
            <input value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" className="input mt-1 px-2.5 py-1.5" />
          </label>
        )}
        <button
          type="button"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              await decidir(s.id, false);
              aoDecidir?.("Sugestão descartada.");
            })
          }
          className="btn btn-secondary"
        >
          <X className="size-4" /> Descartar
        </button>
        <button
          type="button"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              await decidir(s.id, true, lerNum(preco) ?? undefined);
              aoDecidir?.("Preço atualizado.");
            })
          }
          className="btn btn-primary"
        >
          <Check className="size-4" /> Aprovar
        </button>
      </div>
    </div>
  );
}

function SinapiItem({ item }: { item: ItemComPreco }) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState(item.nome);
  const [res, setRes] = useState<SinapiItem[] | null>(null);
  const [pendente, iniciar] = useTransition();
  const [ok, setOk] = useState<string | null>(null);
  const tipo = item.tipo === "servico" ? "composicao" : "insumo";

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="btn btn-ghost w-full justify-start text-sm">
        <Link2 className="size-4" /> {item.codigoSinapi ? `SINAPI ${item.codigoSinapi} · trocar` : "Associar a um código SINAPI"}
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-2xl bg-surface-2 p-3">
      <p className="text-sm font-medium">Buscar no SINAPI importado ({tipo === "insumo" ? "insumos" : "composições"})</p>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} className="input py-2" />
        <button
          type="button"
          disabled={pendente}
          className="btn btn-secondary"
          onClick={() => iniciar(async () => setRes(await buscarSinapi(q, tipo)))}
        >
          <Search className="size-4" />
        </button>
      </div>
      {pendente && <Sk className="h-16" />}
      {res && res.length === 0 && (
        <p className="text-xs text-muted">Nada encontrado. Importe a tabela SINAPI em “Atualizar preços” ou simplifique a busca.</p>
      )}
      {res?.map((r) => (
        <button
          key={r.id}
          type="button"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              await associarSinapi(item.id, r.id);
              setOk(`Associado ao SINAPI ${r.codigo}.`);
              setRes(null);
            })
          }
          className="block w-full rounded-xl bg-surface p-2 text-left text-xs hover:ring-2 hover:ring-accent"
        >
          <span className="font-semibold">{r.codigo}</span> · {r.descricao}
          <span className="block text-muted">
            {r.unidade} · {r.preco != null ? reais(r.preco) : "sem preço"}
            {r.horasEletricista ? ` · ${String(r.horasEletricista).replace(".", ",")} h eletricista` : ""}
          </span>
        </button>
      ))}
      {ok && <p className="text-xs text-ok">{ok}</p>}
    </div>
  );
}

function Historico({ id }: { id: number }) {
  const [lista, setLista] = useState<PrecoHistorico[] | null>(null);
  const [pendente, iniciar] = useTransition();
  if (!lista) {
    return (
      <button
        type="button"
        disabled={pendente}
        onClick={() => iniciar(async () => setLista(await historicoItem(id)))}
        className="btn btn-ghost w-full justify-start text-sm"
      >
        <History className="size-4" /> {pendente ? "Carregando histórico…" : "Histórico de preços"}
      </button>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">Histórico de preços</p>
      {lista.length === 0 && <p className="text-xs text-muted">Nenhum registro ainda.</p>}
      {lista.map((h) => (
        <p key={h.id} className="flex justify-between gap-2 text-xs">
          <span className="text-muted">
            {dataCurta(h.criadoEm)} · {ROTULO_FONTE[h.fonte] ?? h.fonte}
            {h.fornecedorNome && ` · ${h.fornecedorNome}`}
          </span>
          <span className="font-medium">{reais(h.preco)}</span>
        </p>
      ))}
    </div>
  );
}
