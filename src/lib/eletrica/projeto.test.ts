import { describe, expect, it } from "vitest";
import { analisarQuadro } from "./calculo";
import { EXEMPLOS, quadroExemplo } from "./exemplos";
import {
  balancearFases,
  calcularDemanda,
  dividirCircuitos,
  errosDoQuadro,
  fatorIluminacaoTug,
  gerarQuadro,
  iluminacaoMinimaVA,
  ligacaoDaCarga,
  preverAmbientes,
  projetoVazio,
  tomadasMinimas,
} from "./projeto";
import { novoCircuito, type Ambiente } from "./tipos";

const amb = (p: Partial<Ambiente>): Ambiente => ({
  id: Math.random().toString(36),
  nome: "X",
  tipo: "sala",
  areaM2: 10,
  perimetroM: 13,
  distanciaM: 10,
  luzVA: null,
  tomadas: null,
  ...p,
});

describe("previsão de cargas — NBR 5410 9.5.2", () => {
  it("iluminação: 100 VA até 6 m² e +60 VA a cada 4 m² inteiros", () => {
    expect(iluminacaoMinimaVA(4)).toBe(100);
    expect(iluminacaoMinimaVA(6)).toBe(100);
    expect(iluminacaoMinimaVA(9.9)).toBe(100);
    expect(iluminacaoMinimaVA(10)).toBe(160);
    expect(iluminacaoMinimaVA(16)).toBe(220);
  });
  it("tomadas mínimas por tipo de ambiente", () => {
    expect(tomadasMinimas({ tipo: "banheiro", areaM2: 4, perimetroM: 8 })).toBe(1);
    expect(tomadasMinimas({ tipo: "cozinha", areaM2: 10, perimetroM: 13 })).toBe(4); // 13/3,5 → 3,7 → 4
    expect(tomadasMinimas({ tipo: "cozinha", areaM2: 3, perimetroM: 6 })).toBe(2); // ≥ 2 sobre a bancada
    expect(tomadasMinimas({ tipo: "sala", areaM2: 16, perimetroM: 16 })).toBe(4); // 16/5 → 3,2 → 4
    expect(tomadasMinimas({ tipo: "varanda", areaM2: 6, perimetroM: 10 })).toBe(1);
    expect(tomadasMinimas({ tipo: "corredor", areaM2: 4, perimetroM: 9 })).toBe(1);
    expect(tomadasMinimas({ tipo: "corredor", areaM2: 8, perimetroM: 12 })).toBe(3);
  });
  it("600 VA nas 3 primeiras tomadas de áreas molhadas e 100 VA nas demais", () => {
    const [coz] = preverAmbientes([amb({ tipo: "cozinha", perimetroM: 13 })]);
    expect(coz.vaPorTomada).toEqual([600, 600, 600, 100]);
    expect(coz.tomadasVA).toBe(1900);
  });
  it("com mais de 6 tomadas molhadas no conjunto, 600 VA só nas 2 primeiras de cada ambiente", () => {
    const prev = preverAmbientes([amb({ tipo: "cozinha", perimetroM: 17 }), amb({ tipo: "area_servico", perimetroM: 10 })]);
    expect(prev[0].vaPorTomada.slice(0, 3)).toEqual([600, 600, 100]);
  });
  it("perímetro estimado pela área quando não informado", () => {
    const [s] = preverAmbientes([amb({ tipo: "sala", areaM2: 25, perimetroM: 0 })]);
    expect(s.tomadas).toBe(4); // 4·√25 = 20 m → 4
  });
});

describe("divisão de circuitos", () => {
  it("cozinha tem circuito de tomadas exclusivo e TUE vira circuito independente", () => {
    const p = projetoVazio();
    p.ambientes = [amb({ id: "s", nome: "Sala" }), amb({ id: "c", nome: "Cozinha", tipo: "cozinha" })];
    p.cargas = [
      { id: "t1", nome: "Chuveiro", tipo: "chuveiro", potenciaW: 7500, fatorPotencia: 1, tensaoV: 220, trifasico: false, quantidade: 2, ambienteId: null },
    ];
    const cs = dividirCircuitos(p).map((g) => g.circuito);
    expect(cs.filter((c) => c.tipo === "tue")).toHaveLength(2);
    expect(cs.find((c) => c.nome.startsWith("Tomadas Cozinha"))?.local).toBe("cozinha");
    expect(cs.filter((c) => c.tipo === "iluminacao").length).toBeGreaterThan(0);
    expect(cs.find((c) => c.tipo === "tue")?.ligacao).toBe("FF");
  });
  it("ligação da carga conforme a rede", () => {
    expect(ligacaoDaCarga({ tensaoV: 220, trifasico: false }, { tensaoFN: 127, tensaoFF: 220 }).ligacao).toBe("FF");
    expect(ligacaoDaCarga({ tensaoV: 220, trifasico: false }, { tensaoFN: 220, tensaoFF: 380 }).ligacao).toBe("FN");
    expect(ligacaoDaCarga({ tensaoV: 380, trifasico: true }, { tensaoFN: 220, tensaoFF: 380 }).ligacao).toBe("3F");
    expect(ligacaoDaCarga({ tensaoV: 110, trifasico: false }, { tensaoFN: 127, tensaoFF: 220 }).alerta).toBeTruthy();
  });
});

