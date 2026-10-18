import type { QuadroDados } from "@/lib/eletrica/tipos";
import { QuadroVisual } from "./quadro-visual";

/** Prévia pequena do quadro para listas (sem interação). `pequena` = ícone de lista (~96×64). */
export function MiniaturaQuadro({ dados, pequena = false }: { dados: QuadroDados; pequena?: boolean }) {
  const largura = dados.modelo.padrao === "NEMA" ? 2 * 240 + 52 : dados.modelo.modulosPorFileira * 36;
  const escala = pequena ? Math.min(0.2, 96 / (largura + 60)) : Math.min(0.45, 260 / (largura + 60));
  return (
    <div className={`pointer-events-none flex items-center justify-center overflow-hidden ${pequena ? "h-16 w-24" : "h-36"}`}>
      <QuadroVisual dados={dados} escala={escala} vista="espelho" />
    </div>
  );
}
