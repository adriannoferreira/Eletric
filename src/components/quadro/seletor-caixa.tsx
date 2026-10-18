"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Campo } from "@/components/ui";
import {
  type Caixa,
  cabeComReserva,
  caixaDoModelo,
  capacidadeTotal,
  DESCRICAO_IP,
  filtrarCaixas,
  type GrauIP,
  type Instalacao,
  LIMITES_PERSONALIZADO,
  type MaterialCaixa,
  modeloDaCaixa,
  NOME_INSTALACAO,
  NOME_MATERIAL,
  type PadraoCaixa,
} from "@/lib/eletrica/caixas";
import type { ModeloQuadro } from "@/lib/eletrica/tipos";

/** Desenho pequeno da caixa: trilhos DIN ou colunas NEMA + trilho auxiliar. */
export function MiniCaixa({ m, className = "h-16" }: { m: Pick<ModeloQuadro, "fileiras" | "modulosPorFileira" | "padrao" | "trilhoAux" | "material">; className?: string }) {
  const metal = m.material === "metalico";
  if (m.padrao === "NEMA") {
    const aux = m.trilhoAux > 0 ? 1 : 0;
    const linhas = m.modulosPorFileira;
    const H = 12 + aux * 10 + linhas * 5;
    return (
      <svg viewBox={`0 0 60 ${H}`} className={className} aria-hidden>
        <rect x="1" y="1" width="58" height={H - 2} rx="4" fill={metal ? "#6b7280" : "#e5e7eb"} stroke="#374151" />
        <rect x="5" y="5" width="50" height={H - 10} rx="2" fill="#f3f4f6" />
        {aux > 0 && <rect x="9" y="8" width="42" height="5" rx="1" fill="#9ca3af" />}
        <rect x="28" y={8 + aux * 10} width="4" height={linhas * 5} fill="#b45309" />
        {Array.from({ length: linhas }).map((_, i) => (
          <g key={i}>
            <rect x="10" y={9 + aux * 10 + i * 5} width="17" height="3.5" rx="0.6" fill="#1f2937" />
            {m.fileiras > 1 && <rect x="33" y={9 + aux * 10 + i * 5} width="17" height="3.5" rx="0.6" fill="#1f2937" />}
          </g>
        ))}
      </svg>
    );
  }
  const W = 10 + m.modulosPorFileira * 3;
  const H = 8 + m.fileiras * 9;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden>
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="3" fill={metal ? "#6b7280" : "#e5e7eb"} stroke="#374151" />
      <rect x="3" y="3" width={W - 6} height={H - 6} rx="1.5" fill="#f3f4f6" />
      {Array.from({ length: m.fileiras }).map((_, f) => (
        <g key={f}>
          <rect x="4" y={6 + f * 9} width={W - 8} height="2" fill="#9ca3af" />
          {Array.from({ length: m.modulosPorFileira }).map((__, i) => (
            <rect key={i} x={5 + i * 3} y={4 + f * 9} width="2.4" height="6" rx="0.4" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.3" />
          ))}
        </g>
      ))}
    </svg>
  );
}

type Opcao<T> = T | "";

/**
 * Seletor de caixa com filtros (padrão, instalação, material, IP, capacidade, trilhos,
 * módulos) e opção "Personalizado". `ocupados` = módulos já usados por geral/DR/DPS,
 * para calcular quantos disjuntores 1P cabem deixando a reserva da norma.
 */
