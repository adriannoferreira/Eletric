import { Sk, SkCards, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Sk className="h-7 w-56" />
        <Sk className="h-4 w-72" />
      </div>
      <SkCards />
      <Sk className="h-56 w-full rounded-2xl" />
      <SkLista linhas={3} />
    </div>
  );
}
