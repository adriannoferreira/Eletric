"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { Campo } from "@/components/ui";
import type { ItemCatalogo } from "@/db/schema";
import { reais } from "@/lib/formato";
import { excluirItem, salvarItem } from "./actions";

export function EditorCatalogo({ itens }: { itens: ItemCatalogo[] }) {
  const [editando, setEditando] = useState<ItemCatalogo | "novo" | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "servico" | "material">("todos");

  const visiveis = itens.filter((i) => filtro === "todos" || i.tipo === filtro);
  const porCategoria = new Map<string, ItemCatalogo[]>();
  for (const i of visiveis) porCategoria.set(i.categoria, [...(porCategoria.get(i.categoria) ?? []), i]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
          {(["todos", "servico", "material"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filtro === f ? "bg-surface shadow-sm" : "text-muted"}`}
            >
              {f === "todos" ? "Todos" : f === "servico" ? "Serviços" : "Materiais"}
            </button>
          ))}
        </div>
        <button onClick={() => setEditando("novo")} className="btn btn-primary">
          <Plus className="size-4" /> Novo item
        </button>
      </div>

      <div className="space-y-4">
        {[...porCategoria].map(([cat, lista]) => (
          <section key={cat}>
            <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted">{cat}</h2>
            <ul className="card divide-y divide-border">
              {lista.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.nome}</p>
                    <p className="text-xs text-muted">{i.tipo === "servico" ? "Serviço" : "Material"} · por {i.unidade}</p>
                  </div>
                  <span className="shrink-0 font-semibold">{reais(i.preco)}</span>
                  <button onClick={() => setEditando(i)} className="btn btn-ghost p-2 text-muted" aria-label="Editar">
                    <Pencil className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {editando && (
        <FormItem item={editando === "novo" ? undefined : editando} aoFechar={() => setEditando(null)} />
      )}
    </>
  );
}

function FormItem({ item, aoFechar }: { item?: ItemCatalogo; aoFechar: () => void }) {
  const [estado, acao, pendente] = useActionState(salvarItem, null);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (enviado && !pendente && estado === null) aoFechar();
  }, [enviado, pendente, estado, aoFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" onClick={aoFechar}>
      <div className="absolute inset-0 bg-black/50" />
      <form
        action={(f) => {
          setEnviado(true);
          acao(f);
        }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg space-y-4 rounded-t-3xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{item ? "Editar item" : "Novo item"}</h2>
          <button type="button" onClick={aoFechar} className="btn btn-ghost p-2" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        {item && <input type="hidden" name="id" value={item.id} />}
        <Campo rotulo="Nome">
          <input name="nome" required defaultValue={item?.nome} className="input" autoFocus />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Tipo">
            <select name="tipo" defaultValue={item?.tipo ?? "servico"} className="input">
              <option value="servico">Serviço</option>
              <option value="material">Material</option>
            </select>
          </Campo>
          <Campo rotulo="Categoria">
            <input name="categoria" defaultValue={item?.categoria ?? ""} placeholder="Ex.: Iluminação" className="input" />
          </Campo>
          <Campo rotulo="Preço (R$)">
            <input name="preco" inputMode="decimal" required defaultValue={item?.preco ?? ""} className="input" />
          </Campo>
          <Campo rotulo="Unidade">
            <input name="unidade" defaultValue={item?.unidade ?? "un"} placeholder="un, m, ponto…" className="input" />
          </Campo>
        </div>
        {estado && <p className="text-sm text-danger">{estado}</p>}
        <div className="flex gap-2">
          {item && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                if (confirm("Excluir este item?")) {
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
    </div>
  );
}
