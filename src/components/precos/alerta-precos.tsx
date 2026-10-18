import { and, count, eq, isNull, lt, or } from "drizzle-orm";
import { ChevronRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { catalogo, db, sugestoesPreco } from "@/db";
import { DIA_MS } from "@/lib/precos/regras";
import { obterConfig } from "@/lib/precos/servidor";

const corteValidade = (dias: number) => new Date(Date.now() - dias * DIA_MS);

/** Aviso na tela Início: sugestões de preço para aprovar ou muitos preços vencidos. */
export async function AlertaPrecos() {
  const config = await obterConfig();
  const corte = corteValidade(config.validadeDias);
  const [[{ pendentes }], [{ velhos }], [{ total }]] = await Promise.all([
    db.select({ pendentes: count() }).from(sugestoesPreco).where(eq(sugestoesPreco.status, "pendente")),
    db
      .select({ velhos: count() })
      .from(catalogo)
      .where(
        and(
          eq(catalogo.ativo, true),
          eq(catalogo.precoFixo, true),
          or(isNull(catalogo.precoAtualizadoEm), lt(catalogo.precoAtualizadoEm, corte), eq(catalogo.preco, 0)),
        ),
      ),
    db.select({ total: count() }).from(catalogo).where(eq(catalogo.ativo, true)),
  ]);
  // "Muitos" = pelo menos 5 itens ou 20% do catálogo.
  const muitosVelhos = velhos >= 5 || (total > 0 && velhos / total >= 0.2);
  if (!pendentes && !muitosVelhos) return null;

  const texto = [
    pendentes > 0 && `${pendentes} sugestão(ões) de preço para aprovar`,
    muitosVelhos && `${velhos} preço(s) desatualizado(s) ou sem preço`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={pendentes ? "/catalogo/precos" : "/catalogo"} className="flex items-center gap-3 rounded-2xl bg-accent-soft p-4">
      <RefreshCw className="size-5 shrink-0 text-accent" />
      <span className="flex-1 text-sm font-medium">{texto}</span>
      <ChevronRight className="size-4" />
    </Link>
  );
}
