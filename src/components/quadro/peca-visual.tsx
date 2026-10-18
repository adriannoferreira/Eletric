import type { Peca } from "@/lib/eletrica/pecas";
import type { Fase } from "@/lib/eletrica/tipos";
import { COR_FASE } from "./montagem";

export type DestaquePeca = "ok" | "aviso" | "erro" | "selecionado" | null;

/**
 * Desenho de uma peça DIN em proporção real (largura = módulos × `m` px).
 * Feito em HTML/CSS para ficar nítido em qualquer zoom.
 */
export function PecaVisual({
  peca,
  m,
  altura,
  fases,
  geral,
  destaque,
}: {
  peca: Peca;
  m: number;
  altura: number;
  fases: Fase[];
  geral?: boolean;
  destaque?: DestaquePeca;
}) {
  const largura = peca.modulos * m;
  const polos = peca.tipo === "dps" ? 1 : peca.polos;
  const larguraPolo = largura / polos;
  const anel =
    destaque === "selecionado"
      ? "0 0 0 3px #fbbf24"
      : destaque === "erro"
        ? "0 0 0 2px #ef4444"
        : destaque === "aviso"
          ? "0 0 0 2px #f59e0b"
          : "none";
  const fs = Math.max(8, m * 0.3);

  const cores = {
    disjuntor: { alavanca: "#1f2937", corpo: "linear-gradient(#fbfbfc, #e4e6ea)" },
    dr: { alavanca: "#1e3a8a", corpo: "linear-gradient(#fbfbfc, #e4e6ea)" },
    dps: { alavanca: "#4b5563", corpo: "linear-gradient(#e5e7eb, #cfd3d9)" },
    seccionadora: { alavanca: "#b91c1c", corpo: "linear-gradient(#fbfbfc, #e4e6ea)" },
  }[peca.tipo];

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-[3px] border border-[#9aa1ab] text-[#111827]"
      style={{ width: largura, height: altura, background: cores.corpo, boxShadow: anel }}
    >
      {/* Faixa de fases no topo (indica o pente/barramento ligado) */}
      <div className="flex h-[5%] min-h-1">
        {Array.from({ length: polos }).map((_, i) => (
          <div key={i} style={{ width: larguraPolo, background: fases[i] ? COR_FASE[fases[i]] : "#cbd5e1" }} />
        ))}
      </div>
      {/* Bornes superiores */}
      <Bornes polos={polos} larguraPolo={larguraPolo} />
      {/* Janela de identificação */}
      <div
        className="mx-[6%] mt-[3%] flex items-center justify-center rounded-[2px] bg-white font-bold leading-none tracking-tight"
        style={{ height: altura * 0.14, fontSize: fs * 1.15 }}
      >
        {peca.tipo === "dps" ? "DPS" : peca.tipo === "dr" ? "DR" : peca.rotulo}
      </div>
      {/* Alavancas */}
      <div className="flex flex-1 items-center">
        {peca.tipo === "dps" ? (
          <div className="flex w-full flex-col items-center gap-[6%]">
            <div className="rounded-[2px] border border-[#6b7280] bg-[#22c55e]" style={{ width: largura * 0.5, height: altura * 0.08 }} />
            <span className="font-semibold" style={{ fontSize: fs * 0.85 }}>{peca.rotulo}</span>
          </div>
        ) : (
          <div className="relative flex w-full items-center justify-center">
            <div
              className="rounded-[3px] shadow-[inset_0_-3px_0_rgba(0,0,0,.35)]"
              style={{ width: Math.min(largura * 0.8, m * 0.55 * polos + m * 0.25 * (polos - 1)), height: altura * 0.2, background: cores.alavanca }}
            />
            {peca.tipo === "dr" && (
              <span
                className="absolute grid place-items-center rounded-full bg-[#facc15] font-bold text-[#1f2937]"
                style={{ right: largura * 0.06, top: -altura * 0.14, width: m * 0.38, height: m * 0.38, fontSize: fs * 0.8 }}
              >
                T
              </span>
            )}
          </div>
        )}
      </div>
      {/* Dados técnicos */}
      <div className="text-center font-medium leading-tight text-[#374151]" style={{ fontSize: fs * 0.75 }}>
        {peca.tipo === "dr" ? `${peca.correnteNominal}A 30mA` : peca.tipo === "dps" ? `${peca.ucV}V` : `${peca.polos}P`}
      </div>
      <Bornes polos={polos} larguraPolo={larguraPolo} />
      {geral && (
        <span
          className="absolute left-1/2 top-[7%] -translate-x-1/2 rounded-sm bg-[#fbbf24] px-1 font-black text-[#1a1400]"
          style={{ fontSize: fs * 0.6 }}
        >
          GERAL
        </span>
      )}
    </div>
  );
}

function Bornes({ polos, larguraPolo }: { polos: number; larguraPolo: number }) {
  return (
    <div className="flex py-[4%]">
      {Array.from({ length: polos }).map((_, i) => (
        <div key={i} className="flex justify-center" style={{ width: larguraPolo }}>
          <span
            className="rounded-full border border-[#6b7280] bg-[radial-gradient(#d1d5db,#9ca3af)]"
            style={{ width: larguraPolo * 0.32, height: larguraPolo * 0.32 }}
          />
        </div>
      ))}
    </div>
  );
}
