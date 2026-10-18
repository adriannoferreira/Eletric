import { describe, expect, it } from "vitest";
import { concessionariaDoQuadro, padraoEquatorial } from "./equatorial";
import { EXEMPLOS, quadroExemplo } from "./exemplos";
import { calcularDemanda } from "./projeto";
import { novoCircuito, novoQuadro } from "./tipos";

const rede = { tensaoFN: 127, tensaoFF: 220 };

describe("Equatorial Pará no quadro", () => {
  it("monofásico até 10 kW com disjuntor do padrão da Tabela 2", () => {
    const circuitos = [novoCircuito({ tipo: "tug", potenciaW: 6000 })];
    const p = padraoEquatorial(circuitos);
    expect(p.categoria.tipo).toBe("monofasico");
    expect(p.categoria.linha?.disjuntorA).toBe(63);
  });

  it("aparelho acima de 5 kVA em 127 V obriga bifásico (6.2.1.1)", () => {
    const circuitos = [novoCircuito({ tipo: "tue", nome: "Chuveiro", potenciaW: 5400, ligacao: "FN" })];
    expect(padraoEquatorial(circuitos).categoria.tipo).toBe("bifasico");
  });

  it("calcularDemanda usa a regra oficial só para a Equatorial PA", () => {
    const circuitos = [novoCircuito({ tipo: "tug", potenciaW: 12000 })];
    const eq = calcularDemanda(circuitos, rede, { concessionaria: "equatorial-pa" });
    expect(eq.categoria).toBe("bifasico");
    expect(eq.disjuntorPadraoA).toBe(63);
    expect(eq.disjuntorGeralA).toBeLessThanOrEqual(63);
    expect(eq.equatorial).not.toBeNull();
    const outra = calcularDemanda(circuitos, rede, { concessionaria: "cemig" });
    expect(outra.equatorial).toBeNull();
    expect(outra.disjuntorPadraoA).toBeNull();
  });

  it("acima de 75 kW bloqueia o atendimento em BT", () => {
    const d = calcularDemanda([novoCircuito({ tipo: "tug", potenciaW: 80000 })], rede, { concessionaria: "equatorial-pa" });
    expect(d.alertas.some((a) => a.nivel === "erro" && /média tensão/.test(a.mensagem))).toBe(true);
  });

  it("quadro do zero assume a Equatorial PA, mas respeita a escolha", () => {
    const q = novoQuadro();
    expect(concessionariaDoQuadro(q)).toBe("equatorial-pa");
    expect(concessionariaDoQuadro({ ...q, concessionaria: "cemig" })).toBe("cemig");
  });

  it("exemplos são coerentes com o nome e com a NT.00001", () => {
    const esperado: Record<string, string> = { "apto-mono": "monofasico", "casa-bi": "bifasico", "casa-tri": "trifasico", comercio: "bifasico" };
    for (const e of EXEMPLOS) {
      const q = quadroExemplo(e.id)!;
      expect(q.dados.alimentacao.tipo).toBe(esperado[e.id]);
      expect(padraoEquatorial(q.dados.circuitos).categoria.tipo).toBe(esperado[e.id]);
    }
  });
});
