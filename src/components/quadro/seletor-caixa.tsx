"use client";

import { Conferir, MaisOpcoes } from "@/components/divulgacao";
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
  LINHAS,
  linhaDoModelo,
  modeloDaCaixa,
  NOME_INSTALACAO,
  NOME_ORIENTACAO,
  type Orientacao,
  NOME_MATERIAL,
  type PadraoCaixa,
} from "@/lib/eletrica/caixas";
import type { ModeloQuadro } from "@/lib/eletrica/tipos";

/**
 * Miniatura realista da caixa, na proporção real (trilho ≈ 125 mm, módulo 18 mm):
 * cor e acabamento da linha, espelho com as janelas das alavancas, colunas NEMA,
 * fechadura e furos de entrada.
 */
export function MiniCaixa({
  m,
  className = "h-16",
}: {
  m: Pick<ModeloQuadro, "fileiras" | "modulosPorFileira" | "padrao" | "trilhoAux" | "material" | "linha" | "instalacao" | "ip"> & { saidaCabos?: "baixo" | "cima" };
  className?: string;
}) {
  const skin = linhaDoModelo(m);
  const nema = m.padrao === "NEMA";
  const W = nema ? 300 : m.modulosPorFileira * 18 + 80;
  const H = nema ? m.modulosPorFileira * 26 + (m.trilhoAux ? 110 : 0) + 160 : m.fileiras * 125 + 80;
  const borda = m.instalacao === "embutir" ? 16 : 8;
  const vidro = skin.porta === "fume" || skin.porta === "transparente";
  const yKnock = m.saidaCabos === "cima" ? 4 : H - 4;
  return (
    <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      <rect x={0} y={0} width={W} height={H} rx={m.instalacao === "embutir" ? 10 : 22} fill={skin.corCaixa} stroke="#374151" strokeWidth={3} />
      {skin.obra && <rect x={0} y={0} width={W} height={14} fill="#111827" opacity={0.85} />}
      <rect x={borda} y={borda + (skin.obra ? 8 : 0)} width={W - 2 * borda} height={H - 2 * borda - (skin.obra ? 8 : 0)} rx={6} fill={skin.corEspelho} stroke="#9ca3af" strokeWidth={2} />
      {nema ? (
        <>
          {m.trilhoAux > 0 && <rect x={40} y={50} width={W - 80} height={34} rx={4} fill="#1f2937" opacity={0.85} />}
          {Array.from({ length: m.modulosPorFileira }).map((_, i) => {
            const y = (m.trilhoAux ? 120 : 50) + i * 26;
            return (
              <g key={i}>
                <rect x={40} y={y} width={100} height={20} rx={3} fill="#1f2937" />
                {m.fileiras > 1 && <rect x={160} y={y} width={100} height={20} rx={3} fill="#1f2937" />}
              </g>
            );
          })}
          <rect x={144} y={m.trilhoAux ? 116 : 46} width={12} height={m.modulosPorFileira * 26} fill="#b45309" opacity={0.6} />
        </>
      ) : (
        Array.from({ length: m.fileiras }).map((_, f) => {
          const y = 40 + f * 125 + 30;
          return (
            <g key={f}>
              <rect x={40} y={y} width={m.modulosPorFileira * 18} height={46} rx={3} fill="#1f2937" opacity={0.9} />
              {Array.from({ length: m.modulosPorFileira }).map((__, i) => (
                <rect key={i} x={44 + i * 18} y={y + 14} width={10} height={18} rx={1.5} fill={i % 3 === 2 ? "#e5e7eb" : "#f9fafb"} />
              ))}
            </g>
          );
        })
      )}
      {vidro && (
        <rect
          x={borda - 4}
          y={borda - 4}
          width={W - 2 * borda + 8}
          height={H - 2 * borda + 8}
          rx={8}
          fill={skin.porta === "fume" ? "#1e293b" : "#bfdbfe"}
          opacity={skin.porta === "fume" ? 0.45 : 0.28}
        />
      )}
      {skin.fechadura && <circle cx={W - 14} cy={H / 2} r={7} fill="#6b7280" stroke="#111" strokeWidth={2} />}
      {Array.from({ length: Math.max(3, Math.min(6, Math.round(W / 70))) }).map((_, i, a) => (
        <circle key={i} cx={(W / (a.length + 1)) * (i + 1)} cy={yKnock} r={7} fill="#00000022" stroke="#00000055" strokeWidth={2} />
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
  const [linha, setLinha] = useState<string>("");
  const [orientacao, setOrientacao] = useState<Opcao<Orientacao>>("");
  const [saida, setSaida] = useState<"baixo" | "cima">(valor.saidaCabos);
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
        linha: linha || null,
        orientacao: orientacao || null,
        padrao: padrao || null,
        instalacao: instalacao || null,
        material: material || null,
        ip: ip || null,
        capacidadeMin: capMin,
        fileiras: fileiras || null,
        modulos: modulos || null,
      }),
    [linha, orientacao, padrao, instalacao, material, ip, capMin, fileiras, modulos],
  );
  const opcoesFileiras = [...new Set(filtrarCaixas({ padrao: padrao || null }).map((c) => c.fileiras))].sort((a, b) => a - b);
  const opcoesModulos = [...new Set(filtrarCaixas({ padrao: padrao || null }).map((c) => c.modulosPorFileira))].sort((a, b) => a - b);
  const capacidades = [...new Set(filtrarCaixas({ padrao: padrao || null }).map((c) => c.capacidade))].sort((a, b) => a - b);
  const visiveis = verTodos ? lista : lista.slice(0, 6);

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
            <select
              className={`${sel} col-span-2`}
              value={linha}
              onChange={(e) => {
                setLinha(e.target.value);
                const l = LINHAS.find((x) => x.id === e.target.value);
                if (l) setPadrao(l.padrao);
              }}
              aria-label="Modelo do quadro"
            >
              <option value="">Todos os modelos</option>
              {LINHAS.map((l) => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
            <select className={sel} value={orientacao} onChange={(e) => setOrientacao(e.target.value as Opcao<Orientacao>)} aria-label="Orientação">
              <option value="">Qualquer formato</option>
              {Object.entries(NOME_ORIENTACAO).map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </select>
            <select className={sel} value={capMin} onChange={(e) => setCapMin(Number(e.target.value))} aria-label="Capacidade mínima">
              <option value={0}>Qualquer capacidade</option>
              {capacidades.map((c) => (
                <option key={c} value={c}>≥ {c} {padrao === "NEMA" ? "disjuntores" : "módulos"}</option>
              ))}
            </select>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <SlidersHorizontal className="size-3.5" /> {lista.length} caixa(s)
            </span>
          </div>
          <MaisOpcoes rotulo="Mais filtros">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select className={sel} value={saida} onChange={(e) => setSaida(e.target.value as "baixo" | "cima")} aria-label="Saída dos cabos">
              <option value="baixo">Cabos por baixo</option>
              <option value="cima">Cabos por cima</option>
            </select>
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
            </div>
          </MaisOpcoes>

          <div className="grid gap-2 sm:grid-cols-2">
            {visiveis.map((c) => (
              <CartaoCaixa
                key={c.id}
                c={c}
                ativa={atual?.id === c.id}
                ocupados={ocupados}
                pequena={capacidadeTotal(c) < minimo}
                saida={saida}
                aoEscolher={() => aoMudar(modeloDaCaixa(c, saida))}
              />
            ))}
          </div>
          {lista.length > visiveis.length && (
            <button type="button" className="btn btn-secondary w-full" onClick={() => setVerTodos(true)}>
              Ver mais ({lista.length - visiveis.length})
            </button>
          )}
          {lista.length === 0 && <p className="text-sm text-muted">Nenhuma caixa com esses filtros. Tente “Personalizado”.</p>}
          <Conferir
            itens={[
              "Medidas aproximadas — conferir o catálogo do fabricante.",
              "Caixas NEMA aceitam disjuntores NEMA no barramento e DR/DPS no trilho DIN auxiliar.",
            ]}
          />
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
  saida,
  aoEscolher,
}: {
  c: Caixa;
  saida: "baixo" | "cima";
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
      <MiniCaixa m={{ ...c, saidaCabos: saida }} className="h-16 w-16 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-sm font-semibold leading-tight">
          {ativa && <Check className="size-4 shrink-0 text-ok" />}
          {nema ? `${c.capacidade} disj. NEMA` : `${c.capacidade} módulos`}{" "}
          <span className="font-normal text-muted">
            ({c.fileiras}×{c.modulosPorFileira}
            {c.trilhoAux ? ` + ${c.trilhoAux} DIN` : ""})
          </span>
        </p>
        <p className="truncate text-xs">{linhaDoModelo({ ...c, linha: c.linha }).nome}</p>
        <p className="truncate text-xs text-muted">
          {pequena ? <span className="text-warn">Pequena para as peças atuais</span> : `cabe ${cabem} disj. 1P + reserva`}
        </p>
        {ativa && (
          <p className="text-xs text-muted">
            {NOME_INSTALACAO[c.instalacao]} · {c.orientacao} · {c.ip}
            {c.barramento ? " · barramento" : ""} · {c.referencia} · ~{c.medidas.altura}×{c.medidas.largura}×{c.medidas.profundidade} mm
          </p>
        )}
      </div>
    </button>
  );
}

function Personalizado({ valor: inicial, aoMudar }: { valor: ModeloQuadro; aoMudar: (m: ModeloQuadro) => void }) {
  const [valor, setValor] = useState<ModeloQuadro>({ ...inicial, caixaId: null });
  const set = (p: Partial<ModeloQuadro>) => setValor((v) => ({ ...v, ...p, caixaId: null }));
  const aplicado =
    !inicial.caixaId &&
    (["padrao", "fileiras", "modulosPorFileira", "trilhoAux", "instalacao", "material", "ip", "linha", "orientacao", "saidaCabos"] as const).every(
      (k) => inicial[k] === valor[k],
    );
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
          <select className="input" value={valor.padrao} onChange={(e) => set({ padrao: e.target.value as PadraoCaixa, fileiras: e.target.value === "NEMA" ? 2 : valor.fileiras, linha: null })}>
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
        <Campo rotulo="Aparência (modelo)">
          <select
            className="input"
            value={linhaDoModelo(valor).id}
            onChange={(e) => {
              const l = LINHAS.find((x) => x.id === e.target.value)!;
              set({ linha: l.id, material: l.material, ip: l.ip });
            }}
          >
            {LINHAS.filter((l) => l.padrao === valor.padrao).map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Formato">
          <select className="input" value={valor.orientacao ?? ""} onChange={(e) => set({ orientacao: (e.target.value || null) as Orientacao | null })}>
            <option value="">Automático pela proporção</option>
            {Object.entries(NOME_ORIENTACAO).map(([v, r]) => (
              <option key={v} value={v}>{r}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Saída dos cabos">
          <select className="input" value={valor.saidaCabos} onChange={(e) => set({ saidaCabos: e.target.value as "baixo" | "cima" })}>
            <option value="baixo">Por baixo</option>
            <option value="cima">Por cima</option>
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
