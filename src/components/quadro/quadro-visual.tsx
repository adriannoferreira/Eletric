import { Plus } from "lucide-react";
import { linhasDoModelo } from "@/lib/eletrica/caixas";
import { CORES_CABO, configLigacoes } from "@/lib/eletrica/ligacoes";
import { modulosOcupados, type Peca, peca } from "@/lib/eletrica/pecas";
import type { Componente, Fase, QuadroDados } from "@/lib/eletrica/tipos";
import { numeroCircuito, ocupacao } from "./montagem";
import { type DestaquePeca, PecaVisual } from "./peca-visual";

/**
 * Emulação visual do quadro de distribuição: caixa (PVC ou metálica, de embutir
 * ou de sobrepor), placa, trilhos DIN com as posições de módulo — ou colunas NEMA
 * no barramento —, peças em proporção real e barras de neutro e terra.
 * Sem estado próprio — pode ser usado como miniatura (sem callbacks).
 */
export function QuadroVisual({
  dados,
  nome,
  escala = 1,
  selecionado,
  destaques,
  aoTocarVazio,
  aoTocarPeca,
}: {
  dados: QuadroDados;
  nome?: string;
  escala?: number;
  selecionado?: string | null;
  destaques?: Record<string, DestaquePeca>;
  aoTocarVazio?: (fileira: number, posicao: number) => void;
  aoTocarPeca?: (id: string) => void;
}) {
  const m = 36 * escala; // px por módulo DIN (18 mm)
  const altura = 104 * escala;
  const linhas = linhasDoModelo(dados.modelo);
  const mapa = ocupacao(dados);
  const interativo = Boolean(aoTocarVazio || aoTocarPeca);
  const nBornes = Math.max(6, dados.circuitos.length + 2);
  const metal = dados.modelo.material === "metalico";
  const embutir = dados.modelo.instalacao === "embutir";
  const cores = configLigacoes(dados).cores;
  const coresFase = Object.fromEntries((["R", "S", "T"] as const).map((f) => [f, CORES_CABO[cores[f]]?.hex ?? "#888"])) as Record<Fase, string>;
  const larguraNEMA = 240 * escala;
  const larguraUtil = Math.max(
    ...linhas.map((l) => (l.padrao === "NEMA" ? 0 : l.modulos * m)),
    dados.modelo.padrao === "NEMA" ? 2 * larguraNEMA + 52 * escala : 0,
    160 * escala,
  );

  const moldura = metal ? "bg-[linear-gradient(145deg,#6b7280,#374151)]" : "bg-[linear-gradient(145deg,#f5f5f4,#d6d3d1)]";
  const fundo = metal ? "bg-[linear-gradient(#e5e7eb,#cbd5e1)]" : "bg-[linear-gradient(#fafaf9,#e7e5e4)]";

  const destaqueDe = (c: Componente): DestaquePeca => (selecionado === c.id ? "selecionado" : (destaques?.[c.id] ?? null));

  const linhaDIN = (f: number) => {
    const l = linhas[f];
    return (
      <div key={f} className="relative" style={{ width: l.modulos * m, height: altura }}>
        {linhas.length > 1 && (
          <span className="absolute -top-3.5 left-0 text-[#6b7280]" style={{ fontSize: 8 * escala }}>
            {l.nome}
          </span>
        )}
        <div
          className="absolute inset-x-[-6px] top-1/2 -translate-y-1/2 rounded-[2px] bg-[linear-gradient(#f3f4f6,#9ca3af_45%,#d1d5db_55%,#6b7280)]"
          style={{ height: altura * 0.34 }}
        />
        {mapa[f].map((ocupante, p) =>
          ocupante ? null : (
            <button
              key={`v${p}`}
              type="button"
              disabled={!aoTocarVazio}
              onClick={aoTocarVazio && (() => aoTocarVazio(f, p))}
              className={`absolute top-[8%] grid place-items-center rounded-[3px] border border-dashed border-[#9aa1ab] bg-white/25 text-[#6b7280] ${
                aoTocarVazio ? "hover:border-[#f59e0b] hover:bg-[#fde68a]/50 hover:text-[#92400e]" : ""
              }`}
              style={{ left: p * m + 1, width: m - 2, height: altura * 0.84 }}
              aria-label={`Posição livre ${l.nome} módulo ${p + 1}`}
            >
              {interativo && <Plus style={{ width: m * 0.4, height: m * 0.4 }} />}
            </button>
          ),
        )}
        {dados.componentes
          .filter((c) => c.fileira === f)
          .map((c) => {
            const p = peca(c.pecaId);
            if (!p) return null;
            const n = numeroCircuito(dados, c.circuitoId);
            return (
              <button
                key={c.id}
                type="button"
                disabled={!aoTocarPeca}
                onClick={aoTocarPeca && (() => aoTocarPeca(c.id))}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: c.posicao * m, width: modulosOcupados(p) * m }}
                aria-label={p.nome}
              >
                <PecaVisual peca={p} m={m} altura={altura} fases={c.fases} geral={c.geral} coresFase={coresFase} destaque={destaqueDe(c)} />
                <span className="mt-0.5 max-w-full truncate rounded-sm bg-white px-0.5 font-semibold text-[#111827]" style={{ fontSize: 9 * escala }}>
                  {c.geral ? "GERAL" : n ? `${n}` : c.etiqueta || "—"}
                </span>
              </button>
            );
          })}
      </div>
    );
  };

  // NEMA: colunas de disjuntores encaixados no barramento central.
  const colunas = linhas.map((l, i) => ({ l, i })).filter((x) => x.l.padrao === "NEMA");
  const passo = 50.8 * escala; // 25,4 mm
  const blocoNEMA = colunas.length > 0 && (
    <div className="flex">
      {colunas.map(({ l, i }, k) => (
        <div key={i} className="relative" style={{ width: larguraNEMA, height: l.modulos * passo, order: k === 0 ? 0 : 2 }}>
          <span className="absolute -top-3.5 left-0 text-[#6b7280]" style={{ fontSize: 8 * escala }}>
            {l.nome}
          </span>
          {mapa[i].map((ocupante, p) =>
            ocupante ? null : (
              <button
                key={`v${p}`}
                type="button"
                disabled={!aoTocarVazio}
                onClick={aoTocarVazio && (() => aoTocarVazio(i, p))}
                className={`absolute grid place-items-center rounded-[3px] border border-dashed border-[#9aa1ab] bg-white/25 text-[#6b7280] ${
                  aoTocarVazio ? "hover:border-[#f59e0b] hover:bg-[#fde68a]/50" : ""
                }`}
                style={{ top: p * passo + 2, left: 6 * escala, right: 6 * escala, height: passo - 4 }}
                aria-label={`Posição livre ${l.nome} ${p + 1}`}
              >
                {interativo && <Plus style={{ width: passo * 0.35, height: passo * 0.35 }} />}
              </button>
            ),
          )}
          {dados.componentes
            .filter((c) => c.fileira === i)
            .map((c) => {
              const p = peca(c.pecaId);
              if (!p) return null;
              const n = numeroCircuito(dados, c.circuitoId);
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!aoTocarPeca}
                  onClick={aoTocarPeca && (() => aoTocarPeca(c.id))}
                  className="absolute left-0"
                  style={{ top: c.posicao * passo, width: larguraNEMA, height: modulosOcupados(p) * passo }}
                  aria-label={p.nome}
                >
                  <PecaNEMA
                    peca={p}
                    fases={c.fases}
                    coresFase={coresFase}
                    destaque={destaqueDe(c)}
                    esquerda={k === 0}
                    largura={larguraNEMA}
                    passo={passo}
                    rotulo={n ? `${n}` : c.etiqueta}
                    escala={escala}
                  />
                </button>
              );
            })}
        </div>
      ))}
      <div className="relative rounded-sm bg-[linear-gradient(90deg,#92400e,#d97706,#92400e)] shadow-inner" style={{ width: 52 * escala, order: 1 }} title="Barramento de fases">
        <span className="absolute inset-x-0 top-1 text-center font-bold text-white" style={{ fontSize: 8 * escala }}>
          BARR.
        </span>
      </div>
    </div>
  );

  return (
    <div
      className={`inline-block shadow-xl ${moldura} ${embutir ? "rounded-[12px]" : "rounded-[22px]"}`}
      style={{ padding: (embutir ? 18 : 10) * escala, boxShadow: embutir ? undefined : "0 18px 30px -12px rgba(0,0,0,.55)" }}
    >
      <div className={`rounded-[10px] shadow-[inset_0_2px_6px_rgba(0,0,0,.25)] ${fundo}`} style={{ padding: 14 * escala, minWidth: larguraUtil + 28 * escala }}>
        <div className="mb-4 flex items-center justify-between gap-2" style={{ fontSize: 11 * escala }}>
          <span className="truncate rounded bg-white/80 px-2 py-0.5 font-bold text-[#111827]">{nome || "QDC"}</span>
          <span className="flex items-center gap-1.5 text-[#4b5563]" style={{ fontSize: 9 * escala }}>
            {dados.modelo.padrao} · {metal ? "metálico" : "PVC"} · {dados.modelo.ip}
            <span className="rounded bg-[#fbbf24] px-1.5 py-0.5 font-black text-[#111827]">⚡ PERIGO</span>
          </span>
        </div>

        <div className="flex flex-col" style={{ gap: 24 * escala }}>
          {linhas.map((l, f) => (l.auxiliar ? linhaDIN(f) : null))}
          {blocoNEMA}
          {linhas.map((l, f) => (l.padrao === "DIN" && !l.auxiliar ? linhaDIN(f) : null))}
        </div>

        <div className="space-y-2" style={{ marginTop: 22 * escala }}>
          <Barra cor="#2563eb" rotulo="N" bornes={nBornes} escala={escala} />
          <Barra cor="repeating-linear-gradient(90deg,#16a34a 0 10px,#facc15 10px 20px)" rotulo="PE" bornes={nBornes} escala={escala} />
        </div>
      </div>
    </div>
  );
}

