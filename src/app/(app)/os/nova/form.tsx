"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { MaisOpcoes } from "@/components/divulgacao";
import { Campo } from "@/components/ui";
import { criarOS } from "../actions";

type GuiaResumo = { chave: string; nome: string; categoria: string; horas: number };

export function FormNovaOS({
  clientes,
  guias,
  inicial,
}: {
  clientes: { id: number; nome: string }[];
  guias: GuiaResumo[];
  inicial: { clienteId?: number; inicio: string; guia?: string; titulo?: string; descricao?: string; quadroId?: number };
}) {
  const [erro, acao, pendente] = useActionState(criarOS, null);
  const [guia, setGuia] = useState(inicial.guia ?? "");
  const [titulo, setTitulo] = useState(inicial.titulo ?? "");
  const [categoria, setCategoria] = useState(guias.find((g) => g.chave === inicial.guia)?.categoria ?? "Geral");
  const [duracao, setDuracao] = useState(
    String(Math.round((guias.find((g) => g.chave === inicial.guia)?.horas ?? 2) * 60)),
  );
  const [agendar, setAgendar] = useState(true);
  const categorias = [...new Set(guias.map((g) => g.categoria))];

  return (
    <form action={acao} className="card space-y-4 p-4 md:p-6">
      {inicial.quadroId && <input type="hidden" name="quadroId" value={inicial.quadroId} />}
      <input type="hidden" name="guia" value={guia} />
      <input type="hidden" name="categoria" value={categoria} />
      <div className="grid gap-4 md:grid-cols-2">
        <Campo rotulo="Cliente *" className="md:col-span-2">
          <div className="flex gap-2">
            <select name="clienteId" defaultValue={inicial.clienteId ?? ""} required className="input">
              <option value="" disabled>Escolha…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <Link href="/clientes/novo" className="btn btn-secondary shrink-0" aria-label="Novo cliente">
              <UserPlus className="size-4" />
            </Link>
          </div>
        </Campo>
        {guias.length > 0 && (
          <Campo rotulo="Tipo de serviço" className="md:col-span-2">
            <select
              value={guia}
              onChange={(e) => {
                const g = guias.find((x) => x.chave === e.target.value);
                setGuia(e.target.value);
                if (g) {
                  if (!titulo) setTitulo(g.nome);
                  setCategoria(g.categoria);
                  setDuracao(String(Math.round(g.horas * 60)));
                }
              }}
              className="input"
            >
              <option value="">Outro / personalizado</option>
              {categorias.map((c) => (
                <optgroup key={c} label={c}>
                  {guias.filter((g) => g.categoria === c).map((g) => (
                    <option key={g.chave} value={g.chave}>{g.nome}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Campo>
        )}
        <Campo rotulo="Título do serviço *" className="md:col-span-2">
          <input name="titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Troca do chuveiro" className="input" />
        </Campo>
        <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
          <input type="checkbox" checked={agendar} onChange={(e) => setAgendar(e.target.checked)} className="size-4 accent-[var(--accent)]" />
          Já agendar a visita
        </label>
        {agendar && (
          <>
            <Campo rotulo="Data e hora">
              <input name="inicio" type="datetime-local" defaultValue={inicial.inicio} required className="input" />
            </Campo>
            <Campo rotulo="Duração prevista (min)">
              <input name="duracaoMin" type="number" min={15} step={15} value={duracao} onChange={(e) => setDuracao(e.target.value)} className="input" />
            </Campo>
          </>
        )}
        <div className="md:col-span-2">
          <MaisOpcoes>
            <Campo rotulo="Endereço do serviço">
              <input name="endereco" placeholder="Em branco = endereço do cliente" className="input" />
            </Campo>
            <Campo rotulo="Descrição / combinado">
              <textarea name="descricao" rows={3} defaultValue={inicial.descricao} className="input" />
            </Campo>
          </MaisOpcoes>
        </div>
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <button className="btn btn-primary w-full md:w-auto" disabled={pendente}>
        {pendente ? "Criando…" : "Criar ordem de serviço"}
      </button>
    </form>
  );
}
