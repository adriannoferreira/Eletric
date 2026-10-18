"use client";

import { Lightbulb, Plug, Printer, ToggleLeft, Zap } from "lucide-react";
import { useMemo } from "react";
import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import {
  AVISO_ALTURAS,
  type AmbientePontos,
  listaDePontos,
  type Ponto,
  ROTULO_INTERRUPTOR,
  type TipoInterruptor,
} from "@/lib/eletrica/pontos";
import type { PontosConfig, QuadroDados } from "@/lib/eletrica/tipos";
import { Materiais } from "./lista-pontos-impressao";

const ICONE = { luz: Lightbulb, interruptor: ToggleLeft, tug: Plug, tue: Zap } as const;
const n = (v: number) => v.toLocaleString("pt-BR");

function config(d: QuadroDados): PontosConfig {
  return d.pontos ?? { ajustes: {}, feitos: [] };
}

export function PainelPontos({
  id,
  dados,
  analise,
  aoMudar,
  aoMarcar,
  botaoOrcamento,
}: {
  id: number;
  dados: QuadroDados;
  analise: AnaliseQuadro;
  aoMudar: (f: (q: QuadroDados) => QuadroDados) => void;
  aoMarcar: (feitos: string[]) => void;
  botaoOrcamento: React.ReactNode;
}) {
  const lista = useMemo(() => listaDePontos(dados, analise), [dados, analise]);
  const feitos = new Set(dados.pontos?.feitos ?? []);
  const totalChecklist = lista.ambientes.reduce((s, a) => s + a.checklist.length, 0);
  const feitosValidos = lista.ambientes.reduce((s, a) => s + a.checklist.filter((c) => feitos.has(c.id)).length, 0);

  function ajustar(chave: string, campo: Partial<PontosConfig["ajustes"][string]>) {
    aoMudar((q) => {
      const c = config(q);
      const atual = c.ajustes[chave] ?? { interruptor: null, interruptores: null, pontosLuz: null };
      return { ...q, pontos: { ...c, ajustes: { ...c.ajustes, [chave]: { ...atual, ...campo } } } };
    });
  }

  function marcar(itemId: string) {
    const novo = new Set(feitos);
    if (novo.has(itemId)) novo.delete(itemId);
    else novo.add(itemId);
    aoMarcar([...novo]);
  }

  if (lista.ambientes.length === 0) {
    return <p className="text-sm text-muted">Sem circuitos ainda. Crie circuitos ou gere o projeto da obra para ver os pontos.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Total r="Pontos de luz" v={lista.totais.pontosLuz} />
        <Total r="Interruptores" v={lista.totais.interruptores} />
        <Total r="Tomadas (TUG)" v={lista.totais.tug} />
        <Total r="Uso específico (TUE)" v={lista.totais.tue} />
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={`/quadros/${id}/imprimir?doc=pontos`} target="_blank" className="btn btn-secondary">
          <Printer className="size-4" /> Imprimir / PDF
        </a>
        {botaoOrcamento}
      </div>
      <p className="rounded-xl bg-info-soft p-3 text-xs text-info">
        {lista.origem === "projeto"
          ? "Quantidades mínimas pela NBR 5410 9.5.2, a partir dos ambientes do projeto da obra. "
          : "Quadro montado do zero: os pontos saem dos circuitos, agrupados pelo local de cada um. "}
        {AVISO_ALTURAS} Checklist: {feitosValidos}/{totalChecklist} itens feitos.
      </p>

      {lista.ambientes.map((a) => (
        <BlocoAmbiente
          key={a.chave}
          a={a}
          ajuste={dados.pontos?.ajustes[a.chave]}
          feitos={feitos}
          aoAjustar={(campo) => ajustar(a.chave, campo)}
          aoMarcar={marcar}
        />
      ))}

      <section className="card p-4">
        <h3 className="mb-2 font-semibold">Material total da obra (pontos)</h3>
        <Materiais itens={lista.materiais} />
        <p className="mt-2 text-xs text-muted">Eletroduto estimado: distância do ambiente ao quadro + 3 m por ponto. Cabos: ver a lista de materiais do quadro.</p>
      </section>
    </div>
  );
}

