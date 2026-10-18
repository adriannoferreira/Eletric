import { Sk, SkCabecalho, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <SkCabecalho acao={false} />
      <div className="mb-4 flex justify-between">
        <Sk className="h-10 w-56" />
        <Sk className="h-10 w-28" />
      </div>
      <Sk className="mb-2 h-3 w-24" />
      <SkLista linhas={5} />
      <Sk className="mb-2 mt-4 h-3 w-24" />
      <SkLista linhas={4} />
    </>
  );
}
