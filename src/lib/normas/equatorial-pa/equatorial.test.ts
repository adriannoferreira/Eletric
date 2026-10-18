import { describe, expect, it } from "vitest";
import {
  calcularDemandaEquatorial,
  categoriaAtendimento,
  checklistVistoria,
  fatorTabela4,
  materiaisPadrao,
  montarMemorialDescritivo,
  potenciaDisponibilizadaKVA,
  preencherMemorial,
  TABELA_2,
} from ".";

describe("categoriaAtendimento (Pará, Tabela 2)", () => {
  it("monofásico até 10 kW, com a faixa certa", () => {
    const r = categoriaAtendimento(3, 2.4);
    expect(r.tipo).toBe("monofasico");
    expect(r.linha?.disjuntorA).toBe(32);
    expect(categoriaAtendimento(6, 5).linha?.disjuntorA).toBe(63);
    expect(categoriaAtendimento(9.5, 7).linha?.disjuntorA).toBe(80);
  });

  it("bifásico de 10 a 15 kW e trifásico acima", () => {
    expect(categoriaAtendimento(11, 8).linha?.disjuntorA).toBe(63);
    expect(categoriaAtendimento(14, 10).linha?.disjuntorA).toBe(70);
    const t = categoriaAtendimento(20, 15);
    expect(t.tipo).toBe("trifasico");
    expect(t.linha?.disjuntorA).toBe(70);
    expect(t.linha?.condutorCliente).toBe("16(16)");
  });

  it("acima de 75 kW é média tensão", () => {
    const r = categoriaAtendimento(80, 60);
    expect(r.tipo).toBe("media_tensao");
    expect(r.bloqueios.length).toBe(1);
  });

  it("equipamento em 220 V entre fases obriga bifásico, mesmo com pouca carga", () => {
    const r = categoriaAtendimento(6, 5, [{ descricao: "Chuveiro 220 V", tipo: "aparelho", fases: 2, kva: 5.5 }]);
    expect(r.tipo).toBe("bifasico");
    expect(r.linha?.disjuntorA).toBe(50);
  });

  it("aparelho acima de 7 kVA ou equipamento trifásico obriga trifásico", () => {
    expect(categoriaAtendimento(9, 7, [{ descricao: "Forno", tipo: "aparelho", fases: 2, kva: 8 }]).tipo).toBe("trifasico");
    expect(categoriaAtendimento(5, 4, [{ descricao: "Bomba", tipo: "motor", fases: 3, cv: 2 }]).tipo).toBe("trifasico");
  });

  it("estudos do item 5.5 e partida de motor", () => {
    const r = categoriaAtendimento(30, 25, [{ descricao: "Motor", tipo: "motor", fases: 3, cv: 7.5 }]);
    expect(r.estudos.some((e) => e.includes("22 kVA"))).toBe(true);
    expect(r.avisos.some((a) => a.includes("redução da corrente de partida"))).toBe(true);
    const m = categoriaAtendimento(5, 4, [{ descricao: "Bomba", tipo: "motor", fases: 1, cv: 2 }]);
    expect(m.estudos.some((e) => e.includes("5.5.1.2"))).toBe(true);
  });

  it("opção do cliente por trifásico com pouca carga cai na primeira faixa", () => {
    const r = categoriaAtendimento(8, 6, [], { opcaoCliente: "trifasico" });
    expect(r.tipo).toBe("trifasico");
    expect(r.linha?.disjuntorA).toBe(40);
  });

  it("Tabela 2 cobre de 0 a 75 kW sem buracos por tipo", () => {
    for (const tipo of ["monofasico", "bifasico", "trifasico"] as const) {
      const l = TABELA_2.filter((x) => x.tipo === tipo);
      for (let i = 1; i < l.length; i++) expect(l[i].cargaDeKW).toBe(l[i - 1].cargaAteKW);
    }
  });
});

