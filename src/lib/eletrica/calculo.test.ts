import { describe, expect, it } from "vitest";
import {
  analisarQuadro,
  capacidadeCorrigida,
  correnteProjeto,
  dimensionar,
  disjuntorMinimo,
  exigeDR,
  listaMateriais,
  quedaTensaoPct,
  secaoProtecao,
} from "./calculo";
import { capacidadeTabela36, fatorAgrupamento, fatorTemperatura, reservaMinima } from "./tabelas";
import { novoCircuito, novoQuadro, type QuadroDados } from "./tipos";

describe("tabelas NBR 5410", () => {
  it("Tabela 36 — B1, 2 condutores carregados", () => {
    expect(capacidadeTabela36(1.5, "B1", 2)).toBe(17.5);
    expect(capacidadeTabela36(2.5, "B1", 2)).toBe(24);
    expect(capacidadeTabela36(4, "B1", 2)).toBe(32);
    expect(capacidadeTabela36(6, "B1", 2)).toBe(41);
    expect(capacidadeTabela36(10, "B1", 2)).toBe(57);
  });
  it("Tabela 36 — outros métodos", () => {
    expect(capacidadeTabela36(2.5, "B1", 3)).toBe(21);
    expect(capacidadeTabela36(2.5, "C", 2)).toBe(27);
    expect(capacidadeTabela36(2.5, "D", 2)).toBe(29);
    expect(capacidadeTabela36(2.5, "A1", 2)).toBe(19.5);
    expect(capacidadeTabela36(3, "B1", 2)).toBeUndefined();
  });
  it("Tabela 40 — temperatura", () => {
    expect(fatorTemperatura(30, "B1")).toBe(1);
    expect(fatorTemperatura(35, "B1")).toBe(0.94);
    expect(fatorTemperatura(33, "B1")).toBe(0.94); // arredonda para a faixa superior
    expect(fatorTemperatura(20, "D")).toBe(1);
    expect(fatorTemperatura(65, "B1")).toBe(0);
  });
  it("Tabela 42 — agrupamento", () => {
    expect(fatorAgrupamento(1)).toBe(1);
    expect(fatorAgrupamento(2)).toBe(0.8);
    expect(fatorAgrupamento(3)).toBe(0.7);
    expect(fatorAgrupamento(10)).toBe(0.5);
    expect(fatorAgrupamento(25)).toBe(0.38);
  });
  it("6.5.4.7 — espaço reserva", () => {
    expect(reservaMinima(4)).toBe(2);
    expect(reservaMinima(10)).toBe(3);
    expect(reservaMinima(20)).toBe(4);
    expect(reservaMinima(40)).toBe(6);
  });
});

describe("grandezas", () => {
  it("corrente de projeto mono e trifásica", () => {
    expect(correnteProjeto(2200, 220, 1, "FN")).toBeCloseTo(10);
    expect(correnteProjeto(10000, 380, 1, "3F")).toBeCloseTo(15.19, 2);
    expect(correnteProjeto(1000, 127, 0.8, "FN")).toBeCloseTo(9.84, 2);
  });
  it("queda de tensão", () => {
    // 2 × 0,0206 × 20 m × 10 A / 2,5 mm² = 3,296 V → 1,498% de 220 V
    expect(quedaTensaoPct(10, 20, 2.5, 220, "FN")).toBeCloseTo(1.498, 2);
  });
  it("capacidade corrigida", () => {
    expect(capacidadeCorrigida(2.5, "B1", 2, 30, 3)).toBeCloseTo(16.8);
  });
  it("disjuntor comercial", () => {
    expect(disjuntorMinimo(10)).toBe(10);
    expect(disjuntorMinimo(10.1)).toBe(16);
    expect(disjuntorMinimo(200)).toBeUndefined();
  });
  it("condutor de proteção (Tabela 58)", () => {
    expect(secaoProtecao(6)).toBe(6);
    expect(secaoProtecao(25)).toBe(16);
    expect(secaoProtecao(70)).toBe(35);
  });
});

