"use client";

import { AlertTriangle, Boxes, Plus, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { MaisOpcoes } from "@/components/divulgacao";
import { Badge, Campo, Vazio } from "@/components/ui";
import type { Equipamento } from "@/db/schema";
import { dataCurta, reais } from "@/lib/formato";
import { CATEGORIAS_EQUIPAMENTO, STATUS_EQUIPAMENTO } from "@/lib/opcoes";
import { excluirEquipamento, salvarEquipamento } from "./actions";

function diasAte(d: string | null) {
  if (!d) return null;
  return Math.ceil((new Date(d + "T12:00:00").getTime() - Date.now()) / 86_400_000);
}

export function ListaEquipamentos({ itens }: { itens: Equipamento[] }) {
  const [editando, setEditando] = useState<Equipamento | "novo" | null>(null);
  const total = itens.reduce((s, i) => s + (i.valor ?? 0), 0);
  const vencendo = itens.filter((i) => {
    const d = diasAte(i.proximaVerificacao);
    return d !== null && d <= 30;
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {itens.length} {itens.length === 1 ? "item" : "itens"} · {reais(total)}
        </p>
        <button onClick={() => setEditando("novo")} className="btn btn-primary">
          <Plus className="size-4" /> Novo
        </button>
      </div>

      {vencendo.length > 0 && (
        <div className="mb-4 space-y-1 rounded-2xl bg-warn-soft p-3 text-sm text-warn">
          {vencendo.map((i) => {
            const d = diasAte(i.proximaVerificacao)!;
            return (
              <p key={i.id} className="flex items-center gap-2 truncate">
                <AlertTriangle className="size-4 shrink-0" /> {i.nome}: {d < 0 ? `venceu há ${-d} dias` : `vence em ${d} dias`}
              </p>
            );
          })}
        </div>
      )}

      {itens.length === 0 ? (
        <Vazio icone={Boxes} titulo="Nenhum equipamento" />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {itens.map((i) => {
            const st = STATUS_EQUIPAMENTO[i.status] ?? STATUS_EQUIPAMENTO.ok;
            return (
              <li key={i.id}>
                <button onClick={() => setEditando(i)} className="card w-full p-4 text-left transition hover:border-accent">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{i.nome}</p>
                      <p className="truncate text-sm text-muted">
                        {CATEGORIAS_EQUIPAMENTO[i.categoria as keyof typeof CATEGORIAS_EQUIPAMENTO]}
                        {(i.marca || i.modelo) && ` · ${[i.marca, i.modelo].filter(Boolean).join(" ")}`}
                      </p>
                    </div>
                    <Badge tom={st.tom}>{st.rotulo}</Badge>
                  </div>
                  {i.proximaVerificacao && (
                    <p className="mt-2 text-xs text-muted">Próxima verificação: {dataCurta(i.proximaVerificacao + "T12:00:00")}</p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editando && <FormEquipamento item={editando === "novo" ? undefined : editando} aoFechar={() => setEditando(null)} />}
    </>
  );
}

function FormEquipamento({ item, aoFechar }: { item?: Equipamento; aoFechar: () => void }) {
  const [erro, acao, pendente] = useActionState(salvarEquipamento, null);
  const [enviado, setEnviado] = useState(false);
  useEffect(() => {
    if (enviado && !pendente && erro === null) aoFechar();
  }, [enviado, pendente, erro, aoFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" onClick={aoFechar}>
      <div className="absolute inset-0 bg-black/50" />
      <form
        action={(f) => {
          setEnviado(true);
          acao(f);
        }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{item ? "Editar equipamento" : "Novo equipamento"}</h2>
          <button type="button" onClick={aoFechar} className="btn btn-ghost p-2" aria-label="Fechar"><X className="size-5" /></button>
        </div>
        {item && <input type="hidden" name="id" value={item.id} />}
        <Campo rotulo="Nome">
          <input name="nome" required defaultValue={item?.nome} placeholder="Ex.: Alicate amperímetro" className="input" />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Categoria">
            <select name="categoria" defaultValue={item?.categoria ?? "ferramenta"} className="input">
              {Object.entries(CATEGORIAS_EQUIPAMENTO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Situação">
            <select name="status" defaultValue={item?.status ?? "ok"} className="input">
              {Object.entries(STATUS_EQUIPAMENTO).map(([v, s]) => <option key={v} value={v}>{s.rotulo}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Calibração / validade" className="col-span-2"><input name="proximaVerificacao" type="date" defaultValue={item?.proximaVerificacao ?? ""} className="input" /></Campo>
        </div>
        <MaisOpcoes>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Marca"><input name="marca" defaultValue={item?.marca} className="input" /></Campo>
            <Campo rotulo="Modelo"><input name="modelo" defaultValue={item?.modelo} className="input" /></Campo>
            <Campo rotulo="Nº de série"><input name="numeroSerie" defaultValue={item?.numeroSerie} className="input" /></Campo>
            <Campo rotulo="Valor (R$)"><input name="valor" inputMode="decimal" defaultValue={item?.valor ?? ""} className="input" /></Campo>
            <Campo rotulo="Data de compra" className="col-span-2"><input name="dataCompra" type="date" defaultValue={item?.dataCompra ?? ""} className="input" /></Campo>
          </div>
          <Campo rotulo="Observações">
            <textarea name="observacoes" rows={2} defaultValue={item?.observacoes} className="input" />
          </Campo>
        </MaisOpcoes>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <div className="flex gap-2">
          {item && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                if (confirm("Excluir este equipamento?")) {
                  await excluirEquipamento(item.id);
                  aoFechar();
                }
              }}
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <button className="btn btn-primary flex-1" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </div>
  );
}
