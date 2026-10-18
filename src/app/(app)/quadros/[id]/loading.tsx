import { Sk, SkAbas, SkCards, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sk className="h-8 flex-1" />
        <Sk className="size-10" />
        <Sk className="size-10" />
        <Sk className="h-10 w-24" />
      </div>
      <SkCards />
      <div className="card overflow-hidden p-4">
        <div className="animate-pulse rounded-[18px] bg-surface-2 p-4">
          <div className="space-y-6 rounded-xl bg-surface p-4">
            {Array.from({ length: 2 }, (_, f) => (
              <div key={f} className="flex gap-1">
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={i} className="h-20 w-9 shrink-0 rounded-md bg-surface-2" />
                ))}
              </div>
            ))}
            <div className="h-3 rounded bg-surface-2" />
            <div className="h-3 rounded bg-surface-2" />
          </div>
        </div>
      </div>
      <SkAbas />
      <SkLista linhas={4} />
    </div>
  );
}
