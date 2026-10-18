import { Plus } from "lucide-react";
import { modulosOcupados, peca } from "@/lib/eletrica/pecas";
import type { QuadroDados } from "@/lib/eletrica/tipos";
import { numeroCircuito, ocupacao } from "./montagem";
import { type DestaquePeca, PecaVisual } from "./peca-visual";

/**
 * Emulação visual do quadro de distribuição: caixa, placa, trilhos DIN com as
 * posições de módulo, peças em proporção real e barras de neutro e terra.
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
  const m = 36 * escala; // px por módulo (18 mm)
  const altura = 104 * escala;
  const { fileiras, modulosPorFileira } = dados.modelo;
  const mapa = ocupacao(dados);
  const interativo = Boolean(aoTocarVazio || aoTocarPeca);
  const nCircuitos = dados.circuitos.length;
  const nBornes = Math.max(6, nCircuitos + 2);
  const larguraUtil = modulosPorFileira * m;

  return (
    <div
      className="inline-block rounded-[18px] bg-[linear-gradient(145deg,#3a424c,#20262d)] shadow-xl"
      style={{ padding: 14 * escala }}
    >
      <div
        className="rounded-[10px] bg-[linear-gradient(#e7e9ec,#d3d7dc)] shadow-[inset_0_2px_6px_rgba(0,0,0,.25)]"
        style={{ padding: 14 * escala, minWidth: larguraUtil + 28 * escala }}
      >
        {/* Placa de identificação */}
        <div className="mb-3 flex items-center justify-between gap-2" style={{ fontSize: 11 * escala }}>
          <span className="truncate rounded bg-white/80 px-2 py-0.5 font-bold text-[#111827]">{nome || "QDC"}</span>
          <span className="flex items-center gap-1 rounded bg-[#fbbf24] px-1.5 py-0.5 font-black text-[#111827]">
            ⚡ PERIGO
          </span>
        </div>

        <div className="flex flex-col" style={{ gap: 18 * escala }}>
          {Array.from({ length: fileiras }).map((_, f) => (
            <div key={f} className="relative" style={{ width: larguraUtil, height: altura }}>
              {/* Trilho DIN */}
              <div
                className="absolute inset-x-[-6px] top-1/2 -translate-y-1/2 rounded-[2px] bg-[linear-gradient(#f3f4f6,#9ca3af_45%,#d1d5db_55%,#6b7280)]"
                style={{ height: altura * 0.34 }}
              />
              {/* Posições livres */}
              {mapa[f].map((ocupante, p) =>
                ocupante ? null : (
                  <button
                    key={`v${p}`}
                    type="button"
                    disabled={!aoTocarVazio}
                    onClick={() => aoTocarVazio?.(f, p)}
                    className={`absolute top-[8%] grid place-items-center rounded-[3px] border border-dashed border-[#9aa1ab] bg-white/25 text-[#6b7280] ${
                      aoTocarVazio ? "hover:border-[#f59e0b] hover:bg-[#fde68a]/50 hover:text-[#92400e]" : ""
                    }`}
                    style={{ left: p * m + 1, width: m - 2, height: altura * 0.84 }}
                    aria-label={`Posição livre ${f + 1}.${p + 1}`}
                  >
                    {interativo && <Plus style={{ width: m * 0.4, height: m * 0.4 }} />}
                  </button>
                ),
              )}
              {/* Peças */}
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
                      onClick={() => aoTocarPeca?.(c.id)}
                      className="absolute top-0 flex flex-col items-center"
                      style={{ left: c.posicao * m, width: modulosOcupados(p) * m }}
                      aria-label={p.nome}
                    >
                      <PecaVisual
                        peca={p}
                        m={m}
                        altura={altura}
                        fases={c.fases}
                        geral={c.geral}
                        destaque={selecionado === c.id ? "selecionado" : (destaques?.[c.id] ?? null)}
                      />
                      {/* Etiqueta da porta */}
                      <span
                        className="mt-0.5 max-w-full truncate rounded-sm bg-white px-0.5 font-semibold text-[#111827]"
                        style={{ fontSize: 9 * escala }}
                      >
                        {c.geral ? "GERAL" : n ? `${n}` : c.etiqueta || "—"}
                      </span>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>

        {/* Barras de neutro e terra */}
        <div className="mt-6 space-y-2" style={{ marginTop: 22 * escala }}>
          <Barra cor="#2563eb" rotulo="N" bornes={nBornes} escala={escala} />
          <Barra cor="repeating-linear-gradient(90deg,#16a34a 0 10px,#facc15 10px 20px)" rotulo="PE" bornes={nBornes} escala={escala} />
        </div>
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
      <div
        className="flex flex-1 items-center justify-around rounded-[3px] px-1 shadow-sm"
        style={{ background: cor, height: 14 * escala }}
      >
        {Array.from({ length: bornes }).map((_, i) => (
          <span
            key={i}
            className="rounded-full border border-black/30 bg-[radial-gradient(#f3f4f6,#9ca3af)]"
            style={{ width: 8 * escala, height: 8 * escala }}
          />
        ))}
      </div>
    </div>
  );
}
