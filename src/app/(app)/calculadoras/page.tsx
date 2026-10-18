import { Cabecalho } from "@/components/ui";
import { Calculadoras } from "./calculadoras";

export const metadata = { title: "Calculadoras" };

export default function CalculadorasPage() {
  return (
    <>
      <Cabecalho titulo="Calculadoras" subtitulo="Dimensionamento rápido pela NBR 5410" />
      <Calculadoras />
    </>
  );
}
