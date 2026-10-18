"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pencil, Plus, Replace, Trash2 } from "lucide-react";
import { Campo } from "@/components/ui";
import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import { modulosOcupados, peca } from "@/lib/eletrica/pecas";
import { type Componente, type Fase, fasesDisponiveis, type QuadroDados } from "@/lib/eletrica/tipos";
import { ListaAlertas } from "./alertas";
import { cabe, COR_FASE } from "./montagem";

export function EditorComponente({
  dados,
  analise,
  componente,
  aoMudar,
  aoMudarQuadro,
  aoEditarCircuito,
  aoNovoCircuito,
  aoTrocarPeca,
  aoRemover,
}: {
  dados: QuadroDados;
  analise: AnaliseQuadro;
  componente: Componente;
  aoMudar: (c: Componente) => void;
  aoMudarQuadro: (q: QuadroDados) => void;
  aoEditarCircuito: (id: string) => void;
  aoNovoCircuito: () => void;
  aoTrocarPeca: () => void;
  aoRemover: () => void;
}) {
  const p = peca(componente.pecaId);
  if (!p) return <p className="text-sm text-danger">Peça desconhecida no catálogo.</p>;
  const largura = modulosOcupados(p);
  const disponiveis = fasesDisponiveis(dados.alimentacao);
  const nFases = p.tipo === "dps" ? 1 : Math.min(p.polos, 3);
  const resultado = analise.circuitos.find((r) => r.circuito.id === componente.circuitoId);

  const mover = (df: number, dp: number) => {
    const f = componente.fileira + df;
    const pos = componente.posicao + dp;
    if (cabe(dados, f, pos, largura, componente.id)) aoMudar({ ...componente, fileira: f, posicao: pos });
  };
  const podeMover = (df: number, dp: number) =>
    cabe(dados, componente.fileira + df, componente.posicao + dp, largura, componente.id);

  const alternarFase = (f: Fase) => {
    let fases = componente.fases.includes(f) ? componente.fases.filter((x) => x !== f) : [...componente.fases, f];
    if (fases.length > nFases) fases = fases.slice(fases.length - nFases);
    aoMudar({ ...componente, fases: disponiveis.filter((x) => fases.includes(x)) });
  };

  const circuitosLivres = dados.circuitos.filter(
    (c) => c.id === componente.circuitoId || !dados.componentes.some((k) => k.circuitoId === c.id && k.id !== componente.id),
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="font-semibold">{p.nome}</p>
        <p className="text-sm text-muted">{p.descricao}</p>
        <p className="mt-1 text-xs text-muted">Norma: {p.norma} · {largura} módulo(s)</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Etiqueta (opcional)">
          <input
            className="input"
            value={componente.etiqueta}
            placeholder="Ex.: Chuveiro suíte"
            onChange={(e) => aoMudar({ ...componente, etiqueta: e.target.value })}
          />
        </Campo>
        <div className="space-y-1.5">
          <span className="label">Fases ligadas ({nFases})</span>
          <div className="flex gap-2">
            {disponiveis.map((f) => (
              <button
                key={f}
                onClick={() => alternarFase(f)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold ${
                  componente.fases.includes(f) ? "border-accent bg-accent-soft" : "border-border"
                }`}
              >
                <span className="size-3 rounded-full ring-1 ring-border" style={{ background: COR_FASE[f] }} /> {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {p.tipo !== "dps" && (
        <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-[var(--accent)]"
            checked={componente.geral}
            onChange={(e) =>
              aoMudar({ ...componente, geral: e.target.checked, circuitoId: e.target.checked ? null : componente.circuitoId })
            }
          />
          <span>
            <b>{p.tipo === "dr" ? "DR geral" : "Dispositivo geral"}</b> —{" "}
            {p.tipo === "dr" ? "protege todos os circuitos do quadro" : "secciona/protege o quadro inteiro"}
          </span>
        </label>
      )}

      {p.tipo === "disjuntor" && !componente.geral && (
        <div className="space-y-2">
          <Campo rotulo="Circuito protegido por este disjuntor">
            <select
              className="input"
              value={componente.circuitoId ?? ""}
              onChange={(e) => aoMudar({ ...componente, circuitoId: e.target.value || null })}
            >
              <option value="">— nenhum —</option>
              {circuitosLivres.map((c) => (
                <option key={c.id} value={c.id}>
                  {dados.circuitos.indexOf(c) + 1}. {c.nome}
                </option>
              ))}
            </select>
          </Campo>
          <div className="flex flex-wrap gap-2">
            {componente.circuitoId ? (
              <button className="btn btn-secondary" onClick={() => aoEditarCircuito(componente.circuitoId!)}>
                <Pencil className="size-4" /> Editar circuito
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={aoNovoCircuito}>
                <Plus className="size-4" /> Criar circuito para este disjuntor
              </button>
            )}
          </div>
          {resultado && <ListaAlertas alertas={resultado.alertas} vazio="Disjuntor e circuito conferem com a NBR 5410." />}
        </div>
      )}

      {p.tipo === "dr" && !componente.geral && (
        <div className="space-y-2">
          <span className="label">Circuitos protegidos por este DR</span>
          {dados.circuitos.length === 0 && <p className="text-sm text-muted">Crie circuitos primeiro.</p>}
          <div className="grid gap-1.5 sm:grid-cols-2">
            {dados.circuitos.map((c, i) => (
              <label key={c.id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={c.drId === componente.id}
                  onChange={(e) =>
                    aoMudarQuadro({
                      ...dados,
                      circuitos: dados.circuitos.map((x) =>
                        x.id === c.id ? { ...x, drId: e.target.checked ? componente.id : null } : x,
                      ),
                    })
                  }
                />
                {i + 1}. {c.nome}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <span className="label">Posição no trilho</span>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary p-2.5" disabled={!podeMover(0, -1)} onClick={() => mover(0, -1)} aria-label="Mover para a esquerda">
            <ArrowLeft className="size-4" />
          </button>
          <button className="btn btn-secondary p-2.5" disabled={!podeMover(0, 1)} onClick={() => mover(0, 1)} aria-label="Mover para a direita">
            <ArrowRight className="size-4" />
          </button>
          {dados.modelo.fileiras > 1 && (
            <>
              <button className="btn btn-secondary p-2.5" disabled={!podeMover(-1, 0)} onClick={() => mover(-1, 0)} aria-label="Fileira de cima">
                <ArrowUp className="size-4" />
              </button>
              <button className="btn btn-secondary p-2.5" disabled={!podeMover(1, 0)} onClick={() => mover(1, 0)} aria-label="Fileira de baixo">
                <ArrowDown className="size-4" />
              </button>
            </>
          )}
          <span className="self-center text-sm text-muted">
            Fileira {componente.fileira + 1}, módulo {componente.posicao + 1}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <button className="btn btn-secondary" onClick={aoTrocarPeca}>
          <Replace className="size-4" /> Trocar peça
        </button>
        <button className="btn btn-danger" onClick={aoRemover}>
          <Trash2 className="size-4" /> Remover do quadro
        </button>
      </div>
    </div>
  );
}
