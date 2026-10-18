"use client";

import { CheckCircle2, Printer, Shuffle, X } from "lucide-react";
import { Campo } from "@/components/ui";
import {
  ajustarFasesAoPente,
  CORES_CABO,
  CORES_NEUTRO,
  CORES_PE,
  CORES_PROIBIDAS_FASE,
  configLigacoes,
  type Ligacao,
  nomeCor,
  type ResultadoLigacoes,
} from "@/lib/eletrica/ligacoes";
import { SECOES } from "@/lib/eletrica/tabelas";
import { CORES_PADRAO, type LigacoesConfig, type QuadroDados } from "@/lib/eletrica/tipos";
import { ListaAlertas } from "./alertas";

const n = (v: number) => v.toLocaleString("pt-BR");

export function Bolinha({ cor, className = "size-3.5" }: { cor: string; className?: string }) {
  const c = CORES_CABO[cor];
  return (
    <span
      className={`inline-block shrink-0 rounded-full ring-1 ring-black/30 ${className}`}
      style={{
        background: cor === "verde-amarelo" ? "repeating-linear-gradient(45deg,#16a34a 0 3px,#facc15 3px 6px)" : (c?.hex ?? cor),
      }}
    />
  );
}

function opcoesCor(funcao: "F" | "N" | "PE") {
  return Object.keys(CORES_CABO).filter((c) =>
    funcao === "F" ? !CORES_PROIBIDAS_FASE.includes(c) : funcao === "N" ? CORES_NEUTRO.includes(c) : CORES_PE.includes(c),
  );
}

