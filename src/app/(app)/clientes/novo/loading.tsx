import { SkCabecalho, SkFormulario } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <SkCabecalho acao={false} />
      <SkFormulario campos={9} />
    </>
  );
}
