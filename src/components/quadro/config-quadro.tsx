"use client";

import { Campo } from "@/components/ui";
import { MODELOS_QUADRO, modulosOcupados, peca } from "@/lib/eletrica/pecas";
import type { QuadroDados } from "@/lib/eletrica/tipos";

export function ConfigQuadro({
  dados,
  aoMudar,
  clientes,
  clienteId,
  aoMudarCliente,
}: {
  dados: QuadroDados;
  aoMudar: (q: QuadroDados) => void;
  clientes: { id: number; nome: string }[];
  clienteId: number | null;
  aoMudarCliente: (id: number | null) => void;
}) {
  const a = dados.alimentacao;
  const m = dados.modelo;
  const setA = (p: Partial<QuadroDados["alimentacao"]>) => aoMudar({ ...dados, alimentacao: { ...a, ...p } });
  const cabeNaCaixa = (c: QuadroDados["componentes"][number], fileiras: number, mods: number) => {
    const p = peca(c.pecaId);
    return c.fileira < fileiras && c.posicao + (p ? modulosOcupados(p) : 1) <= mods;
  };
  const foraDoQuadro = (fileiras: number, mods: number) =>
    dados.componentes.filter((c) => !cabeNaCaixa(c, fileiras, mods)).length;

  return (
    <div className="space-y-4">
      <Campo rotulo="Cliente">
        <select className="input" value={clienteId ?? ""} onChange={(e) => aoMudarCliente(e.target.value ? Number(e.target.value) : null)}>
          <option value="">— Sem cliente —</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Fornecimento">
          <select className="input" value={a.tipo} onChange={(e) => setA({ tipo: e.target.value as typeof a.tipo })}>
            <option value="monofasico">Monofásico</option>
            <option value="bifasico">Bifásico</option>
            <option value="trifasico">Trifásico</option>
          </select>
        </Campo>
        <Campo rotulo="Esquema de aterramento">
          <select className="input" value={a.esquema} onChange={(e) => setA({ esquema: e.target.value as typeof a.esquema })}>
            <option value="TN-S">TN-S</option>
            <option value="TN-C-S">TN-C-S</option>
            <option value="TT">TT</option>
          </select>
        </Campo>
        <Campo rotulo="Tensão fase-neutro (V)">
          <select className="input" value={a.tensaoFN} onChange={(e) => setA({ tensaoFN: Number(e.target.value) })}>
            {[127, 220, 230].map((v) => <option key={v} value={v}>{v} V</option>)}
          </select>
        </Campo>
        <Campo rotulo="Tensão fase-fase (V)">
          <select className="input" value={a.tensaoFF} onChange={(e) => setA({ tensaoFF: Number(e.target.value) })}>
            {[127, 220, 380, 400].map((v) => <option key={v} value={v}>{v} V</option>)}
          </select>
        </Campo>
      </div>
      <div className="space-y-1.5">
        <span className="label">Tamanho da caixa</span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {MODELOS_QUADRO.map((mod) => {
            const atual = mod.fileiras === m.fileiras && mod.modulosPorFileira === m.modulosPorFileira;
            const perde = foraDoQuadro(mod.fileiras, mod.modulosPorFileira);
            return (
              <button
                key={mod.id}
                onClick={() => {
                  if (perde && !confirm(`${perde} peça(s) ficariam fora do quadro e serão removidas. Continuar?`)) return;
                  aoMudar({
                    ...dados,
                    modelo: { ...m, fileiras: mod.fileiras, modulosPorFileira: mod.modulosPorFileira },
                    componentes: dados.componentes.filter((c) => cabeNaCaixa(c, mod.fileiras, mod.modulosPorFileira)),
                  });
                }}
                className={`rounded-xl border p-2.5 text-center ${atual ? "border-accent bg-accent-soft" : "border-border"}`}
              >
                <span className="block font-bold">{mod.fileiras * mod.modulosPorFileira}</span>
                <span className="text-xs text-muted">{mod.fileiras} × {mod.modulosPorFileira}</span>
              </button>
            );
          })}
        </div>
      </div>
      <Campo rotulo="Instalação">
        <select className="input" value={m.instalacao} onChange={(e) => aoMudar({ ...dados, modelo: { ...m, instalacao: e.target.value as typeof m.instalacao } })}>
          <option value="embutir">De embutir</option>
          <option value="sobrepor">De sobrepor</option>
        </select>
      </Campo>
    </div>
  );
}