function BlocoAmbiente({
  a,
  ajuste,
  feitos,
  aoAjustar,
  aoMarcar,
}: {
  a: AmbientePontos;
  ajuste: PontosConfig["ajustes"][string] | undefined;
  feitos: Set<string>;
  aoAjustar: (campo: Partial<PontosConfig["ajustes"][string]>) => void;
  aoMarcar: (id: string) => void;
}) {
  const luz = a.pontos.find((p) => p.tipo === "luz");
  const inter = a.pontos.find((p) => p.tipo === "interruptor");
  return (
    <section className="card space-y-3 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">{a.nome}</h3>
        <span className="text-xs text-muted">
          {a.tipoNome}
          {a.areaM2 ? ` · ${n(a.areaM2)} m²` : ""}
          {a.perimetroM ? ` · ${n(a.perimetroM)} m de perímetro` : ""}
        </span>
      </header>

      <ul className="divide-y divide-border">
        {a.pontos.map((p) => (
          <LinhaPonto key={p.chave} p={p} />
        ))}
      </ul>

      {a.avisos.map((t, i) => (
        <p key={i} className="rounded-lg bg-warn-soft p-2 text-xs text-warn">
          {t}
        </p>
      ))}

      {(luz || inter) && (
        <div className="grid grid-cols-1 gap-2 rounded-xl bg-surface-2 p-3 text-sm sm:grid-cols-3">
          <label className="space-y-1">
            <span className="text-xs text-muted">Interruptor</span>
            <select
              value={ajuste?.interruptor ?? a.interruptor}
              onChange={(e) => aoAjustar({ interruptor: e.target.value as TipoInterruptor, interruptores: null })}
              className="input py-1.5"
            >
              {Object.entries(ROTULO_INTERRUPTOR).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Nº de interruptores</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={inter?.quantidade ?? 0}
              onChange={(e) => aoAjustar({ interruptores: Math.max(0, Number(e.target.value) || 0) })}
              className="input py-1.5"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Pontos de luz</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={luz?.quantidade ?? 0}
              onChange={(e) => aoAjustar({ pontosLuz: Math.max(0, Number(e.target.value) || 0) })}
              className="input py-1.5"
            />
          </label>
        </div>
      )}

      <details>
        <summary className="cursor-pointer text-sm font-semibold">Material do ambiente</summary>
        <div className="mt-2">
          <Materiais itens={a.materiais} />
        </div>
      </details>

      <div>
        <p className="mb-1 text-sm font-semibold">Checklist de execução</p>
        <ul className="space-y-1">
          {a.checklist.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="checkbox" checked={feitos.has(c.id)} onChange={() => aoMarcar(c.id)} className="mt-0.5 size-4 accent-[var(--accent)]" />
                <span className={feitos.has(c.id) ? "text-muted line-through" : ""}>{c.texto}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function LinhaPonto({ p }: { p: Ponto }) {
  const Icone = ICONE[p.tipo];
  return (
    <li className="flex gap-3 py-2">
      <Icone className="mt-0.5 size-4 shrink-0 text-accent" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">
          {p.quantidade}× {p.descricao}
          {p.potencia ? <span className="font-normal text-muted"> · {n(p.potencia)} {p.tipo === "tue" ? "W" : "VA"}{p.tipo !== "tue" && p.quantidade > 1 ? " cada" : ""}</span> : null}
          {p.tensaoV ? <span className="font-normal text-muted"> · {p.tensaoV} V</span> : null}
        </p>
        <p className="text-xs text-muted">
          Altura: {p.altura}
          {p.circuito ? ` · Circuito ${p.circuito.numero} (${p.circuito.disjuntor}${p.circuito.dr ? ", com DR" : ""})` : " · sem circuito vinculado"}
        </p>
        {p.nota && <p className="text-xs text-muted">{p.nota}</p>}
      </div>
    </li>
  );
}

function Total({ r, v }: { r: string; v: number }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-xs text-muted">{r}</p>
      <p className="text-xl font-bold">{n(v)}</p>
    </div>
  );
}
