import { Sk, SkCabecalho } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <SkCabecalho acao={false} />
      <div className="mb-5 grid grid-cols-2 gap-2">
        <Sk className="h-11" />
        <Sk className="h-11" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Sk key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </>
  );
}
