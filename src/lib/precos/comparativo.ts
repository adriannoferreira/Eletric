/**
 * Comparativo de preços entre lojas: para uma lista de itens (orçamento, compras de um
 * quadro, padrão de entrada ou seleção manual), cruza o preço mais recente de cada
 * item em cada loja e calcula a melhor combinação × comprar tudo numa loja só.
 */
import { converterPreco, inferirVariante, type ItemComVariante, normalizarTexto, resolverVariante } from "./variantes";

export const DIA = 86_400_000;

export type ItemComparar = {
  chave: string;
  catalogoId: number | null;
  descricao: string;
  quantidade: number;
  unidade: string;
};

export type PrecoLojaEntrada = {
  catalogoId: number;
  loja: string;
  fornecedorId: number | null;
  /** Preço na unidade do item do catálogo. */
  preco: number;
  unidadeCatalogo: string;
  fonte: string;
  data: Date | string;
  url?: string;
};

export type CelulaLoja = { preco: number; subtotal: number; idadeDias: number; velho: boolean; fonte: string; url?: string };

export type LinhaComparativo = {
  item: ItemComparar;
  porLoja: Record<string, CelulaLoja>;
  /** Loja com o menor preço (entre as que têm o item). */
  menor: string | null;
};

export type ResumoLoja = {
  loja: string;
  fornecedorId: number | null;
  total: number;
  itensCom: number;
  itensFaltando: number;
  desatualizados: number;
};

export type Comparativo = {
  lojas: ResumoLoja[];
  linhas: LinhaComparativo[];
  /** Comprar cada item na loja mais barata. */
  melhorCombinacao: { total: number; itensCobertos: number; faltando: string[]; porLoja: Record<string, { itens: number; total: number }> };
  /** A loja mais barata entre as que têm mais itens. */
  lojaUnica: { loja: string; total: number; faltando: string[] } | null;
  /** Quanto a melhor combinação economiza em relação à loja única, nos mesmos itens. */
  economia: { valor: number; percentual: number } | null;
};

const arred = (v: number) => Math.round(v * 100) / 100;

export const chaveLoja = (loja: string) => normalizarTexto(loja).replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Monta o comparativo. Só o preço mais recente de cada item em cada loja é usado;
 * preços mais velhos que `validadeDias` aparecem marcados como desatualizados.
 */
