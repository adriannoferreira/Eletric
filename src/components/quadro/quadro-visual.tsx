import { Plus } from "lucide-react";
import { linhaDoModelo, linhasDoModelo, orientacaoDoModelo } from "@/lib/eletrica/caixas";
import { CORES_CABO, configLigacoes } from "@/lib/eletrica/ligacoes";
import { modulosOcupados, type Peca, peca } from "@/lib/eletrica/pecas";
import type { Componente, Fase, QuadroDados } from "@/lib/eletrica/tipos";
import { numeroCircuito, ocupacao } from "./montagem";
import { type DestaquePeca, PecaVisual } from "./peca-visual";

/** Como o quadro é visto: porta fechada, sem porta (com espelho) ou sem espelho (montagem). */
export type VistaQuadro = "porta" | "espelho" | "montagem";

/**
 * Emulação visual do quadro de distribuição, com a "skin" da linha de referência
 * (cor da caixa, porta branca/fumê/transparente/chapa, fechadura, espelho recortado,
 * parafusos, furos de entrada) e a orientação real (horizontal, vertical, quadrado).
 * Trilhos DIN com as posições de módulo — ou colunas NEMA no barramento —, peças em
 * proporção real e barras de neutro e terra (inferiores, ou laterais no vertical).
 * Sem estado próprio — pode ser usado como miniatura (sem callbacks).
 */
