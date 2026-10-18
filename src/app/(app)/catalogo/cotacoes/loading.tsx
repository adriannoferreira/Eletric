import { SkFormulario, SkLista } from "@/components/skeleton";

export default function Carregando() {
  return (
    <div className="space-y-4">
      <SkLista linhas={3} />
      <SkFormulario campos={3} />
    </div>
  );
}
