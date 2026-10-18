"use client";

import { useActionState } from "react";
import { entrar } from "./actions";

export function FormLogin({ de }: { de: string }) {
  const [erro, acao, pendente] = useActionState(entrar, null);
  return (
    <form action={acao} className="card space-y-4 p-5">
      <input type="hidden" name="de" value={de} />
      <label className="block space-y-1.5">
        <span className="label">Senha</span>
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="input"
        />
      </label>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <button className="btn btn-primary w-full" disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