describe("demanda (Tabelas 4 e 5)", () => {
  it("fatores da Tabela 4", () => {
    expect(fatorTabela4(1, 2)).toBe(0.8);
    expect(fatorTabela4(2, 2)).toBe(0.75);
    expect(fatorTabela4(2, 5)).toBe(0.65);
    expect(fatorTabela4(30, 2)).toBe(0.3);
    expect(fatorTabela4(70, 5)).toBe(0.16);
  });

  it("residência: iluminação/tomadas pela Tabela 5 e aparelhos pela Tabela 4", () => {
    const r = calcularDemandaEquatorial([
      { descricao: "Pontos de luz e tomada", quantidade: 30, potenciaW: 100, categoria: "iluminacao_tomadas" },
      { descricao: "Chuveiro", quantidade: 2, potenciaW: 5500, categoria: "aparelho" },
      { descricao: "Micro-ondas", quantidade: 1, potenciaW: 1200, categoria: "aparelho" },
      { descricao: "Split 12.000", quantidade: 2, potenciaW: 1260, categoria: "ar_condicionado" },
    ]);
    expect(r.cargaInstaladaKW).toBeCloseTo(3 + 11 + 1.2 + 2.52, 5);
    // 3 kW × 100% + 11 × 0,65 + 1,2 × 0,8 + 2,52 × 100%
    expect(r.demandaKW).toBeCloseTo(3 + 7.15 + 0.96 + 2.52, 5);
  });
});

describe("padrão de entrada", () => {
  const linha = TABELA_2.find((l) => l.tipo === "monofasico" && l.disjuntorA === 63)!;
  it("materiais de muro incluem eletroduto de aço e haste", () => {
    const m = materiaisPadrao("monofasico", linha, "muro");
    expect(m.some((i) => i.descricao.includes("aço galvanizado 3/4\""))).toBe(true);
    expect(m.some((i) => i.descricao.startsWith("Haste"))).toBe(true);
    expect(m.some((i) => i.descricao.includes("monopolar 63 A"))).toBe(true);
  });
  it("poste de aço dispensa haste", () => {
    expect(materiaisPadrao("monofasico", linha, "poste_aco").some((i) => i.descricao.startsWith("Haste"))).toBe(false);
  });
  it("checklist avisa poste de aço em trifásico", () => {
    const tri = TABELA_2.find((l) => l.tipo === "trifasico")!;
    expect(checklistVistoria("trifasico", tri, "poste_aco").some((i) => i.texto.includes("não serve para trifásico"))).toBe(true);
  });
  it("potência disponibilizada (NT.00020)", () => {
    expect(potenciaDisponibilizadaKVA(63, "monofasico")).toBeCloseTo(8.001, 3);
    expect(potenciaDisponibilizadaKVA(40, "trifasico")).toBeCloseTo(15.24, 2);
  });
});

describe("memorial descritivo", () => {
  const dados = {
    obra: { titulo: "Casa Silva", endereco: "Rua A, 10", cidade: "Belém - PA" },
    cliente: { nome: "João Silva" },
    responsavel: { nome: "Eletricista Teste", registro: "CFT 123" },
    categoria: categoriaAtendimento(6, 5),
    demanda: calcularDemandaEquatorial([{ descricao: "Pontos", quantidade: 20, potenciaW: 100, categoria: "iluminacao_tomadas" }]),
    montagem: "muro" as const,
    quadros: [
      {
        nome: "QDC",
        circuitos: [{ numero: 1, descricao: "Iluminação", potenciaW: 800, tensaoV: 127, secaoMm2: 1.5, disjuntor: "C10", dr: "", fase: "R" }],
      },
    ],
  };
  it("preenche o determinístico e marca o que é da IA", () => {
    const { secoes, markdown } = montarMemorialDescritivo(dados);
    expect(markdown).toContain("63 A");
    expect(markdown).toContain("| 1 | Iluminação |");
    const ia = secoes.filter((s) => s.paraIA).map((s) => s.id);
    expect(ia).toEqual(["descricao-geral", "criterios", "consideracoes"]);
    const final = preencherMemorial(markdown, { "descricao-geral": "Texto da IA." });
    expect(final).toContain("Texto da IA.");
    expect(final).toContain("<!-- IA:criterios -->");
  });
  it("inclui NT.00020 quando há geração", () => {
    expect(montarMemorialDescritivo({ ...dados, temGeracao: true }).markdown).toContain("NT.00020");
  });
});
