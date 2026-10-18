import { describe, expect, it } from "vitest";
import { duplicarComponente, moverComponente, ocupacao } from "@/components/quadro/montagem";
import { analisarQuadro } from "./calculo";
import { EXEMPLOS, quadroExemplo } from "./exemplos";
import { gerarLigacoes } from "./ligacoes";
import { alternarInverter, corPonteira, energizacao, ponteirasPorBitola, pontasComPonteira } from "./simulador";
import type { QuadroDados } from "./tipos";

const exemplo = (i = 1): QuadroDados => quadroExemplo(EXEMPLOS[i].id)!.dados;

describe("mover e duplicar", () => {
  it("move para posição livre e recusa sobreposição", () => {
    const q = exemplo();
    const mapa = ocupacao(q);
    const c = q.componentes.find((x) => !x.geral)!;
    // posição ocupada por outra peça
    const outra = q.componentes.find((x) => x.id !== c.id && x.fileira === c.fileira)!;
    expect(moverComponente(q, c.id, outra.fileira, outra.posicao)).toBeNull();
    // primeira posição livre de qualquer linha
    let livre: { f: number; p: number } | null = null;
    mapa.forEach((l, f) => l.forEach((v, p) => { if (!livre && v === null) livre = { f, p }; }));
    expect(livre).not.toBeNull();
    const movido = moverComponente(q, c.id, livre!.f, livre!.p);
    if (movido) {
      const m = movido.componentes.find((x) => x.id === c.id)!;
      expect([m.fileira, m.posicao]).toEqual([livre!.f, livre!.p]);
      // nenhuma posição com duas peças
      const total = ocupacao(movido).flat().filter(Boolean).length;
      expect(total).toBe(ocupacao(q).flat().filter(Boolean).length);
    }
  });

  it("fora da linha é recusado", () => {
    const q = exemplo();
    const c = q.componentes[0];
    expect(moverComponente(q, c.id, 99, 0)).toBeNull();
    expect(moverComponente(q, c.id, c.fileira, -1)).toBeNull();
  });

  it("duplica sem circuito e sem sobrepor", () => {
    const q = exemplo();
    const c = q.componentes.find((x) => x.circuitoId)!;
    const r = duplicarComponente(q, c.id)!;
    expect(r).not.toBeNull();
    const nova = r.quadro.componentes.find((x) => x.id === r.id)!;
    expect(nova.pecaId).toBe(c.pecaId);
    expect(nova.circuitoId).toBeNull();
    expect(nova.geral).toBe(false);
    const ocupados = ocupacao(r.quadro).flat().filter((v) => v === r.id).length;
    expect(ocupados).toBeGreaterThan(0);
  });
});

describe("ponteiras", () => {
  it("cor pelo código DIN 46228-4", () => {
    expect(corPonteira(1.5).cor).toBe("preta");
    expect(corPonteira(2.5).cor).toBe("azul");
    expect(corPonteira(4).cor).toBe("cinza");
    expect(corPonteira(6).cor).toBe("amarela");
    expect(corPonteira(10).cor).toBe("vermelha");
  });

  it("conta uma por ponta de cabo em borne, por bitola", () => {
    const q = exemplo();
    const r = gerarLigacoes(q, analisarQuadro(q));
    const itens = ponteirasPorBitola(r);
    const total = itens.reduce((s, i) => s + i.quantidade, 0);
    expect(total).toBe(pontasComPonteira(r).length);
    expect(total).toBeGreaterThan(0);
    // pente nunca leva ponteira
    expect(pontasComPonteira(r).some((x) => x.ligacao.modo === "pente")).toBe(false);
    // ordenado por seção
    expect(itens.map((i) => i.secao)).toEqual([...itens.map((i) => i.secao)].sort((a, b) => a - b));
  });
});

describe("energização", () => {
  const preparar = () => {
    const q = exemplo();
    const r = gerarLigacoes(q, analisarQuadro(q));
    return { q, r };
  };

  it("tudo ligado: todas as saídas de fase com tensão", () => {
    const { q, r } = preparar();
    const e = energizacao(q, r);
    const saidasF = r.ligacoes.filter((l) => l.para.k === "saida" && l.funcao === "F");
    expect(saidasF.length).toBeGreaterThan(0);
    for (const l of saidasF) expect(e.ligacoes.has(l.id)).toBe(true);
  });

  it("desligar um disjuntor apaga só o seu circuito (fase e neutro)", () => {
    const { q, r } = preparar();
    const dj = q.componentes.find((c) => c.circuitoId && !c.geral)!;
    const e = energizacao(q, r, new Set([dj.id]));
    for (const l of r.ligacoes.filter((x) => x.para.k === "saida")) {
      const doCircuito = l.para.k === "saida" && l.para.circuitoId === dj.circuitoId;
      if (l.funcao === "PE") continue;
      expect(e.ligacoes.has(l.id)).toBe(!doCircuito);
    }
  });

  it("desligar o geral apaga todas as saídas", () => {
    const { q, r } = preparar();
    const geral = q.componentes.find((c) => c.geral)!;
    const e = energizacao(q, r, new Set([geral.id]));
    for (const l of r.ligacoes.filter((x) => x.para.k === "saida" && x.funcao === "F")) expect(e.ligacoes.has(l.id)).toBe(false);
  });

  it("desarmar um DR apaga os circuitos dele", () => {
    const { q, r } = preparar();
    const dr = q.componentes.find((c) => c.pecaId.startsWith("dr-") && !c.geral);
    if (!dr) return;
    const protegidos = new Set(q.circuitos.filter((c) => c.drId === dr.id).map((c) => c.id));
    if (!protegidos.size) return;
    const e = energizacao(q, r, new Set([dr.id]));
    for (const l of r.ligacoes) {
      if (l.para.k !== "saida" || l.funcao !== "F") continue;
      expect(e.ligacoes.has(l.id)).toBe(!protegidos.has(l.para.circuitoId));
    }
  });

  it("inverter alimentação alterna o ajuste da peça", () => {
    const q = exemplo();
    const id = q.componentes[1].id;
    const a = alternarInverter(q, id);
    expect(a.ligacoes?.pecas[id]?.inverter).toBe(true);
    const b = alternarInverter(a, id);
    expect(b.ligacoes?.pecas[id]).toBeUndefined();
  });
});