/** Disjuntor NEMA deitado na coluna: o lado de linha encosta no barramento. */
function PecaNEMA({
  peca: p,
  fases,
  coresFase,
  destaque,
  esquerda,
  largura,
  passo,
  rotulo,
  escala,
}: {
  peca: Peca;
  fases: Fase[];
  coresFase: Record<Fase, string>;
  destaque: DestaquePeca;
  esquerda: boolean;
  largura: number;
  passo: number;
  rotulo: string;
  escala: number;
}) {
  const h = modulosOcupados(p) * passo;
  const anel =
    destaque === "selecionado" ? "0 0 0 3px #fbbf24" : destaque === "erro" ? "0 0 0 2px #ef4444" : destaque === "aviso" ? "0 0 0 2px #f59e0b" : "none";
  return (
    <div
      className={`relative flex items-center overflow-hidden rounded-[3px] border border-[#6b7280] bg-[linear-gradient(#111827,#1f2937)] text-white ${esquerda ? "flex-row" : "flex-row-reverse"}`}
      style={{ width: largura, height: h, boxShadow: anel }}
    >
      <span className="rounded-sm bg-white px-1 font-semibold text-[#111827]" style={{ fontSize: 9 * escala, margin: `0 ${6 * escala}px` }}>
        {rotulo || `${p.polos}P`}
      </span>
      <span className="font-bold" style={{ fontSize: 13 * escala, padding: `0 ${4 * escala}px` }}>
        {p.rotulo}
      </span>
      <div className="mx-auto rounded-[3px] bg-[#e5e7eb] shadow-[inset_0_-3px_0_rgba(0,0,0,.35)]" style={{ width: 54 * escala, height: Math.min(h * 0.55, 30 * escala) }} />
      <div className="flex h-full flex-col" style={{ width: 8 * escala }}>
        {Array.from({ length: p.polos }).map((_, i) => (
          <div key={i} className="flex-1 border-b border-black/40" style={{ background: fases[i] ? coresFase[fases[i]] : "#475569" }} />
        ))}
      </div>
    </div>
  );
}

function Barra({ cor, rotulo, bornes, escala }: { cor: string; rotulo: string; bornes: number; escala: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-center font-bold text-[#374151]" style={{ fontSize: 11 * escala }}>
        {rotulo}
      </span>
      <div className="flex flex-1 items-center justify-around rounded-[3px] px-1 shadow-sm" style={{ background: cor, height: 14 * escala }}>
        {Array.from({ length: bornes }).map((_, i) => (
          <span key={i} className="rounded-full border border-black/30 bg-[radial-gradient(#f3f4f6,#9ca3af)]" style={{ width: 8 * escala, height: 8 * escala }} />
        ))}
      </div>
    </div>
  );
}
