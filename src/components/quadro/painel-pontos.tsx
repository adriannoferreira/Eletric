"use client";

import { ChevronDown, Lightbulb, Plug, Printer, ToggleLeft, TriangleAlert, Zap } from "lucide-react";
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
import { MenuMais, SeloConferir, SeloRef } from "./mini";

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
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        <Total r="Luz" v={lista.totais.pontosLuz} />
        <Total r="Interr." v={lista.totais.interruptores} />
        <Total r="TUG" v={lista.totais.tug} />
        <Total r="TUE" v={lista.totais.tue} />
      </div>
      <div className="flex items-center gap-2">
        {botaoOrcamento}
        <MenuMais>
          <a href={`/quadros/${id}/imprimir?doc=pontos`} target="_blank" className="btn btn-ghost">
            <Printer className="size-4" /> Imprimir / PDF
          </a>
        </MenuMais>
      </div>
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        Feito {feitosValidos}/{totalChecklist}
        {lista.origem === "projeto" && <SeloRef titulo="Quantidades mínimas de iluminação e tomadas por ambiente">NBR 5410 9.5.2</SeloRef>}
        <SeloRef titulo={AVISO_ALTURAS}>Alturas: prática usual</SeloRef>
      </p>

      <div className="space-y-2">
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
      </div>

      <details className="card p-4">
        <summary className="cursor-pointer font-semibold">Material total</summary>
        <div className="mt-2">
          <Materiais itens={lista.materiais} />
          <p className="mt-2 text-xs text-muted">Eletroduto: distância ao quadro + 3 m/ponto (estimado).</p>
        </div>
      </details>
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
  const soma = (t: Ponto["tipo"]) => a.pontos.filter((p) => p.tipo === t).reduce((s, p) => s + p.quantidade, 0);
  const resumo = [
    [soma("luz"), "luz"],
    [soma("interruptor"), "int."],
    [soma("tug"), "TUG"],
    [soma("tue"), "TUE"],
  ]
    .filter(([q]) => (q as number) > 0)
    .map(([q, r]) => `${q} ${r}`)
    .join(" · ");
  const feitosAqui = a.checklist.filter((c) => feitos.has(c.id)).length;
  const completo = a.checklist.length > 0 && feitosAqui === a.checklist.length;
  return (
    <details className="card group">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className={`font-semibold ${completo ? "text-muted line-through" : ""}`}>
            {a.nome} {a.avisos.length > 0 && <TriangleAlert className="inline size-3.5 text-warn" />}
          </p>
          <p className="text-xs text-muted">{resumo || "sem pontos"}</p>
        </div>
        <span className={`text-xs ${completo ? "text-ok" : "text-muted"}`}>
          {feitosAqui}/{a.checklist.length}
        </span>
        <ChevronDown className="size-4 text-muted transition group-open:rotate-180" />
      </summary>

      <div className="space-y-3 border-t border-border p-3">
        <ul className="divide-y divide-border">
          {a.pontos.map((p) => (
            <LinhaPonto key={p.chave} p={p} />
          ))}
        </ul>

        <SeloConferir itens={a.avisos} />

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

        {(luz || inter) && (
          <details>
            <summary className="cursor-pointer text-sm text-muted">Ajustar luz e interruptores</summary>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
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
                <span className="text-xs text-muted">Interruptores</span>
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
          </details>
        )}

        <details>
          <summary className="cursor-pointer text-sm text-muted">Material do ambiente</summary>
          <div className="mt-2">
            <Materiais itens={a.materiais} />
          </div>
        </details>
      </div>
    </details>
  );
}

function LinhaPonto({ p }: { p: Ponto }) {
  const Icone = ICONE[p.tipo];
  return (
    <li>
      <details>
        <summary className="flex cursor-pointer list-none items-center gap-2 py-2 text-sm">
          <Icone className="size-4 shrink-0 text-accent" />
          <span className="min-w-0 flex-1 font-medium">
            {p.quantidade}× {p.descricao}
          </span>
          <span className="shrink-0 text-xs text-muted">{p.circuito ? `C${p.circuito.numero}` : "—"}</span>
        </summary>
        <div className="space-y-0.5 pb-2 pl-6 text-xs text-muted">
          {p.potencia ? (
            <p>
              {n(p.potencia)} {p.tipo === "tue" ? "W" : "VA"}
              {p.tipo !== "tue" && p.quantidade > 1 ? " cada" : ""}
              {p.tensaoV ? ` · ${p.tensaoV} V` : ""}
            </p>
          ) : null}
          <p>Altura: {p.altura}</p>
          <p>{p.circuito ? `Circuito ${p.circuito.numero} · ${p.circuito.disjuntor}${p.circuito.dr ? " · DR" : ""}` : "Sem circuito vinculado"}</p>
          {p.nota && <p>{p.nota}</p>}
        </div>
      </details>
    </li>
  );
}

function Total({ r, v }: { r: string; v: number }) {
  return (
    <div className="rounded-xl bg-surface-2 p-2 text-center">
      <p className="text-lg font-bold">{n(v)}</p>
      <p className="text-xs text-muted">{r}</p>
    </div>
  );
}
