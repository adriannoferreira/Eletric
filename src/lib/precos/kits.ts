import { arred } from "./regras";

export type ItemKit = {
  catalogoId: number | null;
  tipo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
};

export type ItemOrcamentoKit = {
  tipo: "servico" | "material";
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  grupo: string;
};

/**
 * Expande um kit em itens de orçamento: multiplica as quantidades pela quantidade
 * do kit e usa o preço atual do catálogo (0 quando o item não está no catálogo).
 */
export function expandirKit(
  kit: { nome: string; itens: ItemKit[] },
  quantidade: number,
  precos: Map<number, { preco: number; nome: string; unidade: string }>,
  grupo = quantidade === 1 ? kit.nome : `${kit.nome} (${quantidade}×)`,
): ItemOrcamentoKit[] {
  return kit.itens.map((i) => {
    const cat = i.catalogoId != null ? precos.get(i.catalogoId) : undefined;
    return {
      tipo: i.tipo === "servico" ? "servico" : "material",
      descricao: cat?.nome ?? i.descricao,
      quantidade: arred(i.quantidade * quantidade),
      unidade: cat?.unidade ?? i.unidade,
      precoUnitario: cat?.preco ?? 0,
      grupo,
    };
  });
}

export function custoKit(itens: ItemOrcamentoKit[]) {
  return arred(itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0));
}
