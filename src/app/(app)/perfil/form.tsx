"use client";

import { useActionState } from "react";
import { Campo } from "@/components/ui";
import type { Perfil } from "@/db/schema";
import { salvarPerfil } from "./actions";

const CAMPOS: { nome: keyof Perfil; rotulo: string; dica?: string; tipo?: string }[] = [
  { nome: "nome", rotulo: "Seu nome" },
  { nome: "empresa", rotulo: "Nome da empresa / marca", dica: "Aparece em destaque no orçamento" },
  { nome: "telefone", rotulo: "WhatsApp", tipo: "tel", dica: "O cliente usa para aprovar o orçamento" },
  { nome: "email", rotulo: "E-mail", tipo: "email" },
  { nome: "cidade", rotulo: "Cidade / região de atendimento" },
  { nome: "documento", rotulo: "CPF ou CNPJ (MEI)" },
  { nome: "chavePix", rotulo: "Chave PIX" },
  { nome: "instagram", rotulo: "Instagram", dica: "Ex.: @joaoeletricista" },
  { nome: "registroProfissional", rotulo: "Registro profissional", dica: "Ex.: CFT/CRT 12345 · NR-10 válida até 03/2027" },
];

export function FormPerfil({ perfil }: { perfil?: Perfil }) {
  const [estado, acao, pendente] = useActionState(salvarPerfil, null);
  return (
    <form action={acao} className="card space-y-4 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        {CAMPOS.map((c) => (
          <Campo key={c.nome} rotulo={c.rotulo} dica={c.dica}>
            <input name={c.nome} type={c.tipo ?? "text"} defaultValue={String(perfil?.[c.nome] ?? "")} className="input" />
          </Campo>
        ))}
      </div>
      {estado === "ok" && <p className="text-sm text-ok">Perfil salvo.</p>}
      {estado && estado !== "ok" && <p className="text-sm text-danger">{estado}</p>}
      <button className="btn btn-primary w-full md:w-auto" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar perfil"}
      </button>
    </form>
  );
}
