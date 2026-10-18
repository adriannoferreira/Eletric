import { Sk, SkCabecalho, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <SkCabecalho />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Sk key={i} className="h-10" />
        ))}
      </div>
      <Sk className="mb-4 h-32 w-full rounded-2xl" />
      <Sk className="mb-2 h-5 w-32" />
      <SkLista linhas={3} />
    </>
  );
}
