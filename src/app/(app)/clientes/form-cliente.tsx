"use client";

import { useActionState } from "react";
import { MaisOpcoes } from "@/components/divulgacao";
import { Campo } from "@/components/ui";
import type { Cliente } from "@/db/schema";
import { ORIGENS_CLIENTE, TIPOS_CLIENTE } from "@/lib/opcoes";
import { salvarCliente } from "./actions";

export function FormCliente({ cliente, voltar }: { cliente?: Cliente; voltar?: string }) {
  const [erro, acao, pendente] = useActionState(salvarCliente, null);
  return (
    <form action={acao} className="card space-y-4 p-4 md:p-6">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      {voltar && <input type="hidden" name="voltar" value={voltar} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Campo rotulo="Nome *" className="md:col-span-2">
          <input name="nome" required defaultValue={cliente?.nome} className="input" autoFocus={!cliente} />
        </Campo>
        <Campo rotulo="WhatsApp">
          <input name="telefone" type="tel" inputMode="tel" defaultValue={cliente?.telefone} placeholder="(91) 98888-7777" className="input" />
        </Campo>
        <Campo rotulo="Bairro">
          <input name="bairro" defaultValue={cliente?.bairro} className="input" />
        </Campo>
        <Campo rotulo="Endereço" className="md:col-span-2">
          <input name="endereco" defaultValue={cliente?.endereco} placeholder="Rua, número" className="input" />
        </Campo>
      </div>
      <MaisOpcoes>
        <div className="grid gap-4 md:grid-cols-2">
          <Campo rotulo="Cidade">
            <input name="cidade" defaultValue={cliente?.cidade} className="input" />
          </Campo>
          <Campo rotulo="Como chegou até você?">
            <select name="origem" defaultValue={cliente?.origem ?? "indicacao"} className="input">
              {Object.entries(ORIGENS_CLIENTE).map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Tipo">
            <select name="tipo" defaultValue={cliente?.tipo ?? "residencial"} className="input">
              {Object.entries(TIPOS_CLIENTE).map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="E-mail">
            <input name="email" type="email" defaultValue={cliente?.email} className="input" />
          </Campo>
          <Campo rotulo="CPF / CNPJ">
            <input name="documento" defaultValue={cliente?.documento} className="input" />
          </Campo>
          <Campo rotulo="Observações" className="md:col-span-2">
            <textarea name="observacoes" rows={3} defaultValue={cliente?.observacoes} placeholder="Ex.: padrão bifásico, casa antiga" className="input" />
          </Campo>
        </div>
      </MaisOpcoes>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <button className="btn btn-primary w-full md:w-auto" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar cliente"}
      </button>
    </form>
  );
}
