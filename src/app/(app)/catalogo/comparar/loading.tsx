import { Sk, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Sk className="h-20" />
        <Sk className="h-20" />
        <Sk className="h-20" />
      </div>
      <Sk className="h-11 w-full" />
      <SkLista linhas={6} />
    </div>
  );
}
