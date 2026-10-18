import { SkAbas, SkCabecalho, SkFormulario } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <SkCabecalho acao={false} />
      <SkAbas />
      <SkFormulario campos={8} />
    </>
  );
}
