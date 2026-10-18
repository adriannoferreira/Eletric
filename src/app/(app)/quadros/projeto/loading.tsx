import { Sk, SkCabecalho, SkFormulario } from "@/components/skeleton";

export default function Carregando() {
  return (
    <div className="space-y-4">
      <SkCabecalho acao={false} />
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <Sk key={i} className="h-9" />
        ))}
      </div>
      <SkFormulario campos={8} />
    </div>
  );
}
