import { Sk, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Sk className="h-4 w-32" />
        <Sk className="h-7 w-4/5" />
        <Sk className="h-4 w-28" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Sk key={i} className="h-10" />
        ))}
      </div>
      <Sk className="h-11 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Sk className="h-44 rounded-2xl" />
        <Sk className="h-44 rounded-2xl" />
      </div>
      <SkLista linhas={3} />
    </div>
  );
}