describe("dimensionar", () => {
  it("chuveiro 7500 W 220 V a 15 m, B1, sozinho", () => {
    const d = dimensionar({
      tipo: "tue",
      potenciaW: 7500,
      fatorPotencia: 1,
      ligacao: "FF",
      tensaoV: 220,
      comprimentoM: 15,
      metodo: "B1",
      temperaturaC: 30,
      circuitosAgrupados: 1,
    });
    expect(d.ib).toBeCloseTo(34.09, 2);
    expect(d.disjuntor).toBe(40);
    // 40 A exige Iz ≥ 40 → 6 mm² (41 A)
    expect(d.secao).toBe(6);
    expect(d.quedaPct).toBeLessThan(4);
    expect(d.alertas.filter((a) => a.nivel === "erro")).toHaveLength(0);
  });

  it("iluminação respeita seção mínima de 1,5 mm²", () => {
    const d = dimensionar({
      tipo: "iluminacao",
      potenciaW: 300,
      fatorPotencia: 1,
      ligacao: "FN",
      tensaoV: 127,
      comprimentoM: 10,
      metodo: "B1",
      temperaturaC: 30,
      circuitosAgrupados: 1,
    });
    expect(d.secao).toBe(1.5);
    expect(d.disjuntor).toBe(6);
  });

  it("TUG nunca abaixo de 2,5 mm²", () => {
    const d = dimensionar({
      tipo: "tug",
      potenciaW: 600,
      fatorPotencia: 1,
      ligacao: "FN",
      tensaoV: 127,
      comprimentoM: 8,
      metodo: "B1",
      temperaturaC: 30,
      circuitosAgrupados: 1,
    });
    expect(d.secao).toBe(2.5);
  });

  it("circuito longo é dimensionado pela queda de tensão", () => {
    const d = dimensionar({
      tipo: "tug",
      potenciaW: 1800,
      fatorPotencia: 1,
      ligacao: "FN",
      tensaoV: 127,
      comprimentoM: 40,
      metodo: "B1",
      temperaturaC: 30,
      circuitosAgrupados: 1,
    });
    // Ib ≈ 14,2 A → In 16 A → por capacidade 1,5 mm² (17,5 A); por queda precisa de mais
    expect(d.secaoCapacidade).toBe(1.5);
    expect(d.secaoQueda).toBeGreaterThan(2.5);
    expect(d.secao).toBe(d.secaoQueda);
    expect(d.quedaPct).toBeLessThanOrEqual(4);
  });

  it("seção adotada menor que a necessária gera erro", () => {
    const d = dimensionar({
      tipo: "tue",
      potenciaW: 7500,
      fatorPotencia: 1,
      ligacao: "FF",
      tensaoV: 220,
      comprimentoM: 15,
      metodo: "B1",
      temperaturaC: 30,
      circuitosAgrupados: 1,
      secaoAdotada: 4,
    });
    expect(d.secao).toBe(4);
    expect(d.alertas.some((a) => a.nivel === "erro")).toBe(true);
  });
});

describe("DR (5.1.3.2.2)", () => {
  it("exige em banheiro, cozinha e tomada externa", () => {
    expect(exigeDR({ local: "banheiro", tipo: "iluminacao", alimentaExterno: false })).toBe(true);
    expect(exigeDR({ local: "cozinha", tipo: "tug", alimentaExterno: false })).toBe(true);
    expect(exigeDR({ local: "area_externa", tipo: "tug", alimentaExterno: false })).toBe(true);
    expect(exigeDR({ local: "sala", tipo: "tug", alimentaExterno: true })).toBe(true);
  });
  it("não exige em quarto ou iluminação externa", () => {
    expect(exigeDR({ local: "quarto", tipo: "tug", alimentaExterno: false })).toBe(false);
    expect(exigeDR({ local: "area_externa", tipo: "iluminacao", alimentaExterno: false })).toBe(false);
  });
});

