import { Sk, SkCards, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Sk className="h-4 w-32" />
        <Sk className="h-7 w-52" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Sk key={i} className="h-24" />
        ))}
      </div>
      <SkCards />
      <SkLista linhas={4} />
    </div>
  );
}
