"use client";

import { Camera, Check, ClipboardPaste, MessageCircle, Pencil, Plus, Store, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { aplicarCotacao, excluirFornecedor, salvarFornecedor } from "@/app/(app)/catalogo/actions";
import { Sk } from "@/components/skeleton";
import { Campo } from "@/components/ui";
import type { Fornecedor } from "@/db";
import { linkWhatsApp, numero } from "@/lib/formato";
import type { CotacaoExtraida } from "@/lib/precos/ia";

type ItemLista = { descricao: string; quantidade: number | null; unidade: string };
type Cat = { id: number; nome: string; unidade: string; tipo: string };

export function Cotacoes({
  iaLigada,
  lojas,
  catalogo,
  desatualizados,
  orcamentos,
}: {
  iaLigada: boolean;
  lojas: Fornecedor[];
  catalogo: Cat[];
  desatualizados: ItemLista[];
  orcamentos: { id: number; titulo: string; cliente: string; itens: ItemLista[] }[];
}) {
  return (
    <div className="space-y-6">
      <Lojas lojas={lojas} />
      <RegistrarCotacao iaLigada={iaLigada} lojas={lojas} catalogo={catalogo} />
      <PedirCotacao lojas={lojas} desatualizados={desatualizados} orcamentos={orcamentos} />
    </div>
  );
}

/* --------------------------------- Lojas --------------------------------- */

function Lojas({ lojas }: { lojas: Fornecedor[] }) {
  const [editando, setEditando] = useState<Fornecedor | "nova" | null>(null);
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Store className="size-4" /> Minhas lojas
        </h2>
        <button onClick={() => setEditando("nova")} className="btn btn-secondary px-3 py-1.5">
          <Plus className="size-4" /> Loja
        </button>
      </div>
      {lojas.length === 0 ? (
        <p className="card p-4 text-sm text-muted">Nenhuma loja cadastrada.</p>
      ) : (
        <ul className="card divide-y divide-border">
          {lojas.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{l.nome}</p>
                <p className="text-xs text-muted">{[l.whatsapp, l.cidade].filter(Boolean).join(" · ") || "sem contato"}</p>
              </div>
              {l.whatsapp && (
                <a href={linkWhatsApp(l.whatsapp)} target="_blank" className="btn btn-ghost p-2 text-[#25d366]" aria-label="WhatsApp">
                  <MessageCircle className="size-4" />
                </a>
              )}
              <button onClick={() => setEditando(l)} className="btn btn-ghost p-2 text-muted" aria-label="Editar loja">
                <Pencil className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {editando && <FormLoja loja={editando === "nova" ? undefined : editando} aoFechar={() => setEditando(null)} />}
    </section>
  );
}

function FormLoja({ loja, aoFechar }: { loja?: Fornecedor; aoFechar: () => void }) {
  const [estado, acao, pendente] = useActionState(salvarFornecedor, null);
  useEffect(() => {
    if (estado === "ok") aoFechar();
  }, [estado, aoFechar]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" onClick={aoFechar}>
      <div className="absolute inset-0 bg-black/50" />
      <form
        action={acao}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg space-y-4 rounded-t-3xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{loja ? "Editar loja" : "Nova loja"}</h2>
          <button type="button" onClick={aoFechar} className="btn btn-ghost p-2" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        {loja && <input type="hidden" name="id" value={loja.id} />}
        <Campo rotulo="Nome da loja">
          <input name="nome" required defaultValue={loja?.nome} className="input" autoFocus />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="WhatsApp">
            <input name="whatsapp" type="tel" inputMode="tel" defaultValue={loja?.whatsapp} placeholder="(91) 9…" className="input" />
          </Campo>
          <Campo rotulo="Cidade">
            <input name="cidade" defaultValue={loja?.cidade ?? "Belém"} className="input" />
          </Campo>
        </div>
        {estado && estado !== "ok" && <p className="text-sm text-danger">{estado}</p>}
        <div className="flex gap-2">
          {loja && (
            <button
              type="button"
              className="btn btn-danger"
              aria-label="Excluir loja"
              onClick={async () => {
                if (confirm("Excluir esta loja?")) {
                  await excluirFornecedor(loja.id);
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
    </div>
  );
}

/* --------------------------- Registrar cotação --------------------------- */

/** Reduz fotos grandes (câmera do celular) para caber no envio e ler mais rápido. */
async function reduzirImagem(arquivo: File): Promise<File> {
  if (!arquivo.type.startsWith("image/") || arquivo.size < 900_000) return arquivo;
  const bmp = await createImageBitmap(arquivo);
  const escala = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * escala);
  canvas.height = Math.round(bmp.height * escala);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  return blob ? new File([blob], "cotacao.jpg", { type: "image/jpeg" }) : arquivo;
}

type Revisao = {
  descricao: string;
  quantidade: number | null;
  unidade: string;
  preco: string;
  /** id do catálogo | "novo" | "ignorar" */
  destino: string;
};

function RegistrarCotacao({ iaLigada, lojas, catalogo }: { iaLigada: boolean; lojas: Fornecedor[]; catalogo: Cat[] }) {
  const [loja, setLoja] = useState<string>(lojas[0] ? String(lojas[0].id) : "");
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [revisao, setRevisao] = useState<Revisao[] | null>(null);
  const [obs, setObs] = useState("");
  const [aplicando, iniciar] = useTransition();
  const [ok, setOk] = useState<string | null>(null);

  async function ler() {
    setErro(null);
    setOk(null);
    setLendo(true);
    try {
      const fd = new FormData();
      if (texto.trim()) fd.set("texto", texto);
      if (arquivo) fd.set("arquivo", await reduzirImagem(arquivo));
      const res = await fetch("/api/precos/cotacao", { method: "POST", body: fd });
      const dados = (await res.json()) as CotacaoExtraida & { erro?: string };
      if (!res.ok || dados.erro) throw new Error(dados.erro ?? "Erro ao ler a cotação.");
      setObs(dados.observacao);
      setRevisao(
        dados.itens.map((i) => ({
          descricao: i.descricao,
          quantidade: i.quantidade,
          unidade: i.unidade,
          preco: i.precoUnitario != null ? String(i.precoUnitario).replace(".", ",") : "",
          destino: i.catalogoId != null ? String(i.catalogoId) : "novo",
        })),
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao ler a cotação.");
    } finally {
      setLendo(false);
    }
  }

  function aplicar() {
    if (!revisao) return;
    iniciar(async () => {
      const itens = revisao
        .filter((r) => r.destino !== "ignorar")
        .map((r) => ({
          catalogoId: r.destino === "novo" ? null : Number(r.destino),
          criarNovo: r.destino === "novo",
          tipo: "material" as const,
          descricao: r.descricao,
          unidade: r.unidade,
          preco: Number(r.preco.replace(/\./g, "").replace(",", ".")) || 0,
        }))
        .filter((i) => i.preco > 0);
      const r = await aplicarCotacao(loja ? Number(loja) : null, itens);
      if (r.erro) setErro(r.erro);
      else {
        setOk(`${r.aplicados} preço(s) atualizados no catálogo como "Cotação".`);
        setRevisao(null);
        setTexto("");
        setArquivo(null);
      }
    });
  }

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <ClipboardPaste className="size-4" /> Registrar cotação recebida
      </h2>
      <div className="card space-y-3 p-4">
        {!iaLigada && <p className="text-sm text-warn">A leitura automática precisa da IA (ANTHROPIC_API_KEY).</p>}
        <Campo rotulo="Loja">
          <select value={loja} onChange={(e) => setLoja(e.target.value)} className="input">
            <option value="">— sem loja cadastrada —</option>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Cole a resposta da loja" ajuda="Texto do WhatsApp ou e-mail com itens e preços. A IA lê e casa cada linha com a variante exata do catálogo.">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            placeholder={"Ex.:\nCabo flex 2,5mm rolo 100m - R$ 289,90\nDisjuntor din 20A curva C - 16,50"}
            className="input"
          />
        </Campo>
        <label className="btn btn-secondary w-full cursor-pointer">
          <Camera className="size-4" /> {arquivo ? arquivo.name : "Ou envie foto / print / PDF"}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </label>
        <button onClick={ler} disabled={lendo || (!texto.trim() && !arquivo) || !iaLigada} className="btn btn-primary w-full">
          {lendo ? "Lendo cotação…" : "Ler cotação com IA"}
        </button>
        {lendo && (
          <div className="space-y-2" aria-label="Lendo cotação">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex gap-2">
                <Sk className="h-9 flex-1" />
                <Sk className="h-9 w-20" />
              </div>
            ))}
          </div>
        )}
        {erro && <p className="text-sm text-danger">{erro}</p>}
        {ok && <p className="text-sm text-ok">{ok}</p>}
      </div>

      {revisao && (
        <div className="card mt-3 space-y-3 p-4">
          <p className="font-semibold">Confira antes de salvar</p>
          {obs && <p className="text-xs text-muted">{obs}</p>}
          {revisao.length === 0 && <p className="text-sm text-muted">Nenhum item encontrado na cotação.</p>}
          <ul className="space-y-3">
            {revisao.map((r, i) => (
              <li key={i} className="space-y-2 rounded-xl bg-surface-2 p-3">
                <p className="text-sm font-medium">
                  {r.descricao}
                  {r.quantidade != null && (
                    <span className="text-muted">
                      {" "}
                      · {numero(r.quantidade)} {r.unidade}
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-[1fr_7rem] gap-2">
                  <select
                    value={r.destino}
                    onChange={(e) => setRevisao((l) => l!.map((x, n) => (n === i ? { ...x, destino: e.target.value } : x)))}
                    className="input px-2.5 py-2 text-sm"
                    aria-label="Item do catálogo"
                  >
                    <option value="novo">+ Criar item novo</option>
                    <option value="ignorar">Ignorar</option>
                    {catalogo.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    value={r.preco}
                    onChange={(e) => setRevisao((l) => l!.map((x, n) => (n === i ? { ...x, preco: e.target.value } : x)))}
                    inputMode="decimal"
                    className="input px-2.5 py-2 text-right text-sm"
                    aria-label="Preço unitário"
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button onClick={() => setRevisao(null)} className="btn btn-secondary">
              Cancelar
            </button>
            <button onClick={aplicar} disabled={aplicando} className="btn btn-primary flex-1">
              <Check className="size-4" /> {aplicando ? "Salvando…" : "Atualizar catálogo"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ----------------------------- Pedir cotação ----------------------------- */

function PedirCotacao({
  lojas,
  desatualizados,
  orcamentos,
}: {
  lojas: Fornecedor[];
  desatualizados: ItemLista[];
  orcamentos: { id: number; titulo: string; cliente: string; itens: ItemLista[] }[];
}) {
  const [origem, setOrigem] = useState<string>("velhos");
  const [loja, setLoja] = useState<string>(lojas[0] ? String(lojas[0].id) : "");
  const itens = useMemo(
    () => (origem === "velhos" ? desatualizados : (orcamentos.find((o) => String(o.id) === origem)?.itens ?? [])),
    [origem, desatualizados, orcamentos],
  );
  const lojaSel = lojas.find((l) => String(l.id) === loja);
  const textoBase = useMemo(() => {
    const linhas = itens.map((i) => `• ${i.quantidade != null ? `${numero(i.quantidade)} ${i.unidade} — ` : ""}${i.descricao}`);
    return `Olá${lojaSel ? `, ${lojaSel.nome}` : ""}! Tudo bem? Poderiam me passar o preço${itens.some((i) => i.quantidade != null) ? " e a disponibilidade" : " unitário"} destes itens?\n\n${linhas.join("\n")}\n\nObrigado!`;
  }, [itens, lojaSel]);
  const [texto, setTexto] = useState<string | null>(null);
  const mensagem = texto ?? textoBase;

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <MessageCircle className="size-4" /> Pedir cotação pelo WhatsApp
      </h2>
      <div className="card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Itens">
            <select
              value={origem}
              onChange={(e) => {
                setOrigem(e.target.value);
                setTexto(null);
              }}
              className="input"
            >
              <option value="velhos">Preços desatualizados ou sem preço ({desatualizados.length})</option>
              {orcamentos.map((o) => (
                <option key={o.id} value={o.id}>
                  Orçamento: {o.titulo} — {o.cliente} ({o.itens.length})
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Loja">
            <select
              value={loja}
              onChange={(e) => {
                setLoja(e.target.value);
                setTexto(null);
              }}
              className="input"
            >
              <option value="">Escolher contato no WhatsApp</option>
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        {itens.length === 0 ? (
          <p className="text-sm text-muted">Nenhum material nesta lista. 👍</p>
        ) : (
          <>
            <textarea value={mensagem} onChange={(e) => setTexto(e.target.value)} rows={8} className="input text-sm" />
            <a
              href={linkWhatsApp(lojaSel?.whatsapp ?? "", mensagem)}
              target="_blank"
              className="btn btn-whatsapp w-full"
            >
              <MessageCircle className="size-4" /> Enviar pelo WhatsApp
            </a>
            {itens.length > 0 && <p className="text-xs text-muted">{itens.length} itens</p>}
          </>
        )}
      </div>
    </section>
  );
}
