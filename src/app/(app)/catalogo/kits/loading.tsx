import { Sk, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Sk className="h-10 w-32" />
      </div>
      <SkLista linhas={6} />
    </>
  );
}
