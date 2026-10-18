import { Sk, SkCabecalho, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <SkCabecalho />
      <Sk className="mb-4 h-11 w-full" />
      <SkLista linhas={7} avatar />
    </>
  );
}
