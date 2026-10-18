"use client";

import { Download, Pencil, Play, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { carregarExemplo, excluirModelo, renomearModelo, usarModelo } from "@/app/(app)/quadros/actions";
import { Campo, Vazio } from "@/components/ui";
import type { ModeloQuadro, QuadroDados } from "@/lib/eletrica/tipos";
import { descreverModelo } from "@/lib/eletrica/caixas";
import { BookCopy } from "lucide-react";
import { Folha } from "./folha";
import { MiniaturaQuadro } from "./miniatura";
import { SeletorCaixa } from "./seletor-caixa";

type Modelo = { id: number; nome: string; descricao: string; dados: QuadroDados; atualizadoEm: string };

export function ListaModelos({
  modelos,
  exemplos,
  clientes,
}: {
  modelos: Modelo[];
  exemplos: { id: string; nome: string; descricao: string }[];
  clientes: { id: number; nome: string }[];
}) {
  const [usando, setUsando] = useState<Modelo | null>(null);
  const [editando, setEditando] = useState<Modelo | null>(null);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [outraCaixa, setOutraCaixa] = useState<ModeloQuadro | null>(null);

  return (
    <div className="space-y-6">
      {modelos.length === 0 ? (
        <Vazio
          icone={BookCopy}
          titulo="Nenhum modelo salvo"
          texto="No construtor, use o menu ⋮ → “Salvar como modelo”, ou carregue um dos exemplos prontos abaixo."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modelos.map((m) => (
            <li key={m.id} className="card overflow-hidden">
              <div className="bg-surface-2 p-3">
                <MiniaturaQuadro dados={m.dados} />
              </div>
              <div className="space-y-2 p-3.5">
                <div>
                  <p className="font-semibold">{m.nome}</p>
                  {m.descricao && <p className="text-sm text-muted">{m.descricao}</p>}
                  <p className="text-xs text-muted">
                    {m.dados.circuitos.length} circuito(s) · {m.dados.alimentacao.tipo} {m.dados.alimentacao.tensaoFN}/{m.dados.alimentacao.tensaoFF} V
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setUsando(m);
                      setOutraCaixa(null);
                    }}
                    className="btn btn-primary flex-1"
                  >
                    <Play className="size-4" /> Usar
                  </button>
                  <button onClick={() => setEditando(m)} className="btn btn-secondary p-2.5" aria-label="Renomear modelo">
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => confirm(`Excluir o modelo "${m.nome}"?`) && iniciar(() => excluirModelo(m.id))}
                    className="btn btn-danger p-2.5"
                    aria-label="Excluir modelo"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Exemplos prontos</h2>
        <p className="mb-3 text-sm text-muted">
          Montados pelo gerador do app e verificados pelo motor NBR 5410. Carregue para a sua lista de modelos e adapte.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {exemplos.map((e) => (
            <li key={e.id} className="card flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{e.nome}</p>
                <p className="text-xs text-muted">{e.descricao}</p>
              </div>
              <button disabled={pendente} onClick={() => iniciar(() => carregarExemplo(e.id))} className="btn btn-secondary shrink-0">
                <Download className="size-4" /> Carregar
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Folha titulo={`Usar modelo: ${usando?.nome ?? ""}`} aberta={Boolean(usando)} aoFechar={() => setUsando(null)}>
        {usando && (
          <form
            className="space-y-4"
            action={(f) => {
              setErro(null);
              iniciar(async () => {
                const r = await usarModelo(usando.id, String(f.get("nome") ?? ""), Number(f.get("clienteId")) || null, outraCaixa);
                if (r) setErro(r);
              });
            }}
          >
            <Campo rotulo="Nome do novo quadro">
              <input name="nome" defaultValue={usando.nome} className="input" autoFocus />
            </Campo>
            <Campo rotulo="Cliente (opcional)">
              <select name="clienteId" className="input" defaultValue="">
                <option value="">— sem cliente —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={Boolean(outraCaixa)}
                  onChange={(e) => setOutraCaixa(e.target.checked ? usando.dados.modelo : null)}
                />
                Usar outra caixa (atual: {descreverModelo(usando.dados.modelo)})
              </label>
              {outraCaixa && <SeletorCaixa valor={outraCaixa} aoMudar={setOutraCaixa} />}
            </div>
            {erro && <p className="text-sm text-danger">{erro}</p>}
            <button className="btn btn-primary w-full" disabled={pendente}>
              Criar quadro a partir do modelo
            </button>
          </form>
        )}
      </Folha>

      <Folha titulo="Renomear modelo" aberta={Boolean(editando)} aoFechar={() => setEditando(null)}>
        {editando && (
          <form
            className="space-y-4"
            action={(f) =>
              iniciar(async () => {
                await renomearModelo(editando.id, String(f.get("nome") ?? ""), String(f.get("descricao") ?? ""));
                setEditando(null);
              })
            }
          >
            <Campo rotulo="Nome">
              <input name="nome" defaultValue={editando.nome} required className="input" />
            </Campo>
            <Campo rotulo="Descrição curta">
              <input name="descricao" defaultValue={editando.descricao} className="input" />
            </Campo>
            <button className="btn btn-primary w-full" disabled={pendente}>
              Salvar
            </button>
          </form>
        )}
      </Folha>
    </div>
  );
}
