"use client";

import { useActionState, useState } from "react";
import { Campo } from "@/components/ui";
import { MODELOS_QUADRO } from "@/lib/eletrica/pecas";
import { criarQuadro } from "../actions";

const TENSOES = {
  "127/220": "127 V (F-N) / 220 V (F-F)",
  "220/380": "220 V (F-N) / 380 V (F-F)",
  "220/220": "220 V (F-N) — monofásico 220",
};

export function FormNovoQuadro({
  clientes,
  clienteInicial,
}: {
  clientes: { id: number; nome: string }[];
  clienteInicial: string;
}) {
  const [erro, acao, pendente] = useActionState(criarQuadro, null);
  const [tipo, setTipo] = useState("bifasico");

  return (
    <form action={acao} className="card space-y-5 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Campo rotulo="Nome do quadro *">
          <input name="nome" required className="input" placeholder="Ex.: QDC Casa do João" autoFocus />
        </Campo>
        <Campo rotulo="Cliente (opcional)">
          <select name="clienteId" defaultValue={clienteInicial} className="input">
            <option value="">— Sem cliente —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </Campo>
      </div>

      <fieldset className="space-y-2">
        <legend className="label mb-1.5">Fornecimento</legend>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["monofasico", "Monofásico", "1 fase + neutro"],
            ["bifasico", "Bifásico", "2 fases + neutro"],
            ["trifasico", "Trifásico", "3 fases + neutro"],
          ].map(([v, r, d]) => (
            <label
              key={v}
              className={`cursor-pointer rounded-xl border p-3 text-center transition ${
                tipo === v ? "border-accent bg-accent-soft" : "border-border"
              }`}
            >
              <input type="radio" name="tipo" value={v} checked={tipo === v} onChange={() => setTipo(v)} className="sr-only" />
              <span className="block text-sm font-semibold">{r}</span>
              <span className="block text-xs text-muted">{d}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-3">
        <Campo rotulo="Tensões da rede" dica="Confira com a concessionária da cidade">
          <select name="tensoes" defaultValue="127/220" className="input">
            {Object.entries(TENSOES).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Esquema de aterramento" dica="Residencial típico: TN-C-S ou TN-S">
          <select name="esquema" defaultValue="TN-S" className="input">
            <option value="TN-S">TN-S (neutro e terra separados)</option>
            <option value="TN-C-S">TN-C-S (separa no quadro de entrada)</option>
            <option value="TT">TT (terra local, neutro da rede)</option>
          </select>
        </Campo>
        <Campo rotulo="Instalação da caixa">
          <select name="instalacao" defaultValue="embutir" className="input">
            <option value="embutir">De embutir</option>
            <option value="sobrepor">De sobrepor</option>
          </select>
        </Campo>
      </div>

      <fieldset>
        <legend className="label mb-1.5">Tamanho do quadro (módulos DIN)</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MODELOS_QUADRO.map((m) => (
            <label key={m.id} className="cursor-pointer">
              <input type="radio" name="modelo" value={m.id} defaultChecked={m.id === "24"} className="peer sr-only" />
              <span className="block rounded-xl border border-border p-3 text-center transition peer-checked:border-accent peer-checked:bg-accent-soft">
                <span className="block text-lg font-bold">{m.fileiras * m.modulosPorFileira}</span>
                <span className="block text-xs text-muted">
                  {m.fileiras} × {m.modulosPorFileira}
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Dá para trocar depois. Dimensões reais variam por fabricante.</p>
      </fieldset>

      {erro && <p className="text-sm text-danger">{erro}</p>}
      <button className="btn btn-primary w-full md:w-auto" disabled={pendente}>
        {pendente ? "Criando…" : "Criar e montar o quadro"}
      </button>
    </form>
  );
}
