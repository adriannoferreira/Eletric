import { describe, expect, it } from "vitest";
import { montarListaCompras } from "./compras";
import { quadroExemplo } from "./exemplos";
import { gerarChecklistManutencao, itensOrcamentoPendencias } from "./manutencao";
import { peca } from "./pecas";

const casa = quadroExemplo("casa-bi")!.dados;
const disjuntor = casa.componentes.map((c) => ({ c, p: peca(c.pecaId) })).find((x) => x.p?.tipo === "disjuntor" && !x.c.geral)!;
const { polos, curva, correnteNominal } = disjuntor.p!;
const nomeExato = `Disjuntor DIN ${polos}P curva ${curva} ${correnteNominal} A`;
const outraCorrente = `Disjuntor DIN ${polos}P curva ${curva} ${correnteNominal === 63 ? 50 : 63} A`;

describe("lista de compras usa a variante exata", () => {
  it("disjuntor: só a corrente/polos/curva exatos dão preço", () => {
    const so63 = montarListaCompras(casa, [{ tipo: "material", nome: outraCorrente, unidade: "un", preco: 99 }]);
    expect(so63.itens.find((i) => i.chave === `peca:${disjuntor.p!.id}`)?.precoUnitario).toBeNull();
    const exato = montarListaCompras(casa, [{ tipo: "material", nome: nomeExato, unidade: "un", preco: 21 }]);
    expect(exato.itens.find((i) => i.chave === `peca:${disjuntor.p!.id}`)?.precoUnitario).toBe(21);
  });
  it("disjuntor genérico (sem corrente) não serve de preço", () => {
    const generico = montarListaCompras(casa, [{ tipo: "material", nome: `Disjuntor DIN ${polos}P curva ${curva}`, unidade: "un", preco: 18 }]);
    expect(generico.itens.find((i) => i.chave === `peca:${disjuntor.p!.id}`)?.precoUnitario).toBeNull();
  });
  it("cabo: preço pela seção exata", () => {
    const lista = montarListaCompras(casa, [
      { tipo: "material", nome: "Cabo flexível 1,5 mm² 750 V", unidade: "m", preco: 2 },
      { tipo: "material", nome: "Cabo flexível 2,5 mm² 750 V", unidade: "m", preco: 3 },
    ]);
    const c25 = lista.itens.filter((i) => i.categoria === "cabos" && i.descricao.includes("2,5"));
    expect(c25.length).toBeGreaterThan(0);
    expect(c25.every((i) => i.precoUnitario === 3)).toBe(true);
  });
});

describe("orçamento de pendências da manutenção usa a variante exata", () => {
  const itens = gerarChecklistManutencao(casa);
  const temp = itens.find((i) => i.id === `man:temp:${disjuntor.c.id}`)!;
  const visita = { id: "v1", numero: 1, data: "2026-10-18", tecnico: "", trocas: [], recomendacoes: "", respostas: [{ itemId: temp.id, status: "pendente" as const, valor: null, obs: "" }] };
  it("troca do disjuntor com preço só da variante exata", () => {
    const errado = itensOrcamentoPendencias(casa, visita, [{ tipo: "material", nome: outraCorrente, unidade: "un", preco: 99 }], itens);
    expect(errado.find((i) => i.tipo === "material")?.semPreco).toBe(true);
    const certo = itensOrcamentoPendencias(casa, visita, [{ tipo: "material", nome: nomeExato, unidade: "un", preco: 21 }], itens);
    expect(certo.find((i) => i.tipo === "material")?.precoUnitario).toBe(21);
  });
});
