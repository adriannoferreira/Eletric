import { describe, expect, it } from "vitest";
import { CATALOGO_INICIAL } from "../../app/(app)/catalogo/sugestoes";
import { montarListaCompras, textoCotacao } from "./compras";
import { quadroExemplo } from "./exemplos";
import { buscarPreco, itensOrcamentoDoQuadro, MARCA_SEM_PRECO, normalizar } from "./orcamento-quadro";

const casa = quadroExemplo("casa-bi")!.dados;

describe("busca no catálogo", () => {
  it("normaliza acentos e ²", () => {
    expect(normalizar("Cabo Flexível 2,5 mm²")).toBe("cabo flexivel 2,5 mm2");
  });
  it("acha o cabo pela seção sem confundir 1,5 com 2,5", () => {
    const c = buscarPreco(CATALOGO_INICIAL, { tipo: "material", exige: [/cabo/, /(^|[^\d,])1[,.]5 ?mm/] });
    expect(c?.nome).toBe("Cabo flexível 1,5 mm² 750 V");
  });
  it("respeita o tipo (serviço × material)", () => {
    expect(buscarPreco(CATALOGO_INICIAL, { tipo: "servico", exige: [/\bdps\b/] })?.nome).toBe("Instalação de DPS");
    expect(buscarPreco(CATALOGO_INICIAL, { tipo: "material", exige: [/\bdps\b/] })?.nome).toContain("DPS classe II");
  });
});

describe("orçamento a partir do quadro", () => {
  const itens = itensOrcamentoDoQuadro(casa, CATALOGO_INICIAL);
  it("tem materiais e mão de obra", () => {
    expect(itens.some((i) => i.tipo === "material")).toBe(true);
    expect(itens.some((i) => i.tipo === "servico")).toBe(true);
  });
  it("disjuntores e cabos com preço do catálogo", () => {
    const dj = itens.find((i) => i.descricao.startsWith("Disjuntor 1P"));
    expect(dj?.precoUnitario).toBe(18);
    const cabo = itens.find((i) => i.descricao.startsWith("Cabo flexível 2,5 mm²"));
    expect(cabo?.precoUnitario).toBe(3.5);
  });
  it("um item de mão de obra por circuito, em metros", () => {
    const porCircuito = itens.filter((i) => i.tipo === "servico" && i.descricao.startsWith("Circuito "));
    expect(porCircuito).toHaveLength(casa.circuitos.length);
    expect(porCircuito[0].precoUnitario).toBe(8);
    expect(porCircuito[0].unidade).toBe("m");
  });
  it("DR e DPS instalados e aterramento", () => {
    expect(itens.find((i) => i.descricao === "Instalação e teste de DR")?.precoUnitario).toBe(120);
    expect(itens.find((i) => i.descricao === "Instalação de DPS")?.precoUnitario).toBe(100);
    expect(itens.find((i) => i.descricao.startsWith("Aterramento"))?.precoUnitario).toBe(250);
  });
  it("itens sem correspondência ficam com preço 0 e marcados", () => {
    const vazio = itensOrcamentoDoQuadro(casa, []);
    expect(vazio.every((i) => i.semPreco && i.precoUnitario === 0 && i.descricao.endsWith(MARCA_SEM_PRECO))).toBe(true);
  });
});

describe("lista de compras", () => {
  const lista = montarListaCompras(casa, CATALOGO_INICIAL);
  it("agrupa por categoria e inclui acessórios que costumam faltar", () => {
    const cats = new Set(lista.itens.map((i) => i.categoria));
    for (const c of ["protecao", "cabos", "quadro", "aterramento", "infraestrutura"]) expect(cats.has(c as never)).toBe(true);
    for (const chave of ["quadro:ponteiras", "quadro:pente", "quadro:abracadeiras", "quadro:fita", "quadro:identificacao", "aterr:haste"]) {
      expect(lista.itens.some((i) => i.chave === chave)).toBe(true);
    }
  });
  it("cabos por cor/função com opção de rolo de 100 m", () => {
    const cabos = lista.itens.filter((i) => i.categoria === "cabos");
    expect(cabos.some((i) => i.descricao.includes("verde-amarelo"))).toBe(true);
    expect(cabos.some((i) => i.descricao.includes("azul-claro"))).toBe(true);
    expect(cabos.every((i) => i.alternativa)).toBe(true);
  });
  it("especificação completa das peças", () => {
    const dr = lista.itens.find((i) => i.chave.startsWith("peca:dr-"));
    expect(dr?.especificacao).toMatch(/30 mA/);
    const dps = lista.itens.find((i) => i.chave.startsWith("peca:dps-"));
    expect(dps?.especificacao).toMatch(/classe II, Uc 175 V/);
  });
  it("total estimado soma os itens com preço", () => {
    const soma = lista.itens.reduce((s, i) => s + (i.total ?? 0), 0);
    expect(lista.totalEstimado).toBeCloseTo(soma, 2);
    expect(lista.totalEstimado).toBeGreaterThan(0);
  });
  it("texto de cotação para a loja", () => {
    const t = textoCotacao(lista, "QDC Casa");
    expect(t).toContain("cotação");
    expect(t).toContain("*Cabos*");
  });
});
