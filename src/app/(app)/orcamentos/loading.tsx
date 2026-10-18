import { SkAbas, SkCabecalho, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <SkCabecalho />
      <SkAbas n={5} />
      <SkLista linhas={7} />
    </>
  );
}