/** Detalhe da ligação selecionada + ajustes manuais. */
export function DetalheLigacao({
  dados,
  resultado,
  ligacao,
  aoMudar,
  aoFechar,
}: {
  dados: QuadroDados;
  resultado: ResultadoLigacoes;
  ligacao: Ligacao;
  aoMudar: (q: QuadroDados) => void;
  aoFechar: () => void;
}) {
  const cfg = configLigacoes(dados);
  const set = (patch: Partial<LigacoesConfig>) => aoMudar({ ...dados, ligacoes: { ...cfg, ...patch } });
  const ajuste = cfg.ajustes[ligacao.id] ?? { cor: null, secao: null, modo: null };
  const setAjuste = (a: Partial<typeof ajuste>) => {
    const novo = { ...ajuste, ...a };
    const ajustes = { ...cfg.ajustes };
    if (!novo.cor && !novo.secao && !novo.modo) delete ajustes[ligacao.id];
    else ajustes[ligacao.id] = novo;
    set({ ajustes });
  };
  const destinoPeca = ligacao.para.k === "term" ? ligacao.para.compId : null;
  const ajustePeca = destinoPeca ? (cfg.pecas[destinoPeca] ?? { jumper: false, inverter: false }) : null;
  const setPeca = (a: Partial<{ jumper: boolean; inverter: boolean }>) => {
    if (!destinoPeca) return;
    const novo = { ...(cfg.pecas[destinoPeca] ?? { jumper: false, inverter: false }), ...a };
    const pecas = { ...cfg.pecas };
    if (!novo.jumper && !novo.inverter) delete pecas[destinoPeca];
    else pecas[destinoPeca] = novo;
    set({ pecas });
  };
  const neutroDeCircuito = ligacao.funcao === "N" && ligacao.para.k === "saida" ? ligacao.para.circuitoId : null;
  const barrasN = resultado.barras.filter((b) => b.funcao === "N");
  const modoTxt = { cabo: "Cabo", pente: "Pente", ponte: "Ponte (jumper)", barramento: "Barramento", saida: "Saída do circuito" }[ligacao.modo];

  return (
    <div className="space-y-3 rounded-2xl border border-accent bg-accent-soft/40 p-3">
      <div className="flex items-start gap-2">
        <Bolinha cor={ligacao.cor} className="mt-1 size-4" />
        <div className="min-w-0 flex-1 text-sm">
          <p>
            <span className="text-muted">De:</span> <b>{ligacao.deTexto}</b>
          </p>
          <p>
            <span className="text-muted">Para:</span> <b>{ligacao.paraTexto}</b>
          </p>
          <p className="text-muted">
            {modoTxt} · {ligacao.funcao === "F" ? `fase ${ligacao.fase ?? ""}` : ligacao.funcao === "N" ? "neutro" : "PE"} · {nomeCor(ligacao.cor).toLowerCase()}
            {ligacao.modo !== "barramento" && ` · ${n(ligacao.secao)} mm²`}
            {ligacao.comprimentoM > 0 && ` · ~${n(ligacao.comprimentoM)} m`}
          </p>
          <p className="text-xs text-muted">{ligacao.terminal}</p>
          {ligacao.obs && <p className="mt-1 text-xs">{ligacao.obs}</p>}
        </div>
        <button className="btn btn-ghost p-1.5" onClick={aoFechar} aria-label="Fechar detalhe">
          <X className="size-4" />
        </button>
      </div>

      {ligacao.modo !== "barramento" && (
        <div className="grid grid-cols-2 gap-2">
          {ligacao.modo !== "pente" && (
            <Campo rotulo="Cor deste cabo">
              <select className="input py-2" value={ajuste.cor ?? ""} onChange={(e) => setAjuste({ cor: e.target.value || null })}>
                <option value="">Padrão ({nomeCor(ligacao.cor).toLowerCase()})</option>
                {opcoesCor(ligacao.funcao).map((c) => (
                  <option key={c} value={c}>{nomeCor(c)}</option>
                ))}
              </select>
            </Campo>
          )}
          <Campo rotulo="Seção">
            <select className="input py-2" value={ajuste.secao ?? ""} onChange={(e) => setAjuste({ secao: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Automática</option>
              {SECOES.filter((s) => s <= 50).map((s) => (
                <option key={s} value={s}>{n(s)} mm²</option>
              ))}
            </select>
          </Campo>
        </div>
      )}

      {ligacao.modo === "pente" && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={ajuste.modo === "cabo"} onChange={(e) => setAjuste({ modo: e.target.checked ? "cabo" : null })} />
          Ligar esta sequência com cabos (pontes) em vez de pente
        </label>
      )}

      {ajustePeca && ligacao.modo !== "saida" && (
        <div className="space-y-1.5 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={ajustePeca.jumper} onChange={(e) => setPeca({ jumper: e.target.checked })} />
            Alimentar {resultado.nomes.get(destinoPeca!)} por ponte (jumper) do vizinho
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={ajustePeca.inverter} onChange={(e) => setPeca({ inverter: e.target.checked })} />
            Está alimentado por baixo na obra (registrar inversão)
          </label>
        </div>
      )}

      {neutroDeCircuito && (
        <Campo rotulo="Barra de onde sai este neutro (como está na obra)">
          <select
            className="input py-2"
            value={cfg.neutros[neutroDeCircuito] ?? ""}
            onChange={(e) => {
              const neutros = { ...cfg.neutros };
              if (e.target.value) neutros[neutroDeCircuito] = e.target.value;
              else delete neutros[neutroDeCircuito];
              set({ neutros });
            }}
          >
            <option value="">Automático (correto)</option>
            {barrasN.map((b) => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        </Campo>
      )}
    </div>
  );
}

/** Aba "Ligações": cores, verificação e lista de montagem. */
export function PainelLigacoes({
  id,
  dados,
  resultado,
  selecionada,
  aoSelecionar,
  aoMudar,
  aoMarcar,
}: {
  id: number;
  dados: QuadroDados;
  resultado: ResultadoLigacoes;
  selecionada: string | null;
  aoSelecionar: (id: string | null) => void;
  aoMudar: (q: QuadroDados) => void;
  aoMarcar: (feitas: string[]) => void;
}) {
  const cfg = configLigacoes(dados);
  const feitas = new Set(cfg.feitas);
  const lista = resultado.ligacoes.filter((l) => l.modo !== "barramento");
  const nFeitas = lista.filter((l) => feitas.has(l.id)).length;
  const etapas = [...new Set(lista.map((l) => l.etapa))];
  const semPente = resultado.alertas.some((a) => /sequência de um pente/.test(a.mensagem));

  const setCor = (k: keyof LigacoesConfig["cores"], v: string) => aoMudar({ ...dados, ligacoes: { ...cfg, cores: { ...cfg.cores, [k]: v } } });

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="font-semibold">Verificação das ligações</h3>
        <ListaAlertas alertas={resultado.alertas.filter((a) => a.nivel !== "ok")} vazio="Ligações sem problemas no verificador automático." />
        {semPente && (
          <button className="btn btn-secondary" onClick={() => aoMudar(ajustarFasesAoPente(dados))}>
            <Shuffle className="size-4" /> Ajustar fases ao pente
          </button>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Cores dos cabos</h3>
        <p className="text-xs text-muted">
          NBR 5410 6.1.5.3: neutro azul-claro e PE verde-amarelo (ou verde) são obrigatórios; as fases podem ter qualquer outra cor
          — mantenha o mesmo padrão em toda a obra.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(["R", "S", "T", "retorno"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 rounded-xl border border-border p-2 text-sm">
              <Bolinha cor={cfg.cores[k]} />
              <span className="w-14 shrink-0 font-medium">{k === "retorno" ? "Retorno" : `Fase ${k}`}</span>
              <select className="min-w-0 flex-1 bg-transparent outline-none" value={cfg.cores[k]} onChange={(e) => setCor(k, e.target.value)}>
                {opcoesCor("F").map((c) => (
                  <option key={c} value={c}>{nomeCor(c)}</option>
                ))}
              </select>
            </label>
          ))}
          <label className="flex items-center gap-2 rounded-xl border border-border p-2 text-sm">
            <Bolinha cor={cfg.cores.N} />
            <span className="font-medium">Neutro</span>
            <span className="text-muted">azul-claro</span>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-border p-2 text-sm">
            <Bolinha cor={cfg.cores.PE} />
            <span className="w-14 shrink-0 font-medium">PE</span>
            <select className="min-w-0 flex-1 bg-transparent outline-none" value={cfg.cores.PE} onChange={(e) => setCor("PE", e.target.value)}>
              {opcoesCor("PE").map((c) => (
                <option key={c} value={c}>{nomeCor(c)}</option>
              ))}
            </select>
          </label>
        </div>
        {(cfg.cores.R !== CORES_PADRAO.R || cfg.cores.S !== CORES_PADRAO.S || cfg.cores.T !== CORES_PADRAO.T) && (
          <button className="btn btn-ghost text-sm" onClick={() => aoMudar({ ...dados, ligacoes: { ...cfg, cores: { ...CORES_PADRAO } } })}>
            Voltar às cores padrão
          </button>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Lista de ligações (montagem)</h3>
          <a href={`/quadros/${id}/imprimir?doc=ligacoes`} target="_blank" className="btn btn-secondary py-1.5 text-sm">
            <Printer className="size-4" /> Imprimir
          </a>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-ok transition-all" style={{ width: `${lista.length ? (nFeitas / lista.length) * 100 : 0}%` }} />
          </div>
          <span className="shrink-0 text-muted">
            {nFeitas}/{lista.length} feitas
          </span>
        </div>
        <TabelaLigacoes
          ligacoes={lista}
          etapas={etapas}
          feitas={feitas}
          selecionada={selecionada}
          aoSelecionar={aoSelecionar}
          aoMarcar={(lid, v) => {
            const s = new Set(feitas);
            if (v) s.add(lid);
            else s.delete(lid);
            aoMarcar([...s]);
          }}
        />
      </section>
    </div>
  );
}

/** Tabela de conexões — também usada na impressão. */
export function TabelaLigacoes({
  ligacoes,
  etapas,
  feitas,
  selecionada,
  aoSelecionar,
  aoMarcar,
}: {
  ligacoes: Ligacao[];
  etapas: string[];
  feitas: Set<string>;
  selecionada?: string | null;
  aoSelecionar?: (id: string) => void;
  aoMarcar?: (id: string, feito: boolean) => void;
}) {
  let i = 0;
  return (
    <div className="space-y-3">
      {etapas.map((et) => (
        <div key={et} className="break-inside-avoid">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{et}</p>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {ligacoes
              .filter((l) => l.etapa === et)
              .map((l) => {
                i++;
                return (
                  <li
                    key={l.id}
                    className={`flex items-start gap-2 px-2.5 py-2 text-sm ${selecionada === l.id ? "bg-accent-soft" : ""} ${feitas.has(l.id) ? "opacity-60" : ""}`}
                  >
                    {aoMarcar ? (
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                        checked={feitas.has(l.id)}
                        onChange={(e) => aoMarcar(l.id, e.target.checked)}
                        aria-label={`Ligação ${i} feita`}
                      />
                    ) : (
                      <span className="mt-1 size-3.5 shrink-0 rounded border border-black/60" />
                    )}
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => aoSelecionar?.(l.id)}>
                      <span className="flex items-center gap-1.5">
                        <span className="w-6 shrink-0 text-xs font-bold text-muted">{i}</span>
                        <Bolinha cor={l.cor} />
                        <span className="font-medium">
                          {l.modo === "pente" ? "Pente" : l.funcao === "F" ? `Fase ${l.fase ?? ""}` : l.funcao === "N" ? "Neutro" : "PE"}
                        </span>
                        <span className="text-muted">
                          {l.modo !== "barramento" && `${n(l.secao)} mm²`}
                          {l.comprimentoM > 0 && ` · ${n(l.comprimentoM)} m`}
                        </span>
                        {feitas.has(l.id) && <CheckCircle2 className="size-3.5 text-ok" />}
                      </span>
                      <span className="block pl-7 text-xs">
                        {l.deTexto} → {l.paraTexto}
                      </span>
                      <span className="block pl-7 text-[11px] text-muted">{l.terminal}</span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
