import type { QuadroDados } from "@/lib/eletrica/tipos";
import { QuadroVisual } from "./quadro-visual";

/** Prévia pequena do quadro para listas (sem interação). */
export function MiniaturaQuadro({ dados }: { dados: QuadroDados }) {
  const largura = dados.modelo.padrao === "NEMA" ? 2 * 240 + 52 : dados.modelo.modulosPorFileira * 36;
  const escala = Math.min(0.45, 260 / (largura + 60));
  return (
    <div className="pointer-events-none flex h-36 items-center justify-center overflow-hidden">
      <QuadroVisual dados={dados} escala={escala} vista="espelho" />
    </div>
  );
}
