import { CalcPadraoEquatorial } from "@/components/normas/calc-padrao";
import { Cabecalho } from "@/components/ui";

export const metadata = { title: "Padrão de entrada — Equatorial PA" };

export default function CalculadoraPadraoPage() {
  return (
    <>
      <Cabecalho titulo="Padrão de entrada" subtitulo="Equatorial Pará — NT.00001 rev. 09" voltar="/normas" />
      <CalcPadraoEquatorial />
    </>
  );
}
