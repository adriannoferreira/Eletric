import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, fornecedores, orcamentoItens, orcamentos, quadros } from "@/db";
import { montarListaCompras } from "@/lib/eletrica/compras";
import { varianteDaPeca } from "@/lib/eletrica/orcamento-quadro";
import { lerQuadro } from "@/lib/eletrica/tipos";
import { casarComCatalogo, type ItemComparar, type PrecoLojaEntrada } from "./comparativo";
import { catalogoComPrecos, obterConfig, precosPorLoja } from "./servidor";
import { type Especificacao, resolverVariante } from "./variantes";

export type OrigemComparativo =
  | { tipo: "orcamento"; id: number; titulo: string }
  | { tipo: "quadro"; id: number; titulo: string }
  | { tipo: "manual" };

/** Carrega tudo o que a tela "Comparar lojas" precisa para uma origem. */
export async function dadosComparativo(origem: { orcamento?: number; quadro?: number }) {
  const [catalogoTodo, lojas, config] = await Promise.all([
    catalogoComPrecos(true),
    db.select().from(fornecedores).orderBy(asc(fornecedores.nome)),
    obterConfig(),
  ]);
  const materiais = catalogoTodo.filter((c) => c.tipo === "material");
  let itens: ItemComparar[] = [];
  let info: OrigemComparativo = { tipo: "manual" };

  if (origem.orcamento) {
    const [o] = await db.select().from(orcamentos).where(eq(orcamentos.id, origem.orcamento));
    if (o) {
      const linhas = await db
        .select()
        .from(orcamentoItens)
        .where(eq(orcamentoItens.orcamentoId, o.id))
        .orderBy(asc(orcamentoItens.ordem));
      itens = linhas
        .filter((l) => l.tipo === "material")
        .map((l) => ({
          chave: String(l.id),
          catalogoId: casarComCatalogo(l.descricao, materiais)?.id ?? null,
          descricao: l.descricao.replace(/\s*\[definir preço\]\s*$/i, ""),
          quantidade: l.quantidade,
          unidade: l.unidade,
        }));
      info = { tipo: "orcamento", id: o.id, titulo: o.titulo };
    }
  } else if (origem.quadro) {
    const [q] = await db.select().from(quadros).where(eq(quadros.id, origem.quadro));
    if (q) {
      const lista = montarListaCompras(lerQuadro(q.dados), materiais);
      itens = lista.itens.map((i) => {
        let espec: Especificacao | null = null;
        if (i.chave.startsWith("peca:")) espec = varianteDaPeca(i.chave.slice(5));
        const cabo = i.chave.match(/^(?:cabo|interno):([\d.]+):(?:[^:]*:)?(.+)$/);
        if (cabo) espec = { familia: "cabo_flexivel", atributos: { secao: Number(cabo[1]), cor: cabo[2] } };
        const r = espec ? resolverVariante(materiais, espec) : null;
        return {
          chave: i.chave,
          catalogoId: r?.status === "ok" ? r.item.id : espec ? null : (casarComCatalogo(i.descricao, materiais)?.id ?? null),
          descricao: i.descricao,
          quantidade: i.quantidade,
          unidade: i.unidade,
        };
      });
      info = { tipo: "quadro", id: q.id, titulo: q.nome };
    }
  }

  const ids = [...new Set(materiais.map((m) => m.id))];
  const precos = await precosPorLoja(ids);
  const unidade = new Map(materiais.map((m) => [m.id, m.unidade]));
  const entradas: PrecoLojaEntrada[] = precos.map((p) => ({
    catalogoId: p.catalogoId,
    loja: p.loja,
    fornecedorId: p.fornecedorId,
    preco: p.preco,
    unidadeCatalogo: unidade.get(p.catalogoId) ?? "un",
    fonte: p.fonte,
    data: p.criadoEm.toISOString(),
    url: p.url,
  }));

  return {
    origem: info,
    itens,
    precos: entradas,
    lojas: lojas.map((l) => ({ id: l.id, nome: l.nome, whatsapp: l.whatsapp })),
    catalogo: materiais.map((m) => ({ id: m.id, nome: m.nome, unidade: m.unidade, familia: m.familia, atributos: m.atributos, tipo: m.tipo, preco: m.preco })),
    validadeDias: config.validadeDias,
  };
}