export function montarComparativo(
  itens: ItemComparar[],
  precos: PrecoLojaEntrada[],
  { validadeDias = 60, agora = new Date() }: { validadeDias?: number; agora?: Date } = {},
): Comparativo {
  // Mais recente por (item, loja)
  const recentes = new Map<string, PrecoLojaEntrada>();
  const nomes = new Map<string, { loja: string; fornecedorId: number | null }>();
  for (const p of precos) {
    const k = chaveLoja(p.loja);
    if (!k) continue;
    const id = `${p.catalogoId}|${k}`;
    const atual = recentes.get(id);
    if (!atual || new Date(p.data).getTime() > new Date(atual.data).getTime()) recentes.set(id, p);
    const n = nomes.get(k);
    if (!n || (p.fornecedorId && !n.fornecedorId)) nomes.set(k, { loja: p.loja.trim(), fornecedorId: p.fornecedorId });
  }

  const linhas: LinhaComparativo[] = itens.map((item) => {
    const porLoja: Record<string, CelulaLoja> = {};
    if (item.catalogoId != null) {
      for (const [k] of nomes) {
        const p = recentes.get(`${item.catalogoId}|${k}`);
        if (!p) continue;
        const preco = item.unidade && p.unidadeCatalogo && item.unidade !== p.unidadeCatalogo
          ? converterPreco(p.preco, p.unidadeCatalogo, item.unidade)
          : p.preco;
        if (preco == null || preco <= 0) continue;
        const idadeDias = Math.max(0, Math.floor((agora.getTime() - new Date(p.data).getTime()) / DIA));
        porLoja[k] = {
          preco: arred(preco),
          subtotal: arred(preco * item.quantidade),
          idadeDias,
          velho: idadeDias > validadeDias,
          fonte: p.fonte,
          url: p.url,
        };
      }
    }
    const menor = Object.entries(porLoja).sort((a, b) => a[1].preco - b[1].preco)[0]?.[0] ?? null;
    return { item, porLoja, menor };
  });

  const lojas: ResumoLoja[] = [...nomes].map(([k, n]) => {
    const com = linhas.filter((l) => l.porLoja[k]);
    return {
      loja: n.loja,
      fornecedorId: n.fornecedorId,
      total: arred(com.reduce((s, l) => s + l.porLoja[k].subtotal, 0)),
      itensCom: com.length,
      itensFaltando: linhas.length - com.length,
      desatualizados: com.filter((l) => l.porLoja[k].velho).length,
    };
  });
  const nomeDe = (k: string) => nomes.get(k)?.loja ?? k;

  const porLojaComb: Record<string, { itens: number; total: number }> = {};
  let totalComb = 0;
  const faltandoComb: string[] = [];
  for (const l of linhas) {
    if (!l.menor) {
      faltandoComb.push(l.item.descricao);
      continue;
    }
    const c = l.porLoja[l.menor];
    totalComb += c.subtotal;
    const nome = nomeDe(l.menor);
    porLojaComb[nome] = { itens: (porLojaComb[nome]?.itens ?? 0) + 1, total: arred((porLojaComb[nome]?.total ?? 0) + c.subtotal) };
  }

  const maxItens = Math.max(0, ...lojas.map((l) => l.itensCom));
  const candidatas = lojas.filter((l) => maxItens > 0 && l.itensCom === maxItens).sort((a, b) => a.total - b.total);
  const unica = candidatas[0] ?? null;
  const kUnica = unica ? chaveLoja(unica.loja) : null;
  const lojaUnica = unica
    ? { loja: unica.loja, total: unica.total, faltando: linhas.filter((l) => !l.porLoja[kUnica!]).map((l) => l.item.descricao) }
    : null;

  let economia: Comparativo["economia"] = null;
  if (unica && kUnica) {
    // Mesma base: só os itens que a loja única tem.
    const base = linhas.filter((l) => l.porLoja[kUnica]);
    const comb = base.reduce((s, l) => s + l.porLoja[l.menor!].subtotal, 0);
    const valor = arred(unica.total - comb);
    economia = { valor, percentual: unica.total > 0 ? Math.round((valor / unica.total) * 1000) / 10 : 0 };
  }

  return {
    lojas: lojas.sort((a, b) => b.itensCom - a.itensCom || a.total - b.total),
    linhas,
    melhorCombinacao: { total: arred(totalComb), itensCobertos: linhas.length - faltandoComb.length, faltando: faltandoComb, porLoja: porLojaComb },
    lojaUnica,
    economia,
  };
}

/** Liga uma descrição livre (orçamento, compras) ao item do catálogo: nome igual ou variante exata. */
export function casarComCatalogo<T extends ItemComVariante & { id: number }>(descricao: string, catalogo: T[]): T | null {
  const n = normalizarTexto(descricao.replace(/\s*\[definir preço\]\s*$/i, ""));
  const igual = catalogo.find((c) => normalizarTexto(c.nome) === n);
  if (igual) return igual;
  const v = inferirVariante(descricao);
  if (!v) return null;
  const r = resolverVariante(catalogo, v);
  return r.status === "ok" ? r.item : null;
}

/** Mensagem de WhatsApp pedindo cotação de uma lista de itens. */
export function mensagemCotacao(loja: string, itens: { descricao: string; quantidade: number; unidade: string }[]) {
  const linhas = itens.map((i) => `• ${String(i.quantidade).replace(".", ",")} ${i.unidade} — ${i.descricao}`);
  return `Olá${loja ? `, ${loja}` : ""}! Poderiam me passar preço e disponibilidade destes itens?\n\n${linhas.join("\n")}\n\nObrigado!`;
}