describe("demanda e categoria", () => {
  it("fator de iluminação/TUG por faixa", () => {
    expect(fatorIluminacaoTug(0.8)).toBe(0.86);
    expect(fatorIluminacaoTug(5)).toBe(0.52);
    expect(fatorIluminacaoTug(12)).toBe(0.24);
  });
  it("carga 220 V em rede 127/220 obriga bifásico", () => {
    const d = calcularDemanda(
      [novoCircuito({ tipo: "tue", potenciaW: 5500, ligacao: "FF" }), novoCircuito({ tipo: "tug", potenciaW: 1000 })],
      { tensaoFN: 127, tensaoFF: 220 },
    );
    expect(d.categoria).toBe("bifasico");
    expect(d.disjuntorGeralA).toBeGreaterThan(0);
  });
  it("carga pequena fica monofásica", () => {
    const d = calcularDemanda([novoCircuito({ tipo: "tug", potenciaW: 2000 })], { tensaoFN: 127, tensaoFF: 220 });
    expect(d.categoria).toBe("monofasico");
  });
});

describe("balanceamento", () => {
  it("distribui circuitos F-N entre as fases", () => {
    const cs = [1, 2, 3, 4].map(() => novoCircuito({ tipo: "tug", potenciaW: 1000, ligacao: "FN" }));
    const f = balancearFases(cs, { tipo: "bifasico", tensaoFN: 127, tensaoFF: 220, esquema: "TN-C-S" });
    const r = [...f.values()].filter((x) => x[0] === "R").length;
    expect(r).toBe(2);
  });
});

describe("geração do quadro", () => {
  it.each(EXEMPLOS.map((e) => [e.id]))("exemplo %s sai sem erros do motor", (id) => {
    const ex = quadroExemplo(id)!;
    expect(errosDoQuadro(ex.dados).map((e) => e.mensagem)).toEqual([]);
    const a = analisarQuadro(ex.dados);
    expect(a.modulosLivres).toBeGreaterThanOrEqual(a.reservaExigida);
    expect(ex.dados.componentes.some((c) => c.geral)).toBe(true);
  });
  it("todos os circuitos com DR quando drEmTodos", () => {
    const { dados } = gerarQuadro(EXEMPLOS[1].projeto());
    expect(dados.circuitos.every((c) => c.drId)).toBe(true);
    expect(dados.alimentacao.tipo).toBe("bifasico");
  });
  it("exemplo trifásico usa rede 220/380", () => {
    const { dados } = gerarQuadro(EXEMPLOS[2].projeto());
    expect(dados.alimentacao.tensaoFN).toBe(220);
  });
});

import { dentroDoLimite, faixaTensao, gerarChecklist, novaInspecao, resultadoItem, resumirInspecao } from "./inspecao";

describe("inspeção — NBR 5410 seção 7", () => {
  const q = quadroExemplo("casa-bi")!.dados;
  const itens = gerarChecklist(q);
  it("gera itens gerais, por circuito, por DR e por DPS", () => {
    expect(itens.filter((i) => i.id.startsWith("ens:iso:"))).toHaveLength(q.circuitos.length);
    expect(itens.filter((i) => i.id.startsWith("ens:dr-botao:")).length).toBeGreaterThan(0);
    expect(itens.filter((i) => i.id.startsWith("vis:dps:"))).toHaveLength(2);
    expect(itens.some((i) => i.id === "ens:v-ff:RS")).toBe(true);
    expect(itens.some((i) => i.id === "ens:sequencia")).toBe(false); // bifásico
  });
  it("limites", () => {
    expect(dentroDoLimite(0.3, { tipo: "min", valor: 0.5 })).toBe(false);
    expect(dentroDoLimite(125, faixaTensao(127))).toBe(true);
    expect(dentroDoLimite(240, faixaTensao(220))).toBe(false);
  });
  it("medição fora do limite vira não conforme; status manual prevalece", () => {
    const iso = itens.find((i) => i.id.startsWith("ens:iso:"))!;
    expect(resultadoItem(iso, { itemId: iso.id, status: null, valor: 0.2, valor2: null, obs: "" })).toBe("nc");
    expect(resultadoItem(iso, { itemId: iso.id, status: null, valor: 50, valor2: null, obs: "" })).toBe("ok");
    expect(resultadoItem(iso, { itemId: iso.id, status: "na", valor: 0.2, valor2: null, obs: "" })).toBe("na");
    const dr = itens.find((i) => i.id.startsWith("ens:dr-medido:"))!;
    expect(resultadoItem(dr, { itemId: dr.id, status: null, valor: 22, valor2: 350, obs: "" })).toBe("nc");
  });
  it("resumo: aprovado só com tudo respondido e sem não conformidades", () => {
    const insp = novaInspecao();
    expect(resumirInspecao(itens, insp).resultado).toBe("incompleta");
    insp.respostas = itens.map((i) => ({ itemId: i.id, status: "ok" as const, valor: null, valor2: null, obs: "" }));
    expect(resumirInspecao(itens, insp).resultado).toBe("aprovado");
    insp.respostas[0].status = "nc";
    expect(resumirInspecao(itens, insp).resultado).toBe("pendencias");
  });
});
