import { describe, expect, it } from "vitest";
import { montarMemorialDescritivo, preencherMemorial } from "../normas/equatorial-pa";
import { analisarQuadro } from "./calculo";
import { quadroExemplo } from "./exemplos";
import { dadosMemorialDoQuadro, temGeracao } from "./memorial-quadro";
import { calcularDemanda } from "./projeto";
import { novoCircuito } from "./tipos";

describe("memorial descritivo do quadro", () => {
  const ex = quadroExemplo("casa-bi")!;
  const analise = analisarQuadro(ex.dados);
  const demanda = calcularDemanda(ex.dados.circuitos, { tensaoFN: 127, tensaoFF: 220 }, { concessionaria: "equatorial-pa" });

  it("monta os dados com circuitos calculados e o padrão oficial", () => {
    const d = dadosMemorialDoQuadro({
      nome: ex.nome,
      dados: ex.dados,
      analise,
      demanda,
      cliente: { nome: "Cliente Teste", cidade: "Belém" },
      responsavel: { nome: "Eletricista", registroProfissional: "CFT 123" },
    })!;
    expect(d.categoria.tipo).toBe("bifasico");
    expect(d.quadros[0].circuitos).toHaveLength(analise.circuitos.length);
    expect(d.quadros[0].circuitos.every((c) => c.disjuntor !== "—")).toBe(true);
    const m = montarMemorialDescritivo(d);
    expect(m.markdown).toContain("Disjuntor geral do padrão");
    expect(m.markdown).toContain("<!-- IA:criterios -->");
    const final = preencherMemorial(m.markdown, { "descricao-geral": "Texto", criterios: "Critérios", consideracoes: "Fim" });
    expect(final).not.toContain("<!-- IA:");
  });

  it("sem Equatorial não monta (usa o memorial livre)", () => {
    const outra = calcularDemanda(ex.dados.circuitos, { tensaoFN: 127, tensaoFF: 220 }, { concessionaria: "cemig" });
    expect(dadosMemorialDoQuadro({ nome: "x", dados: ex.dados, analise, demanda: outra, cliente: null, responsavel: { nome: "" } })).toBeNull();
  });

  it("detecta geração solar", () => {
    expect(temGeracao({ ...ex.dados, circuitos: [...ex.dados.circuitos, novoCircuito({ nome: "Inversor solar", tipo: "tue" })] })).toBe(true);
    expect(temGeracao(ex.dados)).toBe(false);
  });
});
