import { SkAbas, SkCabecalho, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <SkCabecalho />
      <SkAbas />
      <SkLista linhas={6} />
    </>
  );
}
