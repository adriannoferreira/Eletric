import { describe, expect, it } from "vitest";
import { buscarPreco, varianteDaPeca } from "../eletrica/orcamento-quadro";
import { PECAS } from "../eletrica/pecas";
import {
  combinar,
  confere,
  converterPreco,
  especificacaoCompleta,
  inferirVariante,
  nomeVariante,
  resolverVariante,
} from "./variantes";

const mat = (nome: string, preco: number, extra: Partial<{ familia: string; atributos: Record<string, unknown>; unidade: string }> = {}) => ({
  tipo: "material",
  nome,
  unidade: extra.unidade ?? "un",
  preco,
  familia: extra.familia ?? null,
  atributos: extra.atributos ?? null,
});

describe("inferirVariante", () => {
  it("reconhece disjuntores em vários formatos", () => {
    expect(inferirVariante("Disjuntor DIN 1P curva C 20 A")).toEqual({
      familia: "disjuntor_din",
      atributos: { polos: 1, curva: "C", corrente: 20 },
    });
    expect(inferirVariante("Disjuntor 2P C40")?.atributos).toMatchObject({ polos: 2, curva: "C", corrente: 40 });
    expect(inferirVariante("Disjuntor monopolar Steck curva B 10A 3kA")?.atributos).toMatchObject({ polos: 1, curva: "B", corrente: 10, icnKa: 3 });
  });
  it("item genérico sem corrente fica incompleto", () => {
    const e = inferirVariante("Disjuntor DIN 1P curva C");
    expect(e?.familia).toBe("disjuntor_din");
    expect(especificacaoCompleta(e)).toBe(false);
  });
  it("DR, DPS e cabos", () => {
    expect(inferirVariante("DR 2P 40 A 30 mA")?.atributos).toEqual({ polos: 2, corrente: 40, idnMa: 30 });
    expect(inferirVariante("DPS classe II 275 V 20 kA")?.atributos).toEqual({ classe: "II", ucV: 275, imaxKa: 20 });
    expect(inferirVariante("Cabo flexível 2,5 mm² 750 V azul")?.atributos).toEqual({ secao: 2.5, cor: "azul", tensaoV: 750 });
  });
});

describe("resolverVariante", () => {
  const catalogo = [
    mat("Disjuntor DIN 1P curva C 63 A", 30),
    mat("Disjuntor DIN 1P curva C", 15.9),
    mat("Disjuntor DIN 1P curva C 20 A", 14.5, { familia: "disjuntor_din", atributos: { polos: 1, curva: "C", corrente: 20 } }),
    mat("Cabo flexível 2,5 mm² 750 V preto", 3.5),
    mat("Cabo flexível 4 mm²", 5.5),
  ];

  it("disjuntor 20 A nunca recebe preço do 63 A nem do genérico", () => {
    const r = resolverVariante(catalogo, { familia: "disjuntor_din", atributos: { polos: 1, curva: "C", corrente: 20 } });
    expect(r.status === "ok" && r.item.preco).toBe(14.5);
    const s = resolverVariante(catalogo, { familia: "disjuntor_din", atributos: { polos: 1, curva: "C", corrente: 16 } });
    expect(s.status).toBe("inexistente");
  });

  it("cor exigida diferente não casa; item sem cor serve para qualquer cor", () => {
    const azul = resolverVariante(catalogo, { familia: "cabo_flexivel", atributos: { secao: 2.5, cor: "azul" } });
    expect(azul.status).toBe("inexistente");
    const preto = resolverVariante(catalogo, { familia: "cabo_flexivel", atributos: { secao: 2.5, cor: "preto" } });
    expect(preto.status).toBe("ok");
    const qualquer = resolverVariante(catalogo, { familia: "cabo_flexivel", atributos: { secao: 4, cor: "azul" } });
    expect(qualquer.status === "ok" && qualquer.item.preco).toBe(5.5);
  });

  it("especificação incompleta não casa", () => {
    expect(resolverVariante(catalogo, { familia: "disjuntor_din", atributos: { polos: 1, curva: "C" } }).status).toBe("inexistente");
  });

  it("orçamento do quadro usa a variante exata da peça", () => {
    const p20 = PECAS.find((p) => p.tipo === "disjuntor" && p.polos === 1 && p.curva === "C" && p.correnteNominal === 20 && p.padrao !== "NEMA")!;
    const p63 = PECAS.find((p) => p.tipo === "disjuntor" && p.polos === 1 && p.curva === "C" && p.correnteNominal === 63 && p.padrao !== "NEMA")!;
    expect(buscarPreco(catalogo, { tipo: "material", exige: [], variante: varianteDaPeca(p20.id)! })?.preco).toBe(14.5);
    expect(buscarPreco(catalogo, { tipo: "material", exige: [], variante: varianteDaPeca(p63.id)! })?.preco).toBe(30);
  });
});

describe("unidades e grades", () => {
  it("converte rolo de 100 m para metro", () => {
    expect(converterPreco(279.9, "rolo 100 m", "m")).toBeCloseTo(2.799, 3);
    expect(converterPreco(279.9, "rolo", "m")).toBeCloseTo(2.799, 3);
    expect(converterPreco(3, "m", "rolo 100 m")).toBe(300);
    expect(converterPreco(10, "un", "m")).toBeNull();
  });
  it("confere aponta a divergência", () => {
    expect(confere({ familia: "disjuntor_din", atributos: { polos: 1, curva: "C", corrente: 20 } }, { familia: "disjuntor_din", atributos: { polos: 1, curva: "C", corrente: 63 } }).divergencias).toEqual(["corrente"]);
  });
  it("gera combinações e nomes", () => {
    const c = combinar({ polos: [1, 2], corrente: [10, 20] });
    expect(c).toHaveLength(4);
    expect(nomeVariante({ familia: "disjuntor_din", atributos: { polos: 1, curva: "C", corrente: 20, icnKa: 3 } })).toBe("Disjuntor DIN 1P curva C 20 A 3 kA");
  });
});
