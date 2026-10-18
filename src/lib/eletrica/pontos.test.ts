import { describe, expect, it } from "vitest";
import { analisarQuadro } from "./calculo";
import { quadroExemplo } from "./exemplos";
import { kitsDaLista, listaDePontos } from "./pontos";
import { iluminacaoMinimaVA, tomadasMinimas } from "./projeto";
import { novoCircuito, novoQuadro } from "./tipos";

describe("lista de pontos por ambiente", () => {
  const ex = quadroExemplo("casa-bi")!;
  const analise = analisarQuadro(ex.dados);
  const lista = listaDePontos(ex.dados, analise);

  it("tem um bloco por ambiente do projeto com o mínimo da NBR 5410", () => {
    expect(lista.origem).toBe("projeto");
    expect(lista.ambientes.map((a) => a.nome)).toEqual(ex.dados.projeto!.ambientes.map((a) => a.nome));
    for (const amb of ex.dados.projeto!.ambientes) {
      const bloco = lista.ambientes.find((a) => a.chave === amb.id)!;
      const tug = bloco.pontos.filter((p) => p.tipo === "tug").reduce((s, p) => s + p.quantidade, 0);
      expect(tug).toBe(tomadasMinimas(amb));
      const luz = bloco.pontos.filter((p) => p.tipo === "luz").reduce((s, p) => s + (p.potencia ?? 0) * p.quantidade, 0);
      expect(luz).toBeGreaterThanOrEqual(iluminacaoMinimaVA(amb.areaM2) - 1);
    }
  });

  it("liga cada ponto ao circuito e disjuntor do quadro", () => {
    const pontos = lista.ambientes.flatMap((a) => a.pontos);
    expect(pontos.every((p) => p.circuito !== null)).toBe(true);
    const chuveiro = pontos.find((p) => /chuveiro/i.test(p.descricao))!;
    expect(chuveiro.kit).toBe("chuveiro-circuito");
    expect(chuveiro.circuito!.disjuntor).toMatch(/2P/);
  });

  it("banheiro traz o aviso dos volumes e materiais somados", () => {
    const banho = lista.ambientes.find((a) => /banheiro/i.test(a.nome))!;
    expect(banho.avisos.join(" ")).toMatch(/volumes/);
    expect(lista.materiais.find((m) => m.descricao.startsWith("Caixa 4x2"))!.quantidade).toBeGreaterThan(0);
  });

  it("ajustes do usuário mudam interruptor e quantidades", () => {
    const sala = ex.dados.projeto!.ambientes[0];
    const l2 = listaDePontos({ ...ex.dados, pontos: { ajustes: { [sala.id]: { interruptor: "paralelo", interruptores: 2, pontosLuz: 3 } }, feitos: [] } }, analise);
    const b = l2.ambientes.find((a) => a.chave === sala.id)!;
    expect(b.pontos.find((p) => p.tipo === "luz")!.quantidade).toBe(3);
    expect(b.pontos.find((p) => p.tipo === "interruptor")!.descricao).toMatch(/paralelo/);
  });

  it("quadro do zero agrupa os circuitos pelo local", () => {
    const q = { ...novoQuadro(), circuitos: [novoCircuito({ tipo: "tug", local: "cozinha", potenciaW: 1800, quantidadePontos: 3 }), novoCircuito({ tipo: "iluminacao", local: "sala", potenciaW: 200, quantidadePontos: 2 })] };
    const l = listaDePontos(q, analisarQuadro(q));
    expect(l.origem).toBe("circuitos");
    expect(l.totais.tug).toBe(3);
    expect(l.totais.pontosLuz).toBe(2);
    expect(l.totais.interruptores).toBeGreaterThan(0);
  });

  it("converte em kits para o orçamento", () => {
    const { kits } = kitsDaLista(lista);
    expect(kits.find((k) => k.chave === "tomada-10a-embutida")!.quantidade).toBe(lista.totais.tug);
  });
});
