import type { QuadroDados } from "@/lib/eletrica/tipos";
import { QuadroVisual } from "./quadro-visual";

/** Prévia pequena do quadro para listas (sem interação). */
export function MiniaturaQuadro({ dados }: { dados: QuadroDados }) {
  const escala = Math.min(0.45, 260 / (dados.modelo.modulosPorFileira * 36 + 60));
  return (
    <div className="pointer-events-none flex h-36 items-center justify-center overflow-hidden">
      <QuadroVisual dados={dados} escala={escala} />
    </div>
  );
}
