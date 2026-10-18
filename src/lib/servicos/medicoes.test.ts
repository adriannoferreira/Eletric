import { describe, expect, it } from "vitest";
import { avaliarMedicao, desequilibrioPercentual, resumoResultados } from "./medicoes";

describe("avaliarMedicao", () => {
  it("tensão FN 127 V pelas faixas do PRODIST", () => {
    expect(avaliarMedicao("tensao_fn", 125, { nominal: 127 }).resultado).toBe("ok");
    expect(avaliarMedicao("tensao_fn", 112, { nominal: 127 }).resultado).toBe("aviso");
    expect(avaliarMedicao("tensao_fn", 100, { nominal: 127 }).resultado).toBe("nc");
    expect(avaliarMedicao("tensao_ff", 220, { nominal: 220 }).resultado).toBe("ok");
  });

  it("corrente contra o disjuntor", () => {
    expect(avaliarMedicao("corrente", 10, { in: 20 }).resultado).toBe("ok");
    expect(avaliarMedicao("corrente", 18, { in: 20 }).resultado).toBe("aviso");
    expect(avaliarMedicao("corrente", 25, { in: 20 }).resultado).toBe("nc");
  });

  it("isolamento depende da tensão de ensaio", () => {
    expect(avaliarMedicao("isolamento", 1.5, { ensaio: 500 }).resultado).toBe("ok");
    expect(avaliarMedicao("isolamento", 0.7, { ensaio: 500 }).resultado).toBe("aviso");
    expect(avaliarMedicao("isolamento", 0.2, { ensaio: 500 }).resultado).toBe("nc");
    expect(avaliarMedicao("isolamento", 0.6, { ensaio: 250 }).resultado).toBe("ok");
  });

  it("DR: tempo e corrente de disparo", () => {
    expect(avaliarMedicao("dr_tempo", 25).resultado).toBe("ok");
    expect(avaliarMedicao("dr_tempo", 350).resultado).toBe("nc");
    expect(avaliarMedicao("dr_corrente", 22, { idn: 30 }).resultado).toBe("ok");
    expect(avaliarMedicao("dr_corrente", 12, { idn: 30 }).resultado).toBe("nc");
    expect(avaliarMedicao("dr_corrente", 35, { idn: 30 }).resultado).toBe("nc");
  });

  it("limites manuais têm prioridade", () => {
    expect(avaliarMedicao("aterramento", 15, {}, null, 20).resultado).toBe("ok");
    expect(avaliarMedicao("outro", 5, {}, 10, null).resultado).toBe("nc");
  });
});

describe("auxiliares", () => {
  it("desequilíbrio entre fases", () => {
    expect(desequilibrioPercentual([10, 10, 10])).toBe(0);
    expect(Math.round(desequilibrioPercentual([12, 10, 8]))).toBe(20);
  });
  it("resumo geral pega o pior resultado", () => {
    expect(resumoResultados([{ resultado: "ok" }, { resultado: "aviso" }]).geral).toBe("aviso");
    expect(resumoResultados([{ resultado: "ok" }, { resultado: "nc" }]).geral).toBe("nc");
    expect(resumoResultados([]).geral).toBe("ok");
  });
});
