"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Campo } from "@/components/ui";
import { criarOrcamento } from "../actions";

export function FormNovoOrcamento({
  clientes,
  clienteInicial,
}: {
  clientes: { id: number; nome: string }[];
  clienteInicial?: number;
}) {
  const [erro, acao, pendente] = useActionState(criarOrcamento, null);
  return (
    <form action={acao} className="card space-y-4 p-4 md:p-6">
      <Campo rotulo="Cliente">
        <div className="flex gap-2">
          <select name="clienteId" defaultValue={clienteInicial ?? ""} required className="input">
            <option value="" disabled>Escolha…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <Link href="/clientes/novo?voltar=orcamento" className="btn btn-secondary shrink-0" aria-label="Novo cliente">
            <UserPlus className="size-4" />
          </Link>
        </div>
      </Campo>
      <Campo rotulo="Título do serviço" dica="Ex.: Troca do quadro de distribuição e instalação de DR">
        <input name="titulo" required className="input" />
      </Campo>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <button className="btn btn-primary w-full md:w-auto" disabled={pendente}>
        {pendente ? "Criando…" : "Criar e adicionar itens"}
      </button>
    </form>
  );
}
