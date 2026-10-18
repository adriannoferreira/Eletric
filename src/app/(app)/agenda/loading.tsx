import { Sk, SkCabecalho } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <SkCabecalho />
      <div className="mb-4 flex justify-between">
        <Sk className="h-10 w-56" />
        <Sk className="h-10 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card flex gap-3 p-3.5">
            <Sk className="h-10 w-14" />
            <div className="flex-1 space-y-2">
              <Sk className="h-4 w-3/5" />
              <Sk className="h-3 w-2/5" />
              <Sk className="h-7 w-40" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
