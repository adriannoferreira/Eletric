import { idadeDias, ROTULO_FONTE } from "@/lib/precos/regras";

const COR: Record<string, string> = {
  cotacao: "bg-ok-soft text-ok",
  ia: "bg-info-soft text-info",
  sinapi: "bg-accent-soft text-fg",
  manual: "bg-surface-2 text-muted",
  calculado: "bg-accent-soft text-fg",
};

/** Mostra de onde veio o preço e há quanto tempo ele foi atualizado. */
export function SeloPreco({
  fonte,
  data,
  validadeDias,
  semPreco,
}: {
  fonte: string;
  data: Date | string | null;
  validadeDias: number;
  semPreco?: boolean;
}) {
  if (semPreco) return <span className="badge bg-danger-soft text-danger">Sem preço</span>;
  const idade = fonte === "calculado" ? null : idadeDias(data);
  const velho = fonte !== "calculado" && (idade === null || idade > validadeDias);
  return (
    <span className="flex flex-wrap items-center gap-1">
      <span className={`badge ${COR[fonte] ?? COR.manual}`}>{ROTULO_FONTE[fonte] ?? fonte}</span>
      {fonte !== "calculado" && (
        <span className={`text-[11px] ${velho ? "font-semibold text-danger" : "text-muted"}`}>
          {idade === null ? "sem data" : idade === 0 ? "hoje" : `há ${idade} d`}
          {velho && " · desatualizado"}
        </span>
      )}
    </span>
  );
}