export function SeletorCaixa({
  valor,
  aoMudar,
  ocupados = 0,
  minimo = 0,
}: {
  valor: ModeloQuadro;
  aoMudar: (m: ModeloQuadro) => void;
  ocupados?: number;
  /** Módulos mínimos necessários (para destacar caixas pequenas demais). */
  minimo?: number;
}) {
  const atual = caixaDoModelo(valor);
  const [personalizado, setPersonalizado] = useState(!atual);
  const [padrao, setPadrao] = useState<Opcao<PadraoCaixa>>(valor.padrao);
  const [instalacao, setInstalacao] = useState<Opcao<Instalacao>>("");
  const [material, setMaterial] = useState<Opcao<MaterialCaixa>>("");
  const [ip, setIp] = useState<Opcao<GrauIP>>("");
  const [capMin, setCapMin] = useState(0);
  const [fileiras, setFileiras] = useState(0);
  const [modulos, setModulos] = useState(0);
  const [verTodos, setVerTodos] = useState(false);

  const lista = useMemo(
    () =>
      filtrarCaixas({
        padrao: padrao || null,
        instalacao: instalacao || null,
        material: material || null,
        ip: ip || null,
        capacidadeMin: capMin,
        fileiras: fileiras || null,
        modulos: modulos || null,
      }),
    [padrao, instalacao, material, ip, capMin, fileiras, modulos],
  );
  const opcoesFileiras = [...new Set(filtrarCaixas({ padrao: padrao || null }).map((c) => c.fileiras))].sort((a, b) => a - b);
  const opcoesModulos = [...new Set(filtrarCaixas({ padrao: padrao || null }).map((c) => c.modulosPorFileira))].sort((a, b) => a - b);
  const capacidades = [...new Set(filtrarCaixas({ padrao: padrao || null }).map((c) => c.capacidade))].sort((a, b) => a - b);
  const visiveis = verTodos ? lista : lista.slice(0, 24);

  const sel = "input py-2 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 rounded-xl bg-surface-2 p-1">
        {[
          [false, "Catálogo"],
          [true, "Personalizado"],
        ].map(([v, r]) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => setPersonalizado(v as boolean)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium ${personalizado === v ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            {r as string}
          </button>
        ))}
      </div>

      {personalizado ? (
        <Personalizado valor={valor} aoMudar={aoMudar} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select className={sel} value={padrao} onChange={(e) => setPadrao(e.target.value as Opcao<PadraoCaixa>)} aria-label="Padrão">
              <option value="">DIN e NEMA</option>
              <option value="DIN">Padrão DIN</option>
              <option value="NEMA">Padrão NEMA</option>
            </select>
            <select className={sel} value={instalacao} onChange={(e) => setInstalacao(e.target.value as Opcao<Instalacao>)} aria-label="Instalação">
              <option value="">Embutir e sobrepor</option>
              <option value="embutir">De embutir</option>
              <option value="sobrepor">De sobrepor</option>
            </select>
            <select className={sel} value={material} onChange={(e) => setMaterial(e.target.value as Opcao<MaterialCaixa>)} aria-label="Material">
              <option value="">PVC e metálica</option>
              <option value="pvc">PVC</option>
              <option value="metalico">Metálica</option>
            </select>
            <select className={sel} value={ip} onChange={(e) => setIp(e.target.value as Opcao<GrauIP>)} aria-label="Grau de proteção">
              <option value="">Qualquer IP</option>
              <option value="IP40">IP40 (interno)</option>
              <option value="IP54">IP54</option>
              <option value="IP65">IP65 (externo/úmido)</option>
            </select>
            <select className={sel} value={capMin} onChange={(e) => setCapMin(Number(e.target.value))} aria-label="Capacidade mínima">
              <option value={0}>Qualquer capacidade</option>
              {capacidades.map((c) => (
                <option key={c} value={c}>≥ {c} {padrao === "NEMA" ? "disjuntores" : "módulos"}</option>
              ))}
            </select>
            <select className={sel} value={fileiras} onChange={(e) => setFileiras(Number(e.target.value))} aria-label="Trilhos">
              <option value={0}>Qualquer nº de {padrao === "NEMA" ? "colunas" : "trilhos"}</option>
              {opcoesFileiras.map((c) => (
                <option key={c} value={c}>{c} {padrao === "NEMA" ? "coluna(s)" : "trilho(s)"}</option>
              ))}
            </select>
            <select className={sel} value={modulos} onChange={(e) => setModulos(Number(e.target.value))} aria-label="Módulos por trilho">
              <option value={0}>Qualquer largura</option>
              {opcoesModulos.map((c) => (
                <option key={c} value={c}>{c} {padrao === "NEMA" ? "posições/coluna" : "módulos/trilho"}</option>
              ))}
            </select>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <SlidersHorizontal className="size-3.5" /> {lista.length} caixa(s)
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {visiveis.map((c) => (
              <CartaoCaixa
                key={c.id}
                c={c}
                ativa={atual?.id === c.id}
                ocupados={ocupados}
                pequena={capacidadeTotal(c) < minimo}
                aoEscolher={() => aoMudar(modeloDaCaixa(c))}
              />
            ))}
          </div>
          {lista.length > visiveis.length && (
            <button type="button" className="btn btn-secondary w-full" onClick={() => setVerTodos(true)}>
              Ver todas ({lista.length})
            </button>
          )}
          {lista.length === 0 && <p className="text-sm text-muted">Nenhuma caixa com esses filtros. Tente “Personalizado”.</p>}
          <p className="text-xs text-muted">
            Medidas aproximadas — conferir catálogo do fabricante. Caixas NEMA aceitam disjuntores NEMA no barramento e DR/DPS no
            trilho DIN auxiliar.
          </p>
        </>
      )}
    </div>
  );
}

