import { Sk, SkCabecalho } from "@/components/skeleton";

export default function Carregando() {
  return (
    <div className="space-y-4">
      <SkCabecalho />
      <div className="card space-y-3 p-6">
        <Sk className="h-6 w-1/2" />
        <Sk className="h-4 w-1/3" />
        <Sk className="h-48 w-full" />
        <Sk className="h-4 w-full" />
        <Sk className="h-4 w-5/6" />
      </div>
    </div>
  );
}
