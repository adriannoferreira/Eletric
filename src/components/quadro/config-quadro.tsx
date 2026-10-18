"use client";

import { Campo } from "@/components/ui";
import { descreverModelo, trocarCaixa } from "@/lib/eletrica/caixas";
import { larguraPeca, modulosOcupados, peca } from "@/lib/eletrica/pecas";
import type { ModeloQuadro, QuadroDados } from "@/lib/eletrica/tipos";
import { SeletorCaixa } from "./seletor-caixa";

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
  const usados = dados.componentes.reduce((s, c) => s + (peca(c.pecaId) ? modulosOcupados(peca(c.pecaId)!) : 0), 0);
  const ocupadosFixos = dados.componentes
    .filter((c) => !c.circuitoId)
    .reduce((s, c) => s + (peca(c.pecaId) ? modulosOcupados(peca(c.pecaId)!) : 0), 0);

  /** Troca a caixa reposicionando as peças; avisa (e pede confirmação) se alguma não couber. */
  const mudarCaixa = (novo: ModeloQuadro) => {
    const r = trocarCaixa(dados.componentes, novo, larguraPeca);
    if (r.naoCouberam.length) {
      const nomes = r.naoCouberam.map((c) => peca(c.pecaId)?.nome ?? c.pecaId).slice(0, 6).join(", ");
      if (!confirm(`${r.naoCouberam.length} peça(s) não cabem na nova caixa e serão retiradas: ${nomes}. Continuar?`)) return;
    } else if (r.movidas > 0 && !confirm(`${r.movidas} peça(s) vão mudar de lugar para caber na nova caixa. Continuar?`)) return;
    const removidas = new Set(r.naoCouberam.map((c) => c.id));
    aoMudar({
      ...dados,
      modelo: novo,
      componentes: r.componentes,
      circuitos: dados.circuitos.map((c) => (c.drId && removidas.has(c.drId) ? { ...c, drId: null } : c)),
    });
  };

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
        <span className="label">Caixa do quadro</span>
        <p className="text-sm">
          Atual: <b>{descreverModelo(m)}</b>
        </p>
        <SeletorCaixa valor={m} aoMudar={mudarCaixa} ocupados={ocupadosFixos} minimo={usados} />
      </div>
    </div>
  );
}
