"use client";

import { Campo } from "@/components/ui";
import { DESCRICAO_METODO, METODOS, SECOES } from "@/lib/eletrica/tabelas";
import { type Alimentacao, type Circuito, LIGACOES, LOCAIS, TIPOS_CIRCUITO } from "@/lib/eletrica/tipos";

/** Potências típicas para preencher rápido (W). Valores de referência — confira a placa do aparelho. */
export const PRESETS: { nome: string; c: Partial<Circuito> }[] = [
  { nome: "Iluminação", c: { tipo: "iluminacao", potenciaW: 400, quantidadePontos: 6, local: "varios" } },
  { nome: "Tomadas sala/quartos", c: { tipo: "tug", potenciaW: 1200, quantidadePontos: 8, local: "varios" } },
  { nome: "Tomadas cozinha", c: { tipo: "tug", potenciaW: 1800, quantidadePontos: 4, local: "cozinha" } },
  { nome: "Chuveiro 5500 W", c: { tipo: "tue", potenciaW: 5500, local: "banheiro", ligacao: "FF" } },
  { nome: "Chuveiro 7500 W", c: { tipo: "tue", potenciaW: 7500, local: "banheiro", ligacao: "FF" } },
  { nome: "Ar-cond. 12 000 BTU", c: { tipo: "tue", potenciaW: 1400, fatorPotencia: 0.9, ligacao: "FF", local: "quarto" } },
  { nome: "Micro-ondas", c: { tipo: "tue", potenciaW: 1500, local: "cozinha" } },
  { nome: "Máquina de lavar", c: { tipo: "tue", potenciaW: 1000, fatorPotencia: 0.85, local: "lavanderia" } },
  { nome: "Forno elétrico", c: { tipo: "tue", potenciaW: 3500, ligacao: "FF", local: "cozinha" } },
  { nome: "Torneira elétrica", c: { tipo: "tue", potenciaW: 3500, local: "cozinha" } },
];

export function FormCircuito({
  circuito,
  alimentacao,
  aoMudar,
}: {
  circuito: Circuito;
  alimentacao: Alimentacao;
  aoMudar: (c: Circuito) => void;
}) {
  const set = <K extends keyof Circuito>(k: K, v: Circuito[K]) => aoMudar({ ...circuito, [k]: v });
  const num = (v: string) => (v === "" ? 0 : Number(v.replace(",", ".")));
  const ligacoes = Object.entries(LIGACOES).filter(
    ([k]) =>
      k === "FN" ||
      (k === "FF" && alimentacao.tipo !== "monofasico") ||
      (k === "3F" && alimentacao.tipo === "trifasico"),
  );
  const tensao = circuito.ligacao === "FN" ? alimentacao.tensaoFN : alimentacao.tensaoFF;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Nome do circuito" className="sm:col-span-2">
          <input className="input" value={circuito.nome} onChange={(e) => set("nome", e.target.value)} />
        </Campo>
        <Campo rotulo="Tipo">
          <select className="input" value={circuito.tipo} onChange={(e) => set("tipo", e.target.value as Circuito["tipo"])}>
            {Object.entries(TIPOS_CIRCUITO).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Local / ambiente" dica="Define a exigência de DR (5.1.3.2.2)">
          <select className="input" value={circuito.local} onChange={(e) => set("local", e.target.value as Circuito["local"])}>
            {Object.entries(LOCAIS).map(([v, l]) => (
              <option key={v} value={v}>{l.nome}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Potência total (W)">
          <input className="input" inputMode="decimal" value={circuito.potenciaW || ""} onChange={(e) => set("potenciaW", num(e.target.value))} />
        </Campo>
        <Campo rotulo="Fator de potência" dica="Resistivo (chuveiro, lâmpada) = 1; motor ≈ 0,8–0,9">
          <input className="input" inputMode="decimal" value={circuito.fatorPotencia} onChange={(e) => set("fatorPotencia", Math.min(1, Math.max(0.1, num(e.target.value) || 1)))} />
        </Campo>
        <Campo rotulo={`Ligação (${tensao} V)`}>
          <select className="input" value={circuito.ligacao} onChange={(e) => set("ligacao", e.target.value as Circuito["ligacao"])}>
            {ligacoes.map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Comprimento até o ponto mais distante (m)">
          <input className="input" inputMode="decimal" value={circuito.comprimentoM || ""} onChange={(e) => set("comprimentoM", num(e.target.value))} />
        </Campo>
        <Campo rotulo="Nº de pontos" dica="Tomadas ou luminárias do circuito">
          <input className="input" inputMode="numeric" value={circuito.quantidadePontos} onChange={(e) => set("quantidadePontos", Math.max(1, Math.round(num(e.target.value)) || 1))} />
        </Campo>
        <Campo rotulo="Método de instalação" className="sm:col-span-2">
          <select className="input" value={circuito.metodo} onChange={(e) => set("metodo", e.target.value as Circuito["metodo"])}>
            {METODOS.map((m) => (
              <option key={m} value={m}>{DESCRICAO_METODO[m]}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Circuitos no mesmo eletroduto" dica="Inclui este (Tabela 42)">
          <input className="input" inputMode="numeric" value={circuito.circuitosAgrupados} onChange={(e) => set("circuitosAgrupados", Math.max(1, Math.round(num(e.target.value)) || 1))} />
        </Campo>
        <Campo rotulo="Temperatura ambiente (°C)" dica="Padrão 30 °C (20 °C no solo)">
          <input className="input" inputMode="decimal" value={circuito.temperaturaC} onChange={(e) => set("temperaturaC", num(e.target.value))} />
        </Campo>
        <Campo rotulo="Seção do cabo" dica="Automática = a calculada pelo app">
          <select
            className="input"
            value={circuito.secaoAdotada ?? ""}
            onChange={(e) => set("secaoAdotada", e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Automática</option>
            {SECOES.map((s) => (
              <option key={s} value={s}>{s.toLocaleString("pt-BR")} mm²</option>
            ))}
          </select>
        </Campo>
        <label className="flex items-center gap-3 self-end rounded-xl border border-border p-3 text-sm">
          <input
            type="checkbox"
            className="size-5 accent-[var(--accent)]"
            checked={circuito.alimentaExterno}
            onChange={(e) => set("alimentaExterno", e.target.checked)}
          />
          Tomada pode alimentar equipamento na área externa
        </label>
      </div>
    </div>
  );
}
