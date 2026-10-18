import { Sk, SkFormulario, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <div className="space-y-6">
      <Sk className="h-32" />
      <SkLista linhas={3} />
      <Sk className="h-24" />
      <SkFormulario campos={6} />
    </div>
  );
}
