import { describe, expect, it } from "vitest";
import { custoKit, expandirKit } from "./kits";
import { desatualizado, precoEfetivo, precoPreferido, precoServico, similaridade } from "./regras";
import { detectarRegime, interpretarAba, numeroBR, referenciaDoArquivo } from "./sinapi";

const agora = new Date("2026-10-18T12:00:00Z");
const dias = (n: number) => new Date(agora.getTime() - n * 86_400_000);
const ctx = { margemSinapi: 30, validadeDias: 60, agora };

describe("precoPreferido", () => {
  it("prefere cotação recente a tudo", () => {
    const r = precoPreferido(
      [
        { fonte: "ia", preco: 10, data: dias(1) },
        { fonte: "cotacao", preco: 12, data: dias(10) },
        { fonte: "sinapi", preco: 5, data: dias(2) },
      ],
      ctx,
    );
    expect(r).toMatchObject({ fonte: "cotacao", preco: 12 });
  });

  it("cotação vencida perde para pesquisa IA recente", () => {
    const r = precoPreferido(
      [
        { fonte: "cotacao", preco: 12, data: dias(90) },
        { fonte: "ia", preco: 11, data: dias(5) },
      ],
      ctx,
    );
    expect(r).toMatchObject({ fonte: "ia", preco: 11 });
  });

  it("sem cotação/IA recentes usa SINAPI com margem", () => {
    const r = precoPreferido(
      [
        { fonte: "ia", preco: 11, data: dias(70) },
        { fonte: "sinapi", preco: 10, data: dias(100) },
        { fonte: "manual", preco: 20, data: dias(1) },
      ],
      ctx,
    );
    expect(r).toMatchObject({ fonte: "sinapi", preco: 13 });
  });

  it("só manual usa o manual; vazio retorna null", () => {
    expect(precoPreferido([{ fonte: "manual", preco: 7, data: dias(200) }], ctx)).toMatchObject({ preco: 7 });
    expect(precoPreferido([], ctx)).toBeNull();
  });

  it("só cotação antiga ainda é usada como último recurso", () => {
    expect(precoPreferido([{ fonte: "cotacao", preco: 9, data: dias(300) }], ctx)).toMatchObject({
      fonte: "cotacao",
      preco: 9,
    });
  });
});

describe("serviços", () => {
  const s = { horasEletricista: 1.5, horasAjudante: 1, multiplicador: 1.2, deslocamento: 20 };
  it("calcula horas × valor/hora × dificuldade × margem + deslocamento", () => {
    // (1,5×80 + 1×40) × 1,2 × 1,1 + 20 = 160 × 1,32 + 20 = 231,20
    expect(precoServico(s, { valorHora: 80, margemServico: 10 })).toBe(231.2);
    expect(precoServico(s, { valorHora: 80, valorHoraAjudante: 30, margemServico: 0 })).toBe(200);
  });

  it("precoEfetivo usa preço fixo quando marcado ou sem valor/hora", () => {
    const base = { ...s, tipo: "servico", preco: 99 };
    expect(precoEfetivo({ ...base, precoFixo: true }, { valorHora: 80, margemServico: 0 })).toBe(99);
    expect(precoEfetivo({ ...base, precoFixo: false }, { valorHora: null, margemServico: 0 })).toBe(99);
    expect(precoEfetivo({ ...base, precoFixo: false }, { valorHora: 80, margemServico: 0 })).toBe(212);
    expect(precoEfetivo({ ...base, tipo: "material", precoFixo: false }, { valorHora: 80, margemServico: 0 })).toBe(99);
  });

  it("marca preço desatualizado depois da validade", () => {
    expect(desatualizado(dias(61), 60, agora)).toBe(true);
    expect(desatualizado(dias(10), 60, agora)).toBe(false);
    expect(desatualizado(null, 60, agora)).toBe(true);
  });
});

describe("expandirKit", () => {
  const precos = new Map([
    [1, { preco: 90, nome: "Ponto novo de tomada", unidade: "un" }],
    [2, { preco: 3.5, nome: "Cabo flexível 2,5 mm²", unidade: "m" }],
  ]);
  const kit = {
    nome: "Ponto de tomada 10 A",
    itens: [
      { catalogoId: 1, tipo: "servico", descricao: "x", unidade: "un", quantidade: 1 },
      { catalogoId: 2, tipo: "material", descricao: "x", unidade: "m", quantidade: 8 },
      { catalogoId: null, tipo: "material", descricao: "Caixa 4x2", unidade: "un", quantidade: 1 },
    ],
  };
  it("multiplica quantidades, usa preços do catálogo e agrupa pelo nome", () => {
    const itens = expandirKit(kit, 5, precos);
    expect(itens).toHaveLength(3);
    expect(itens[0]).toMatchObject({ tipo: "servico", quantidade: 5, precoUnitario: 90, grupo: "Ponto de tomada 10 A (5×)" });
    expect(itens[1]).toMatchObject({ descricao: "Cabo flexível 2,5 mm²", quantidade: 40, precoUnitario: 3.5 });
    expect(itens[2]).toMatchObject({ descricao: "Caixa 4x2", precoUnitario: 0 });
    expect(custoKit(itens)).toBe(590);
  });
});

