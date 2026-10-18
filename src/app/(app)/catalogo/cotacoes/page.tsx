import { desc, eq, inArray } from "drizzle-orm";
import { Cotacoes } from "@/components/precos/cotacoes";
import { catalogo, clientes, db, fornecedores, orcamentoItens, orcamentos } from "@/db";
import { iaConfigurada } from "@/lib/ia/claude";
import { desatualizado } from "@/lib/precos/regras";
import { obterConfig } from "@/lib/precos/servidor";

export const metadata = { title: "Cotações" };

export default async function CotacoesPage() {
  const [config, lojas, materiais, orcs] = await Promise.all([
    obterConfig(),
    db.select().from(fornecedores).orderBy(fornecedores.nome),
    db.select().from(catalogo).where(eq(catalogo.tipo, "material")).orderBy(catalogo.categoria, catalogo.nome),
    db
      .select({ id: orcamentos.id, titulo: orcamentos.titulo, cliente: clientes.nome })
      .from(orcamentos)
      .innerJoin(clientes, eq(clientes.id, orcamentos.clienteId))
      .orderBy(desc(orcamentos.atualizadoEm))
      .limit(20),
  ]);
  const itensOrc = orcs.length
    ? await db
        .select()
        .from(orcamentoItens)
        .where(inArray(orcamentoItens.orcamentoId, orcs.map((o) => o.id)))
    : [];

  return (
    <Cotacoes
      iaLigada={iaConfigurada()}
      lojas={lojas}
      catalogo={materiais.map((m) => ({ id: m.id, nome: m.nome, unidade: m.unidade, tipo: m.tipo }))}
      desatualizados={materiais
        .filter((m) => m.ativo && (m.preco <= 0 || desatualizado(m.precoAtualizadoEm, config.validadeDias)))
        .map((m) => ({ descricao: m.nome, quantidade: null, unidade: m.unidade }))}
      orcamentos={orcs.map((o) => ({
        ...o,
        itens: itensOrc
          .filter((i) => i.orcamentoId === o.id && i.tipo === "material")
          .map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, unidade: i.unidade })),
      }))}
    />
  );
}
