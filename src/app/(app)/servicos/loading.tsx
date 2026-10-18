import { Sk, SkAbas, SkCabecalho } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <SkCabecalho acao={false} />
      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Sk key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
      <Sk className="mb-3 h-11 w-full" />
      <SkAbas n={5} />
      <div className="grid gap-2 md:grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Sk key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </>
  );
}
