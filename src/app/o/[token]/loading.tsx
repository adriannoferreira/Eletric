import { Sk } from "@/components/skeleton";

export default function Carregando() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:py-10">
      <div className="card overflow-hidden">
        <Sk className="h-28 w-full rounded-none" />
        <div className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Sk className="h-12" />
            <Sk className="h-12" />
          </div>
          {Array.from({ length: 4 }, (_, i) => (
            <Sk key={i} className="h-8 w-full" />
          ))}
          <Sk className="ml-auto h-10 w-48" />
          <Sk className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
