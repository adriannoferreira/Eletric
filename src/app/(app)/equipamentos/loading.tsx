import { Sk, SkCabecalho } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <SkCabecalho acao={false} />
      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3">
        <Sk className="h-20" />
        <Sk className="h-20" />
        <Sk className="col-span-2 h-11 md:col-span-1" />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Sk key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </>
  );
}
