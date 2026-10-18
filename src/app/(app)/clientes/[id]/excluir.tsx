"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { excluirCliente } from "../actions";

export function ExcluirCliente({ id }: { id: number }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      className="btn btn-danger"
      disabled={pendente}
      onClick={() => {
        if (!confirm("Excluir este cliente?")) return;
        iniciar(async () => {
          const erro = await excluirCliente(id);
          if (erro) alert(erro);
        });
      }}
    >
      <Trash2 className="size-4" /> Excluir
    </button>
  );
}