describe("SINAPI", () => {
  it("lê números em formato brasileiro", () => {
    expect(numeroBR("1.234,56")).toBe(1234.56);
    expect(numeroBR(" 3,5 ")).toBe(3.5);
    expect(numeroBR(7)).toBe(7);
    expect(numeroBR("")).toBeNull();
  });

  it("detecta regime e referência pelo nome", () => {
    expect(detectarRegime("SINAPI_Preco_Ref_Insumos_PA_202609_NaoDesonerado.xlsx")).toBe("nao_desonerado");
    expect(detectarRegime("SINAPI_Preco_Ref_Insumos_PA_202609_Desonerado.xlsx")).toBe("desonerado");
    expect(detectarRegime("SINAPI_Referencia_2026_09.xlsx", "ICD")).toBe("desonerado");
    expect(referenciaDoArquivo("SINAPI_Preco_Ref_Insumos_PA_202609_NaoDesonerado.xlsx")).toBe("2026-09");
  });

  it("lê planilha antiga de insumos (coluna de preço)", () => {
    const r = interpretarAba({
      arquivo: "SINAPI_Preco_Ref_Insumos_PA_202609_NaoDesonerado.xlsx",
      aba: "Planilha1",
      uf: "PA",
      linhas: [
        ["SISTEMA NACIONAL DE PESQUISA..."],
        [],
        ["CODIGO", "DESCRICAO DO INSUMO", "UNIDADE", "ORIGEM DE PRECO", "PRECO MEDIANO R$"],
        ["00991", "CABO DE COBRE FLEXIVEL 2,5 MM2", "M", "C", "3,12"],
        ["", "linha vazia", "", "", ""],
      ],
    });
    expect(r.tipo).toBe("insumo");
    expect(r.itens).toEqual([
      { tipo: "insumo", codigo: "00991", descricao: "CABO DE COBRE FLEXIVEL 2,5 MM2", unidade: "M", preco: 3.12 },
    ]);
  });

  it("lê planilha nova com uma coluna por UF", () => {
    const r = interpretarAba({
      arquivo: "SINAPI_Referencia_2026_09.xlsx",
      aba: "CSD",
      uf: "PA",
      linhas: [
        ["Código da Composição", "Descrição", "Unidade", "AC", "PA", "SP"],
        [91926, "CIRCUITO ... CABO 2,5 MM2", "M", 5.1, 5.42, 6],
      ],
    });
    expect(r).toMatchObject({ tipo: "composicao", regime: "nao_desonerado" });
    expect(r.itens[0]).toMatchObject({ codigo: "91926", preco: 5.42 });
  });

  it("soma horas de eletricista e auxiliar no analítico", () => {
    const r = interpretarAba({
      arquivo: "SINAPI_Referencia_2026_09.xlsx",
      aba: "Analítico",
      uf: "PA",
      linhas: [
        ["Código da Composição", "Tipo Item", "Código do Item", "Descrição", "Unidade", "Coeficiente"],
        ["91926", "", "", "CIRCUITO ...", "M", ""],
        ["91926", "COMPOSICAO", "88247", "AUXILIAR DE ELETRICISTA COM ENCARGOS COMPLEMENTARES", "H", "0,05"],
        ["91926", "COMPOSICAO", "88264", "ELETRICISTA COM ENCARGOS COMPLEMENTARES", "H", "0,05"],
        ["91926", "INSUMO", "00991", "CABO DE COBRE FLEXIVEL", "M", "1,1"],
      ],
    });
    expect(r.tipo).toBe("analitico");
    expect(r.horas["91926"]).toEqual({ eletricista: 0.05, ajudante: 0.05 });
  });
});

describe("similaridade", () => {
  it("casa descrição de loja com item do catálogo", () => {
    const a = similaridade("CABO FLEX 2,5MM 750V AZUL SIL", "Cabo flexível 2,5 mm² 750 V");
    const b = similaridade("CABO FLEX 2,5MM 750V AZUL SIL", "Disjuntor DIN 1P curva C");
    expect(a).toBeGreaterThan(b);
  });
});
