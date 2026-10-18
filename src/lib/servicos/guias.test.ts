import { describe, expect, it } from "vitest";
import { CATEGORIAS_SERVICO, GUIAS, guiaPorChave } from "./guias";

describe("guias de serviço", () => {
  it("tem chaves únicas e conteúdo mínimo", () => {
    const chaves = new Set(GUIAS.map((g) => g.chave));
    expect(chaves.size).toBe(GUIAS.length);
    expect(GUIAS.length).toBeGreaterThanOrEqual(25);
    for (const g of GUIAS) {
      expect(g.passos.length, g.chave).toBeGreaterThan(0);
      expect(g.checklistEntrega.length, g.chave).toBeGreaterThan(0);
      expect(g.tempoHoras[0], g.chave).toBeLessThanOrEqual(g.tempoHoras[1]);
      expect(CATEGORIAS_SERVICO).toContain(g.categoria);
    }
  });
  it("cobre todas as categorias", () => {
    for (const c of CATEGORIAS_SERVICO) expect(GUIAS.some((g) => g.categoria === c), c).toBe(true);
  });
  it("serviços que exigem habilitação estão marcados", () => {
    for (const k of ["solar", "spda", "inspecao-laudo"]) expect(guiaPorChave(k)?.exigeResponsavel).toBeTruthy();
  });
});
