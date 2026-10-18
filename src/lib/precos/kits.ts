import { arred } from "./regras";
import {
  type Atributos,
  type Especificacao,
  ehFamilia,
  especificacaoCompleta,
  type ItemComVariante,
  limparAtributos,
  nomeVariante,
  resolverVariante,
} from "./variantes";

export type ItemKit = {
  id?: number;
  catalogoId: number | null;
  tipo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  /** Material parametrizável: família + atributos fixos + variáveis (com valor sugerido). */
  familia?: string | null;
  atributos?: Record<string, string | number> | null;
  variaveis?: Record<string, string | number> | null;
};

export type ItemOrcamentoKit = {
  tipo: "servico" | "material";
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  grupo: string;
  /** Variante pedida que não existe no catálogo (o usuário pode criá-la). */
  varianteFaltando?: Especificacao;
};

type PrecoCatalogo = { preco: number; nome: string; unidade: string } & Partial<ItemComVariante>;

/** Especificação de um item de kit, com as escolhas do usuário por cima das sugestões. */
export function especificacaoDoItemKit(i: ItemKit, escolhas?: Atributos): Especificacao | null {
  if (!ehFamilia(i.familia)) return null;
  return {
    familia: i.familia,
    atributos: limparAtributos(i.familia, { ...(i.atributos ?? {}), ...(i.variaveis ?? {}), ...(escolhas ?? {}) }),
  };
}

/**
 * Expande um kit em itens de orçamento: multiplica as quantidades pela quantidade
 * do kit e usa o preço atual do catálogo (0 quando o item não está no catálogo).
 * Materiais parametrizáveis (ex.: disjuntor com corrente do circuito) são resolvidos
 * para a variante exata do catálogo — nunca o preço de outra corrente/seção.
 */
export function expandirKit(
  kit: { nome: string; itens: ItemKit[] },
  quantidade: number,
  precos: Map<number, PrecoCatalogo>,
  grupo = quantidade === 1 ? kit.nome : `${kit.nome} (${quantidade}×)`,
  escolhas: Record<number, Atributos> = {},
): ItemOrcamentoKit[] {
  const catalogo = [...precos.values()].filter((c): c is PrecoCatalogo & ItemComVariante => typeof c.tipo === "string");
  return kit.itens.map((i, n) => {
    const base = {
      tipo: (i.tipo === "servico" ? "servico" : "material") as "servico" | "material",
      quantidade: arred(i.quantidade * quantidade),
      grupo,
    };
    const espec = especificacaoDoItemKit(i, escolhas[i.id ?? n]);
    if (espec) {
      const r = especificacaoCompleta(espec) ? resolverVariante(catalogo, espec) : null;
      if (r?.status === "ok") {
        return { ...base, descricao: r.item.nome, unidade: r.item.unidade, precoUnitario: r.item.preco };
      }
      return { ...base, descricao: nomeVariante(espec), unidade: i.unidade, precoUnitario: 0, varianteFaltando: espec };
    }
    const cat = i.catalogoId != null ? precos.get(i.catalogoId) : undefined;
    return {
      ...base,
      descricao: cat?.nome ?? i.descricao,
      unidade: cat?.unidade ?? i.unidade,
      precoUnitario: cat?.preco ?? 0,
    };
  });
}

export function custoKit(itens: ItemOrcamentoKit[]) {
  return arred(itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0));
}
