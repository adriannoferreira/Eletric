import { describe, expect, it } from "vitest";
import { casarComCatalogo, montarComparativo, type PrecoLojaEntrada } from "./comparativo";

const agora = new Date("2026-10-18T12:00:00Z");
const dias = (n: number) => new Date(agora.getTime() - n * 86_400_000);

const itens = [
  { chave: "a", catalogoId: 1, descricao: "Disjuntor DIN 1P curva C 20 A", quantidade: 4, unidade: "un" },
  { chave: "b", catalogoId: 2, descricao: "Cabo flexível 2,5 mm² 750 V", quantidade: 100, unidade: "m" },
  { chave: "c", catalogoId: 3, descricao: "DR 2P 40 A 30 mA", quantidade: 1, unidade: "un" },
];

const p = (catalogoId: number, loja: string, preco: number, d = 1, unidadeCatalogo = "un"): PrecoLojaEntrada => ({
  catalogoId,
  loja,
  fornecedorId: null,
  preco,
  unidadeCatalogo,
  fonte: "cotacao",
  data: dias(d),
});

describe("montarComparativo", () => {
  const precos = [
    p(1, "Loja A", 15),
    p(1, "Loja B", 12),
    p(2, "Loja A", 3, 1, "m"),
    p(2, "Loja B", 3.5, 1, "m"),
    p(3, "Loja A", 170),
    // B não tem DR
  ];
  const c = montarComparativo(itens, precos, { agora });

  it("melhor combinação pega o menor preço de cada item", () => {
    // 4×12 (B) + 100×3 (A) + 170 (A)
    expect(c.melhorCombinacao.total).toBe(48 + 300 + 170);
    expect(c.melhorCombinacao.porLoja["Loja B"]).toEqual({ itens: 1, total: 48 });
    expect(c.melhorCombinacao.faltando).toEqual([]);
  });

  it("loja única é a que tem mais itens; economia na mesma base", () => {
    expect(c.lojaUnica).toEqual({ loja: "Loja A", total: 60 + 300 + 170, faltando: [] });
    expect(c.economia).toEqual({ valor: 12, percentual: 2.3 });
  });

  it("conta itens faltantes por loja", () => {
    const b = c.lojas.find((l) => l.loja === "Loja B")!;
    expect(b.itensFaltando).toBe(1);
    expect(c.linhas[2].menor).not.toBeNull();
  });

  it("usa só o preço mais recente e marca os velhos", () => {
    const r = montarComparativo([itens[0]], [p(1, "Loja A", 10, 90), p(1, "loja a", 14, 5), p(1, "Loja C", 9, 80)], { agora, validadeDias: 60 });
    expect(r.linhas[0].porLoja["loja a"].preco).toBe(14);
    expect(r.linhas[0].porLoja["loja c"].velho).toBe(true);
    expect(r.linhas[0].menor).toBe("loja c");
  });

  it("converte unidade (preço do catálogo por metro × item em rolo)", () => {
    const r = montarComparativo(
      [{ chave: "x", catalogoId: 2, descricao: "Cabo", quantidade: 2, unidade: "rolo 100 m" }],
      [p(2, "Loja A", 2.8, 1, "m")],
      { agora },
    );
    expect(r.linhas[0].porLoja["loja a"]).toMatchObject({ preco: 280, subtotal: 560 });
  });

  it("item sem catálogo fica faltando em todas", () => {
    const r = montarComparativo([{ chave: "z", catalogoId: null, descricao: "Fita", quantidade: 1, unidade: "un" }], [p(1, "Loja A", 1)], { agora });
    expect(r.melhorCombinacao.faltando).toEqual(["Fita"]);
    expect(r.lojaUnica).toBeNull();
  });
});

describe("casarComCatalogo", () => {
  const cat = [
    { id: 1, tipo: "material", nome: "Disjuntor DIN 1P curva C 20 A", unidade: "un", preco: 12 },
    { id: 2, tipo: "material", nome: "Disjuntor DIN 1P curva C 63 A", unidade: "un", preco: 30 },
  ];
  it("casa pelo nome ou pela variante exata, nunca outra corrente", () => {
    expect(casarComCatalogo("Disjuntor DIN 1P curva C 20 A [definir preço]", cat)?.id).toBe(1);
    expect(casarComCatalogo("Disjuntor 1P C20", cat)?.id).toBe(1);
    expect(casarComCatalogo("Disjuntor 1P C16", cat)).toBeNull();
  });
});
