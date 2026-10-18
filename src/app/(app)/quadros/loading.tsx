import { Sk, SkCabecalho } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <SkCabecalho />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card space-y-3 p-3">
            <Sk className="h-36 w-full" />
            <Sk className="h-4 w-3/5" />
            <Sk className="h-3 w-2/5" />
          </div>
        ))}
      </div>
    </>
  );
}