function quadroExemplo(): QuadroDados {
  const q = novoQuadro({ tipo: "bifasico", tensaoFN: 127, tensaoFF: 220, esquema: "TN-S" }, { fileiras: 1, modulosPorFileira: 12 });
  const chuveiro = novoCircuito({ id: "c1", nome: "Chuveiro", tipo: "tue", local: "banheiro", potenciaW: 7500, ligacao: "FF", comprimentoM: 15 });
  const luz = novoCircuito({ id: "c2", nome: "Iluminação", tipo: "iluminacao", local: "varios", potenciaW: 600, ligacao: "FN", comprimentoM: 12 });
  q.circuitos = [chuveiro, luz];
  q.componentes = [
    { id: "g", pecaId: "dj-2p-C50", fileira: 0, posicao: 0, fases: ["R", "S"], circuitoId: null, geral: true, etiqueta: "Geral" },
    { id: "k1", pecaId: "dj-2p-C40", fileira: 0, posicao: 2, fases: ["R", "S"], circuitoId: "c1", geral: false, etiqueta: "" },
    { id: "k2", pecaId: "dj-1p-B10", fileira: 0, posicao: 4, fases: ["R"], circuitoId: "c2", geral: false, etiqueta: "" },
  ];
  return q;
}

describe("analisarQuadro", () => {
  it("aponta falta de DR no chuveiro e de DPS", () => {
    const a = analisarQuadro(quadroExemplo());
    const chuveiro = a.circuitos.find((r) => r.circuito.id === "c1")!;
    expect(chuveiro.exigeDR).toBe(true);
    expect(chuveiro.temDR).toBe(false);
    expect(chuveiro.status).toBe("erro");
    expect(a.alertas.some((x) => x.mensagem.includes("DPS"))).toBe(true);
    expect(a.status).toBe("erro");
  });

  it("DR geral resolve a exigência", () => {
    const q = quadroExemplo();
    q.componentes.push({ id: "dr", pecaId: "dr-2p-63", fileira: 0, posicao: 6, fases: ["R", "S"], circuitoId: null, geral: true, etiqueta: "" });
    const a = analisarQuadro(q);
    expect(a.circuitos.every((r) => r.temDR)).toBe(true);
  });

  it("disjuntor maior que Iz do cabo é erro", () => {
    const q = quadroExemplo();
    q.circuitos[1].secaoAdotada = 1.5;
    q.componentes[2].pecaId = "dj-1p-C25";
    const a = analisarQuadro(q);
    const luz = a.circuitos.find((r) => r.circuito.id === "c2")!;
    expect(luz.alertas.some((x) => x.mensagem.includes("não fica protegido"))).toBe(true);
  });

  it("soma correntes por fase e calcula desequilíbrio", () => {
    const a = analisarQuadro(quadroExemplo());
    expect(a.correntePorFase.R).toBeCloseTo(34.09 + 600 / 127, 1);
    expect(a.correntePorFase.S).toBeCloseTo(34.09, 1);
    expect(a.desequilibrioPct).toBeGreaterThan(0);
  });

  it("ocupação e reserva", () => {
    const a = analisarQuadro(quadroExemplo());
    expect(a.modulosTotais).toBe(12);
    expect(a.modulosUsados).toBe(5);
    expect(a.reservaExigida).toBe(2);
  });

  it("lista de materiais inclui cabos com folga", () => {
    const itens = listaMateriais(quadroExemplo());
    const fase6 = itens.find((i) => i.descricao.startsWith("Cabo flexível 6 mm²") && i.descricao.includes("fase"));
    // chuveiro FF: 2 fases × 15 m × 1,1 = 33 m
    expect(fase6?.quantidade).toBe(33);
    expect(itens.some((i) => i.descricao.includes("Barra de neutro"))).toBe(true);
  });
});
