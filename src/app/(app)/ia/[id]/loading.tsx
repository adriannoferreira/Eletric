import { Sk } from "@/components/skeleton";

export default function Carregando() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Sk className="size-10 rounded-2xl" />
        <div className="space-y-2">
          <Sk className="h-5 w-56" />
          <Sk className="h-3.5 w-44" />
        </div>
      </div>
      <div className="flex justify-end">
        <Sk className="h-12 w-3/5 rounded-2xl" />
      </div>
      <Sk className="h-40 w-full rounded-2xl" />
      <div className="flex justify-end">
        <Sk className="h-10 w-2/5 rounded-2xl" />
      </div>
      <Sk className="h-28 w-full rounded-2xl" />
    </div>
  );
}
