"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useActionState, useOptimistic, useTransition } from "react";
import { adicionarTarefa, alternarTarefa, excluirTarefa } from "@/app/(app)/vendas/actions";
import { Ajuda } from "@/components/divulgacao";

export type Tarefa = {
  id: number;
  titulo: string;
  descricao: string;
  concluida: boolean;
  propria: boolean;
};

export function ListaTarefas({ tarefas }: { tarefas: Tarefa[] }) {
  const [lista, alterarOtimista] = useOptimistic(tarefas, (atual, mudanca: { id: number; concluida: boolean }) =>
    atual.map((t) => (t.id === mudanca.id ? { ...t, concluida: mudanca.concluida } : t)),
  );
  const [, iniciar] = useTransition();

  return (
    <ul className="divide-y divide-border">
      {lista.map((t) => (
        <li key={t.id} className="group flex items-start gap-3 px-4 py-3">
          <button
            onClick={() =>
              iniciar(async () => {
                alterarOtimista({ id: t.id, concluida: !t.concluida });
                await alternarTarefa(t.id, !t.concluida);
              })
            }
            className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border-2 transition ${
              t.concluida ? "border-ok bg-ok text-white" : "border-border hover:border-accent"
            }`}
            aria-label={t.concluida ? "Desmarcar" : "Marcar como feita"}
          >
            {t.concluida && <Check className="size-4" strokeWidth={3} />}
          </button>
          <div className="min-w-0 flex-1">
            <p className={`font-medium ${t.concluida ? "text-muted line-through" : ""}`}>{t.titulo}</p>
          </div>
          {t.descricao && (
            <Ajuda titulo={t.titulo} alinhar="direita">
              <p>{t.descricao}</p>
            </Ajuda>
          )}
          {t.propria && (
            <button
              onClick={() => {
                if (confirm("Excluir esta tarefa?")) iniciar(() => excluirTarefa(t.id));
              }}
              className="btn btn-ghost p-1.5 text-muted opacity-60 hover:text-danger group-hover:opacity-100"
              aria-label="Excluir tarefa"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function NovaTarefa() {
  const [erro, acao, pendente] = useActionState(async (prev: string | null, form: FormData) => {
    const r = await adicionarTarefa(prev, form);
    if (!r) (document.getElementById("form-nova-tarefa") as HTMLFormElement | null)?.reset();
    return r;
  }, null);
  return (
    <details className="group card">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <Plus className="size-4" /> Tarefa própria
      </summary>
    <form id="form-nova-tarefa" action={acao} className="space-y-3 px-4 pb-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input name="titulo" required placeholder="Ex.: Visitar a imobiliária" className="input flex-1" />
        <select name="fase" defaultValue="30" className="input sm:w-40">
          <option value="30">30 dias</option>
          <option value="60">60 dias</option>
          <option value="90">90 dias</option>
        </select>
      </div>
      <input name="descricao" placeholder="Detalhes (opcional)" className="input" />
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <button className="btn btn-primary" disabled={pendente}>
        <Plus className="size-4" /> Adicionar
      </button>
    </form>
    </details>
  );
}