export function QuadroVisual({
  dados,
  nome,
  escala = 1,
  selecionado,
  destaques,
  vista = "montagem",
  aoTocarVazio,
  aoTocarPeca,
  aoAbrirPorta,
}: {
  dados: QuadroDados;
  nome?: string;
  escala?: number;
  selecionado?: string | null;
  destaques?: Record<string, DestaquePeca>;
  vista?: VistaQuadro;
  aoTocarVazio?: (fileira: number, posicao: number) => void;
  aoTocarPeca?: (id: string) => void;
  aoAbrirPorta?: () => void;
}) {
  const m = 36 * escala; // px por módulo DIN (18 mm)
  const altura = 104 * escala;
  const linhas = linhasDoModelo(dados.modelo);
  const skin = linhaDoModelo(dados.modelo);
  const orientacao = orientacaoDoModelo(dados.modelo);
  // Barras laterais só em caixas DIN verticais (NEMA: barras embaixo do barramento).
  const lateral = orientacao === "vertical" && dados.modelo.padrao === "DIN";
  const mapa = ocupacao(dados);
  const comEspelho = vista !== "montagem";
  const podeTocar = vista !== "porta";
  const tocarVazio = podeTocar ? aoTocarVazio : undefined;
  const tocarPeca = podeTocar ? aoTocarPeca : undefined;
  const interativo = Boolean(tocarVazio || tocarPeca);
  const nBornes = Math.max(6, dados.circuitos.length + 2);
  const metal = dados.modelo.material === "metalico";
  const embutir = dados.modelo.instalacao === "embutir";
  const cores = configLigacoes(dados).cores;
  const coresFase = Object.fromEntries((["R", "S", "T"] as const).map((f) => [f, CORES_CABO[cores[f]]?.hex ?? "#888"])) as Record<Fase, string>;
  const larguraNEMA = 240 * escala;
  const larguraLinhas = Math.max(
    ...linhas.map((l) => (l.padrao === "NEMA" ? 0 : l.modulos * m)),
    dados.modelo.padrao === "NEMA" ? 2 * larguraNEMA + 52 * escala : 0,
    120 * escala,
  );

  const destaqueDe = (c: Componente): DestaquePeca => (selecionado === c.id ? "selecionado" : (destaques?.[c.id] ?? null));
  // Espelho: só a faixa das alavancas aparece (≈ 24% a 70% da altura da peça).
  const faixaTopo = altura * 0.17;
  const faixaBase = altura * 0.7;
  const corEspelho = skin.corEspelho;

  const linhaDIN = (f: number) => {
    const l = linhas[f];
    return (
      <div key={f} className="relative" style={{ width: l.modulos * m, height: altura }}>
        {linhas.length > 1 && !comEspelho && (
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
              disabled={!tocarVazio}
              onClick={tocarVazio && (() => tocarVazio(f, p))}
              className={`absolute top-[8%] z-10 grid place-items-center rounded-[3px] border text-[#6b7280] ${
                comEspelho ? "border-black/10" : "border-dashed border-[#9aa1ab] bg-white/25"
              } ${tocarVazio ? "hover:border-[#f59e0b] hover:bg-[#fde68a]/50 hover:text-[#92400e]" : ""}`}
              style={{
                left: p * m + 1,
                width: m - 2,
                height: altura * 0.84,
                background: comEspelho ? `linear-gradient(${corEspelho}, color-mix(in srgb, ${corEspelho} 88%, #000))` : undefined,
              }}
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
            return (
              <button
                key={c.id}
                type="button"
                disabled={!tocarPeca}
                onClick={tocarPeca && (() => tocarPeca(c.id))}
                className="absolute top-0 z-10"
                style={{ left: c.posicao * m, width: modulosOcupados(p) * m, height: altura }}
                aria-label={p.nome}
              >
                <PecaVisual peca={p} m={m} altura={altura} fases={c.fases} geral={c.geral} coresFase={coresFase} destaque={destaqueDe(c)} />
              </button>
            );
          })}
        {/* Espelho (tampa recortada) por cima dos bornes */}
        {comEspelho && (
          <>
            <div className="pointer-events-none absolute -inset-x-3 top-0 z-20 shadow-[0_2px_2px_rgba(0,0,0,.18)]" style={{ height: faixaTopo, background: corEspelho }} />
            <div
              className="pointer-events-none absolute -inset-x-3 z-20 shadow-[0_-2px_2px_rgba(0,0,0,.12)]"
              style={{ top: faixaBase, height: altura - faixaBase + 12 * escala, background: corEspelho }}
            />
          </>
        )}
        {/* Etiquetas da porta / do espelho */}
        {dados.componentes
          .filter((c) => c.fileira === f)
          .map((c) => {
            const p = peca(c.pecaId);
            if (!p) return null;
            const n = numeroCircuito(dados, c.circuitoId);
            return (
              <span
                key={`e${c.id}`}
                className="pointer-events-none absolute z-30 truncate rounded-sm bg-white px-0.5 text-center font-semibold text-[#111827] ring-1 ring-black/10"
                style={{
                  left: c.posicao * m + 2,
                  width: modulosOcupados(p) * m - 4,
                  top: comEspelho ? faixaBase + 4 * escala : altura + 2,
                  fontSize: 9 * escala,
                }}
              >
                {c.geral ? "GERAL" : n ? `${n}` : c.etiqueta || "—"}
              </span>
            );
          })}
      </div>
    );
  };

  // NEMA: colunas de disjuntores encaixados no barramento central.
  const colunas = linhas.map((l, i) => ({ l, i })).filter((x) => x.l.padrao === "NEMA");
  const passo = 50.8 * escala; // 25,4 mm
  const blocoNEMA = colunas.length > 0 && (
    <div className="relative flex">
      {colunas.map(({ l, i }, k) => (
        <div key={i} className="relative" style={{ width: larguraNEMA, height: l.modulos * passo, order: k === 0 ? 0 : 2 }}>
          {!comEspelho && (
            <span className="absolute -top-3.5 left-0 text-[#6b7280]" style={{ fontSize: 8 * escala }}>
              {l.nome}
            </span>
          )}
          {mapa[i].map((ocupante, p) =>
            ocupante ? null : (
              <button
                key={`v${p}`}
                type="button"
                disabled={!tocarVazio}
                onClick={tocarVazio && (() => tocarVazio(i, p))}
                className={`absolute z-10 grid place-items-center rounded-[3px] border border-dashed border-[#9aa1ab] bg-white/25 text-[#6b7280] ${
                  tocarVazio ? "hover:border-[#f59e0b] hover:bg-[#fde68a]/50" : ""
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
                  disabled={!tocarPeca}
                  onClick={tocarPeca && (() => tocarPeca(c.id))}
                  className="absolute left-0 z-10"
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
          {comEspelho && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 z-20"
                style={{ [k === 0 ? "left" : "right"]: 0, width: larguraNEMA * 0.3, background: corEspelho }}
              />
              <div
                className="pointer-events-none absolute inset-y-0 z-20"
                style={{ [k === 0 ? "right" : "left"]: 0, width: larguraNEMA * 0.12, background: corEspelho }}
              />
            </>
          )}
        </div>
      ))}
      <div
        className="relative rounded-sm bg-[linear-gradient(90deg,#92400e,#d97706,#92400e)] shadow-inner"
        style={{ width: 52 * escala, order: 1, background: comEspelho ? corEspelho : undefined }}
        title="Barramento de fases"
      >
        {!comEspelho && (
          <span className="absolute inset-x-0 top-1 text-center font-bold text-white" style={{ fontSize: 8 * escala }}>
            BARR.
          </span>
        )}
      </div>
    </div>
  );

  const barras = (vertical: boolean) =>
    comEspelho ? null : vertical ? (
      <>
        <BarraVertical cor="repeating-linear-gradient(0deg,#16a34a 0 10px,#facc15 10px 20px)" rotulo="PE" bornes={nBornes} escala={escala} lado="esq" />
        <BarraVertical cor="#2563eb" rotulo="N" bornes={nBornes} escala={escala} lado="dir" />
      </>
    ) : (
      <div className="space-y-2" style={{ marginTop: 22 * escala }}>
        <Barra cor="#2563eb" rotulo="N" bornes={nBornes} escala={escala} />
        <Barra cor="repeating-linear-gradient(90deg,#16a34a 0 10px,#facc15 10px 20px)" rotulo="PE" bornes={nBornes} escala={escala} />
      </div>
    );

  const conteudoLinhas = (
    <div className="flex flex-col" style={{ gap: (comEspelho ? 30 : 34) * escala }}>
      {linhas.map((l, f) => (l.auxiliar ? linhaDIN(f) : null))}
      {blocoNEMA}
      {linhas.map((l, f) => (l.padrao === "DIN" && !l.auxiliar ? linhaDIN(f) : null))}
    </div>
  );

  const knock = dados.modelo.saidaCabos === "cima" ? "top" : "bottom";
  const nKnock = Math.max(3, Math.min(8, Math.round(larguraLinhas / (60 * escala))));
  const raio = embutir ? 8 : 16;

  return (
    <div
      className="relative inline-block"
      style={{
        padding: (embutir ? 16 : 9) * escala,
        borderRadius: raio * escala,
        background: metal
          ? `linear-gradient(145deg, color-mix(in srgb, ${skin.corCaixa} 92%, #fff), color-mix(in srgb, ${skin.corCaixa} 70%, #000))`
          : `linear-gradient(145deg, #ffffff, ${skin.corCaixa})`,
        boxShadow: embutir ? "0 6px 14px -8px rgba(0,0,0,.45), inset 0 0 0 1px rgba(0,0,0,.12)" : "0 20px 32px -14px rgba(0,0,0,.6), inset 0 0 0 1px rgba(0,0,0,.15)",
      }}
    >
      {/* Parafusos de fixação */}
      {[
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ].map(([x, y], i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[radial-gradient(#e5e7eb,#6b7280)] ring-1 ring-black/30"
          style={{
            width: 7 * escala,
            height: 7 * escala,
            [x ? "right" : "left"]: (embutir ? 5 : 3) * escala,
            [y ? "bottom" : "top"]: (embutir ? 5 : 3) * escala,
          }}
        />
      ))}
      {/* Furos de entrada (knockouts) */}
      <div className="pointer-events-none absolute inset-x-0 flex justify-center" style={{ [knock]: -4 * escala, gap: 14 * escala }}>
        {Array.from({ length: nKnock }).map((_, i) => (
          <span key={i} className="rounded-full border border-black/30 bg-black/10" style={{ width: 11 * escala, height: 11 * escala }} />
        ))}
      </div>
      {skin.obra && (
        <div
          className="absolute inset-x-0 top-0 rounded-t-[inherit]"
          style={{ height: 8 * escala, background: "repeating-linear-gradient(45deg,#111827 0 8px,#facc15 8px 16px)" }}
        />
      )}

      <div
        className="relative overflow-visible rounded-[8px] shadow-[inset_0_2px_6px_rgba(0,0,0,.25)]"
        style={{
          padding: 14 * escala,
          background: comEspelho
            ? `linear-gradient(${corEspelho}, color-mix(in srgb, ${corEspelho} 92%, #000))`
            : metal
              ? "linear-gradient(#e5e7eb,#cbd5e1)"
              : "linear-gradient(#fafaf9,#e7e5e4)",
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-2" style={{ fontSize: 11 * escala }}>
          <span className="truncate rounded bg-white/85 px-2 py-0.5 font-bold text-[#111827] ring-1 ring-black/10">{nome || "QDC"}</span>
          <span className="flex items-center gap-1.5 text-[#4b5563]" style={{ fontSize: 9 * escala }}>
            {dados.modelo.padrao} · {metal ? "metálico" : "PVC"} · {dados.modelo.ip}
            <span className="rounded bg-[#fbbf24] px-1.5 py-0.5 font-black text-[#111827]">⚡ PERIGO</span>
          </span>
        </div>

        {lateral ? (
          <div className="flex items-stretch" style={{ gap: 14 * escala }}>
            {comEspelho ? <div style={{ width: 22 * escala }} /> : barras(true)}
            {conteudoLinhas}
          </div>
        ) : (
          <>
            {conteudoLinhas}
            {comEspelho ? <div style={{ height: 40 * escala }} /> : barras(false)}
          </>
        )}

        {vista === "montagem" && (
          <p className="mt-2 text-center font-medium text-[#6b7280]" style={{ fontSize: 8 * escala }}>
            {dados.modelo.saidaCabos === "cima" ? "▲ eletrodutos e circuitos saem por cima" : "▼ eletrodutos e circuitos saem por baixo"}
          </p>
        )}

        {vista === "porta" && <Porta skin={skin} escala={escala} nome={nome} aoAbrir={aoAbrirPorta} />}
      </div>
    </div>
  );
}

/** Porta fechada com o acabamento da linha (lisa, fumê, transparente ou chapa com fechadura). */
function Porta({
  skin,
  escala,
  nome,
  aoAbrir,
}: {
  skin: ReturnType<typeof linhaDoModelo>;
  escala: number;
  nome?: string;
  aoAbrir?: () => void;
}) {
  const vidro = skin.porta === "fume" || skin.porta === "transparente";
  const fundo =
    skin.porta === "fume"
      ? "linear-gradient(120deg, rgba(30,41,59,.62), rgba(51,65,85,.48) 45%, rgba(148,163,184,.35) 52%, rgba(30,41,59,.6))"
      : skin.porta === "transparente"
        ? "linear-gradient(120deg, rgba(191,219,254,.28), rgba(255,255,255,.12) 45%, rgba(255,255,255,.45) 50%, rgba(191,219,254,.2))"
        : skin.porta === "chapa"
          ? `linear-gradient(145deg, color-mix(in srgb, ${skin.corPorta} 96%, #fff), color-mix(in srgb, ${skin.corPorta} 82%, #000))`
          : `linear-gradient(145deg, #ffffff, ${skin.corPorta})`;
  return (
    <button
      type="button"
      onClick={aoAbrir}
      disabled={!aoAbrir}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center rounded-[8px] ring-1 ring-black/25"
      style={{ background: fundo, backdropFilter: vidro ? "blur(0.6px)" : undefined, boxShadow: "inset 0 0 0 3px rgba(255,255,255,.35)" }}
      aria-label="Abrir porta do quadro"
    >
      {skin.porta === "chapa" && (
        <div className="absolute left-1/2 top-[18%] -translate-x-1/2 space-y-1" style={{ width: "36%" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-full bg-black/25" style={{ height: 3 * escala }} />
          ))}
        </div>
      )}
      {!vidro && (
        <span className="rounded bg-white/90 px-2 py-0.5 font-bold text-[#111827] ring-1 ring-black/15" style={{ fontSize: 11 * escala }}>
          {nome || "QDC"}
        </span>
      )}
      <span className="mt-2 rounded bg-[#fbbf24] px-2 py-0.5 font-black text-[#111827] ring-1 ring-black/30" style={{ fontSize: 10 * escala }}>
        ⚡ PERIGO — RISCO DE CHOQUE
      </span>
      {skin.obra && (
        <span className="mt-1 rounded bg-white/90 px-2 py-0.5 font-semibold text-[#111827]" style={{ fontSize: 8 * escala }}>
          Quadro de obra — acesso só a pessoas autorizadas (NR-10 / NR-18)
        </span>
      )}
      {/* Puxador / fechadura */}
      <span
        className="absolute right-[5%] top-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(#9ca3af,#4b5563)] ring-1 ring-black/40"
        style={{ width: 9 * escala, height: 46 * escala }}
      />
      {skin.fechadura && (
        <span
          className="absolute right-[4.4%] top-[calc(50%+32px)] grid place-items-center rounded-full bg-[radial-gradient(#f3f4f6,#6b7280)] ring-1 ring-black/40"
          style={{ width: 16 * escala, height: 16 * escala }}
        >
          <span className="rounded-sm bg-black/70" style={{ width: 2.5 * escala, height: 8 * escala }} />
        </span>
      )}
      {aoAbrir && (
        <span className="absolute bottom-2 rounded-full bg-black/55 px-2 py-0.5 text-white" style={{ fontSize: 9 * escala }}>
          Toque para abrir a porta
        </span>
      )}
    </button>
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

/** Barra lateral (caixas verticais): PE à esquerda, N à direita. */
function BarraVertical({ cor, rotulo, bornes, escala, lado }: { cor: string; rotulo: string; bornes: number; escala: number; lado: "esq" | "dir" }) {
  return (
    <div className="flex flex-col items-center gap-1" style={{ order: lado === "esq" ? -1 : 9 }}>
      <span className="font-bold text-[#374151]" style={{ fontSize: 11 * escala }}>
        {rotulo}
      </span>
      <div className="flex flex-1 flex-col items-center justify-around rounded-[3px] py-1 shadow-sm" style={{ background: cor, width: 14 * escala }}>
        {Array.from({ length: bornes }).map((_, i) => (
          <span key={i} className="rounded-full border border-black/30 bg-[radial-gradient(#f3f4f6,#9ca3af)]" style={{ width: 8 * escala, height: 8 * escala }} />
        ))}
      </div>
    </div>
  );
}
