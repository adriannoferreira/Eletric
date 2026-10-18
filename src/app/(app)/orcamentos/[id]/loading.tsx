import { Sk, SkAbas } from "@/components/skeleton";

export default function Carregando() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Sk className="h-4 w-36" />
        <Sk className="h-8 w-4/5" />
        <Sk className="h-4 w-28" />
      </div>
      <SkAbas />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="card space-y-3 p-3">
          <div className="flex gap-2">
            <Sk className="size-8 shrink-0" />
            <Sk className="h-5 flex-1" />
          </div>
          <div className="grid grid-cols-3 gap-2 pl-10">
            <Sk className="h-9" />
            <Sk className="h-9" />
            <Sk className="h-9" />
          </div>
        </div>
      ))}
      <Sk className="h-36 w-full rounded-2xl" />
    </div>
  );
}
