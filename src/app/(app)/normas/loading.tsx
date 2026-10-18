import { Sk, SkCabecalho, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <SkCabecalho acao={false} />
      <Sk className="mb-4 h-10 w-full" />
      <Sk className="mb-4 h-20 w-full rounded-2xl" />
      <SkLista linhas={6} />
    </>
  );
}