function CartaoCaixa({
  c,
  ativa,
  ocupados,
  pequena,
  aoEscolher,
}: {
  c: Caixa;
  ativa: boolean;
  ocupados: number;
  pequena: boolean;
  aoEscolher: () => void;
}) {
  const total = capacidadeTotal(c);
  const nema = c.padrao === "NEMA";
  const cabem = cabeComReserva(nema ? c.fileiras * c.modulosPorFileira : total, nema ? 0 : ocupados);
  return (
    <button
      type="button"
      onClick={aoEscolher}
      className={`flex items-center gap-3 rounded-2xl border p-2.5 text-left transition ${
        ativa ? "border-accent bg-accent-soft" : "border-border hover:border-accent"
      } ${pequena ? "opacity-60" : ""}`}
    >
      <MiniCaixa m={c} className="h-14 w-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-sm font-semibold leading-tight">
          {ativa && <Check className="size-4 shrink-0 text-ok" />}
          {nema ? `${c.capacidade} disj. NEMA` : `${c.capacidade} módulos`}{" "}
          <span className="font-normal text-muted">
            ({c.fileiras}×{c.modulosPorFileira}
            {c.trilhoAux ? ` + ${c.trilhoAux} DIN` : ""})
          </span>
        </p>
        <p className="text-xs text-muted">
          {NOME_INSTALACAO[c.instalacao]} · {c.material === "pvc" ? "PVC" : "Metálica"} · {c.ip}
          {c.barramento ? " · barramento" : ""}
        </p>
        <p className="text-xs">
          Cabe {cabem} disjuntor(es) 1P + reserva
          <span className="text-muted"> · ~{c.medidas.altura}×{c.medidas.largura}×{c.medidas.profundidade} mm</span>
        </p>
        {pequena && <p className="text-xs text-warn">Pequena para as peças atuais</p>}
      </div>
    </button>
  );
}

function Personalizado({ valor: inicial, aoMudar }: { valor: ModeloQuadro; aoMudar: (m: ModeloQuadro) => void }) {
  const [valor, setValor] = useState<ModeloQuadro>({ ...inicial, caixaId: null });
  const set = (p: Partial<ModeloQuadro>) => setValor((v) => ({ ...v, ...p, caixaId: null }));
  const aplicado =
    !inicial.caixaId &&
    (["padrao", "fileiras", "modulosPorFileira", "trilhoAux", "instalacao", "material", "ip"] as const).every((k) => inicial[k] === valor[k]);
  const [fMin, fMax] = LIMITES_PERSONALIZADO.fileiras;
  const [mMin, mMax] = LIMITES_PERSONALIZADO.modulos;
  const nema = valor.padrao === "NEMA";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <MiniCaixa m={valor} className="h-20 w-24 shrink-0" />
        <p className="text-sm text-muted">
          Monte a caixa com as medidas reais do quadro que você tem na obra.{" "}
          {nema ? "NEMA: colunas de disjuntores no barramento + trilho DIN auxiliar." : "DIN: trilhos × módulos de 18 mm."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Campo rotulo="Padrão">
          <select className="input" value={valor.padrao} onChange={(e) => set({ padrao: e.target.value as PadraoCaixa, fileiras: e.target.value === "NEMA" ? 2 : valor.fileiras })}>
            <option value="DIN">DIN (trilho)</option>
            <option value="NEMA">NEMA (barramento)</option>
          </select>
        </Campo>
        <Campo rotulo={nema ? "Colunas" : `Trilhos (${fMin}–${fMax})`}>
          <input
            type="number"
            className="input"
            min={1}
            max={nema ? 2 : fMax}
            value={valor.fileiras}
            onChange={(e) => set({ fileiras: Math.min(nema ? 2 : fMax, Math.max(fMin, Number(e.target.value) || 1)) })}
          />
        </Campo>
        <Campo rotulo={nema ? "Posições por coluna" : `Módulos por trilho (${mMin}–${mMax})`}>
          <input
            type="number"
            className="input"
            min={mMin}
            max={mMax}
            value={valor.modulosPorFileira}
            onChange={(e) => set({ modulosPorFileira: Math.min(mMax, Math.max(mMin, Number(e.target.value) || mMin)) })}
          />
        </Campo>
        {nema && (
          <Campo rotulo="Trilho DIN auxiliar (módulos)">
            <input
              type="number"
              className="input"
              min={0}
              max={24}
              value={valor.trilhoAux}
              onChange={(e) => set({ trilhoAux: Math.min(24, Math.max(0, Number(e.target.value) || 0)) })}
            />
          </Campo>
        )}
        <Campo rotulo="Instalação">
          <select className="input" value={valor.instalacao} onChange={(e) => set({ instalacao: e.target.value as Instalacao })}>
            <option value="embutir">De embutir</option>
            <option value="sobrepor">De sobrepor</option>
          </select>
        </Campo>
        <Campo rotulo="Material">
          <select className="input" value={valor.material} onChange={(e) => set({ material: e.target.value as MaterialCaixa })}>
            {Object.entries(NOME_MATERIAL).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Grau de proteção">
          <select className="input" value={valor.ip} onChange={(e) => set({ ip: e.target.value as GrauIP })}>
            {Object.entries(DESCRICAO_IP).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </Campo>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          Total: <b>{capacidadeTotal(valor)}</b> {nema ? "posições (NEMA + DIN auxiliar)" : "módulos DIN"}
        </p>
        <button type="button" className="btn btn-primary" disabled={aplicado} onClick={() => aoMudar(valor)}>
          {aplicado ? <><Check className="size-4" /> Em uso</> : "Usar estas medidas"}
        </button>
      </div>
    </div>
  );
}
