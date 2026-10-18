import { describe, expect, it } from "vitest";
import { CAIXAS, LINHAS, cabeComReserva, caixaDoModelo, capacidadeTotal, filtrarCaixas, linhasDoModelo, modeloDaCaixa, trocarCaixa } from "./caixas";
import { EXEMPLOS, quadroExemplo } from "./exemplos";
import {
  ajustarFasesAoPente,
  cabosInternos,
  fasesEmSequencia,
  gerarLigacoes,
  secaoParaCorrente,
  terminaisDaPeca,
} from "./ligacoes";
import { larguraPeca, peca } from "./pecas";
import { posicionar } from "./projeto";
import { type Componente, LigacoesConfigSchema, novoQuadro, type QuadroDados } from "./tipos";

const exemplo = (id = EXEMPLOS[1].id) => quadroExemplo(id)!.dados;
const erros = (q: QuadroDados) => gerarLigacoes(q).alertas.filter((a) => a.nivel === "erro");
const comp = (pecaId: string, fileira: number, posicao: number, fases: Componente["fases"], extra: Partial<Componente> = {}): Componente => ({
  id: `${pecaId}@${fileira}.${posicao}`,
  pecaId,
  fileira,
  posicao,
  fases,
  circuitoId: null,
  geral: false,
  etiqueta: "",
  ...extra,
});

describe("caixas", () => {
  it("catálogo cobre do pequeno ao grande, com combinações reais de trilhos × módulos", () => {
    const din = filtrarCaixas({ padrao: "DIN" });
    const caps = new Set(din.map((c) => c.capacidade));
    for (const c of [4, 6, 8, 12, 16, 18, 24, 28, 32, 36, 40, 44, 48, 54, 56, 60, 72, 96, 120]) expect(caps.has(c)).toBe(true);
    for (const c of din) expect(c.fileiras * c.modulosPorFileira).toBe(c.capacidade);
    const de48 = new Set(din.filter((c) => c.capacidade === 48).map((c) => `${c.fileiras}x${c.modulosPorFileira}`));
    expect([...de48].sort()).toEqual(["2x24", "3x16", "4x12", "6x8"]);
    // Mesma capacidade em formatos diferentes: 24 = 2×12 (horizontal) ou 3×8 (vertical)
    const de24 = filtrarCaixas({ padrao: "DIN", capacidadeMin: 24 }).filter((c) => c.capacidade === 24);
    expect(de24.find((c) => c.fileiras === 2)?.orientacao).toBe("horizontal");
    expect(de24.find((c) => c.fileiras === 3)?.orientacao).toBe("vertical");
    // Cada linha de referência tem caixas
    for (const l of LINHAS) expect(filtrarCaixas({ linha: l.id }).length, l.id).toBeGreaterThan(0);
    expect(filtrarCaixas({ padrao: "NEMA" }).length).toBeGreaterThan(5);
    expect(new Set(CAIXAS.map((c) => c.id)).size).toBe(CAIXAS.length);
  });

  it("NEMA tem colunas no barramento + trilho DIN auxiliar", () => {
    const c = filtrarCaixas({ padrao: "NEMA", capacidadeMin: 24 })[0];
    const linhas = linhasDoModelo(modeloDaCaixa(c));
    expect(linhas.filter((l) => l.padrao === "NEMA")).toHaveLength(2);
    expect(linhas.at(-1)).toMatchObject({ padrao: "DIN", auxiliar: true });
  });

  it("modelo antigo sem caixaId encontra a caixa equivalente", () => {
    const q = novoQuadro({}, { fileiras: 2, modulosPorFileira: 12, instalacao: "embutir" });
    expect(caixaDoModelo(q.modelo)?.capacidade).toBe(24);
  });

  it("reserva: cabem menos disjuntores do que a capacidade bruta", () => {
    expect(cabeComReserva(12)).toBe(9); // 9 + 3 de reserva
    expect(cabeComReserva(24, 6)).toBe(14); // 6 ocupados + 14 + 4
  });

  it("trocar de caixa mantém posições e avisa o que não cabe", () => {
    const q = exemplo();
    const maior = filtrarCaixas({ padrao: "DIN", capacidadeMin: capacidadeTotal(q.modelo) + 12 })[0];
    const r = trocarCaixa(q.componentes, modeloDaCaixa(maior), larguraPeca);
    expect(r.naoCouberam).toHaveLength(0);
    const pequena = filtrarCaixas({ padrao: "DIN" })[0];
    expect(trocarCaixa(q.componentes, modeloDaCaixa(pequena), larguraPeca).naoCouberam.length).toBeGreaterThan(0);
    // Peça DIN não vai para coluna NEMA
    const nema = modeloDaCaixa(filtrarCaixas({ padrao: "NEMA", capacidadeMin: 42 })[0]);
    const rn = trocarCaixa(q.componentes, nema, larguraPeca);
    for (const c of rn.componentes) expect(linhasDoModelo(nema)[c.fileira].padrao).toBe("DIN");
  });

  it("gerador respeita a preferência de caixa e escolhe a menor que caiba", () => {
    const fila = Array.from({ length: 10 }, (_, i) => comp("dj-1p-C16", 0, i, ["R"]));
    const r = posicionar(fila, 3, { instalacao: "sobrepor", material: "metalico" });
    expect(r.modelo.instalacao).toBe("sobrepor");
    expect(r.modelo.material).toBe("metalico");
    expect(capacidadeTotal(r.modelo)).toBeGreaterThanOrEqual(13);
    const fixa = CAIXAS.find((c) => c.padrao === "DIN" && c.capacidade === 4)!;
    const r2 = posicionar(fila, 3, { caixaId: fixa.id });
    expect(r2.aviso).toMatch(/não comporta/);
  });
});

describe("terminais", () => {
  it("disjuntor: linha 1/3, carga 2/4", () => {
    const t = terminaisDaPeca(peca("dj-2p-C20")!, { fases: ["R", "S"] });
    expect(t.linha.map((x) => x.t)).toEqual(["1", "3"]);
    expect(t.carga.map((x) => x.t)).toEqual(["2", "4"]);
  });
  it("DR 2P com uma fase: polo N livre (N/N')", () => {
    const t = terminaisDaPeca(peca("dr-2p-40")!, { fases: ["R"] });
    expect(t.linha.map((x) => `${x.t}:${x.funcao}`)).toEqual(["1:F", "N:N"]);
    expect(t.carga.map((x) => x.t)).toEqual(["2", "N'"]);
  });
  it("DPS: L e PE", () => {
    const t = terminaisDaPeca(peca("dps-175-20")!, { fases: ["S"] });
    expect(t.linha[0]).toMatchObject({ t: "L", fase: "S" });
    expect(t.carga[0]).toMatchObject({ t: "PE", funcao: "PE" });
  });
});

describe("geração das ligações", () => {
  it("exemplos prontos saem sem erros de ligação", () => {
    for (const e of EXEMPLOS) expect(erros(quadroExemplo(e.id)!.dados), e.id).toEqual([]);
  });

  it("cada circuito tem saída de fase, neutro (se F-N) e PE", () => {
    const q = exemplo();
    const r = gerarLigacoes(q);
    for (const c of q.circuitos) {
      const s = r.ligacoes.filter((l) => l.circuitoId === c.id && l.para.k === "saida");
      expect(s.some((l) => l.funcao === "F")).toBe(true);
      expect(s.some((l) => l.funcao === "PE")).toBe(true);
      expect(s.some((l) => l.funcao === "N")).toBe(c.ligacao !== "FF");
    }
  });

  it("neutro de circuito com DR sai da barra do próprio DR, nunca da barra geral", () => {
    const q = exemplo();
    const r = gerarLigacoes(q);
    const comDR = q.circuitos.find((c) => c.drId && c.ligacao === "FN")!;
    const n = r.ligacoes.find((l) => l.id === `N:${comDR.id}`)!;
    expect(n.de).toMatchObject({ k: "barra", barra: `N:${comDR.drId}` });
    // N' do DR alimenta a barra do DR
    expect(r.ligacoes.some((l) => l.de.k === "term" && l.de.compId === comDR.drId && l.de.t === "N'")).toBe(true);
  });

  it("entrada chega no geral pelos terminais de linha (ímpares)", () => {
    const q = exemplo();
    const r = gerarLigacoes(q);
    const entradas = r.ligacoes.filter((l) => l.de.k === "entrada" && l.funcao === "F");
    expect(entradas.length).toBeGreaterThan(0);
    for (const l of entradas) expect(l.para.k === "term" && Number(l.para.t) % 2).toBe(1);
  });

  it("DPS ligado ao PE", () => {
    const q = exemplo();
    const r = gerarLigacoes(q);
    const dps = q.componentes.filter((c) => peca(c.pecaId)?.tipo === "dps");
    for (const d of dps) expect(r.ligacoes.some((l) => l.funcao === "PE" && l.de.k === "term" && l.de.compId === d.id)).toBe(true);
  });

  it("cores padrão: fases preto/vermelho/branco, neutro azul, PE verde-amarelo", () => {
    const r = gerarLigacoes(exemplo());
    for (const l of r.ligacoes) {
      if (l.modo === "pente" || l.modo === "barramento") continue;
      if (l.funcao === "N") expect(l.cor).toBe("azul");
      if (l.funcao === "PE") expect(l.cor).toBe("verde-amarelo");
      if (l.funcao === "F") expect(["preto", "vermelho", "branco"]).toContain(l.cor);
    }
  });

  it("cabos internos somados por seção e cor", () => {
    const c = cabosInternos(gerarLigacoes(exemplo()));
    expect(c.length).toBeGreaterThan(0);
    expect(c.every((x) => x.metros > 0)).toBe(true);
  });

  it("secaoParaCorrente segue a Tabela 36 (B1)", () => {
    expect(secaoParaCorrente(20)).toBe(2.5);
    expect(secaoParaCorrente(32)).toBe(4);
    expect(secaoParaCorrente(40)).toBe(6);
    expect(secaoParaCorrente(63)).toBe(16);
  });
});

describe("pentes", () => {
  const x = (pecaId: string, fases: Componente["fases"]) => ({ c: comp(pecaId, 0, 0, fases), p: peca(pecaId)! });
  it("sequência cíclica de fases vira pente", () => {
    expect(fasesEmSequencia([x("dj-1p-C16", ["R"]), x("dj-1p-C16", ["S"]), x("dj-1p-C16", ["R"])])).toEqual(["R", "S"]);
    expect(fasesEmSequencia([x("dj-1p-C16", ["R"]), x("dj-2p-C25", ["S", "R"]), x("dj-1p-C16", ["S"])])).toEqual(["R", "S"]);
    expect(fasesEmSequencia([x("dj-1p-C16", ["R"]), x("dj-1p-C16", ["R"])])).toEqual(["R"]);
  });
  it("fases fora de ordem não usam pente", () => {
    expect(fasesEmSequencia([x("dj-1p-C16", ["R"]), x("dj-1p-C16", ["R"]), x("dj-1p-C16", ["S"])])).toBeNull();
  });
  it("ajustar fases ao pente gera pentes nas sequências", () => {
    const q = ajustarFasesAoPente(exemplo());
    const r = gerarLigacoes(q);
    expect(r.pentes.length).toBeGreaterThan(0);
    expect(r.alertas.filter((a) => /sequência de um pente/.test(a.mensagem))).toHaveLength(0);
  });
});

describe("verificações", () => {
  const comConfig = (q: QuadroDados, cfg: Record<string, unknown>) => ({ ...q, ligacoes: LigacoesConfigSchema.parse(cfg) });

  it("fase em azul ou verde-amarelo é erro", () => {
    const q = comConfig(exemplo(), { cores: { R: "azul" } });
    expect(erros(q).some((a) => /exclusivo do neutro/.test(a.mensagem))).toBe(true);
  });

  it("neutro de circuito com DR ligado na barra geral é erro", () => {
    const base = exemplo();
    const c = base.circuitos.find((x) => x.drId && x.ligacao === "FN")!;
    const q = comConfig(base, { neutros: { [c.id]: "N" } });
    expect(erros(q).some((a) => /barra de neutro do próprio DR/.test(a.mensagem))).toBe(true);
  });

  it("cabo interno abaixo da seção exigida é erro", () => {
    const base = exemplo();
    const r = gerarLigacoes(base);
    const alvo = r.ligacoes.find((l) => l.secaoMinima && l.secaoMinima > 1.5 && l.modo === "cabo")!;
    const q = comConfig(base, { ajustes: { [alvo.id]: { secao: 1.5 } } });
    expect(erros(q).some((a) => /menor que o exigido/.test(a.mensagem))).toBe(true);
  });

  it("DR 2P em duas fases protegendo circuito F-N: falta neutro", () => {
    const base = exemplo();
    const dr = base.componentes.find((c) => peca(c.pecaId)?.tipo === "dr" && peca(c.pecaId)!.polos === 2 && !c.geral);
    if (!dr) return;
    const q = { ...base, componentes: base.componentes.map((c) => (c.id === dr.id ? { ...c, fases: ["R", "S"] as Componente["fases"] } : c)) };
    if (!q.circuitos.some((c) => c.drId === dr.id && c.ligacao === "FN")) return;
    expect(erros(q).some((a) => /neutro precisa passar pelo DR/.test(a.mensagem))).toBe(true);
  });

  it("DR invertido é erro", () => {
    const base = exemplo();
    const dr = base.componentes.find((c) => peca(c.pecaId)?.tipo === "dr")!;
    const q = comConfig(base, { pecas: { [dr.id]: { inverter: true } } });
    expect(erros(q).some((a) => /invertido/.test(a.mensagem))).toBe(true);
  });
});

describe("multifilar coerente com as ligações", () => {
  it("cada saída e cada borne das ligações aparecem no multifilar", async () => {
    const { gerarMultifilar, bornesDoMultifilar } = await import("./multifilar");
    for (const e of EXEMPLOS) {
      const q = quadroExemplo(e.id)!.dados;
      const m = gerarMultifilar(q);
      const condutores = new Set(m.grupos.flatMap((g) => g.colunas.flatMap((c) => c.condutores.map((x) => x.ligacaoId))));
      const saidas = m.ligacoes.ligacoes.filter((l) => l.para.k === "saida");
      expect(condutores.size, e.id).toBe(saidas.length);
      for (const l of saidas) expect(condutores.has(l.id)).toBe(true);
      const bornes = bornesDoMultifilar(m);
      for (const l of m.ligacoes.ligacoes)
        for (const p of [l.de, l.para]) if (p.k === "term") expect(bornes.has(`${p.compId}.${p.t}`), `${e.id} ${p.compId}.${p.t}`).toBe(true);
      // neutros após DR viram N1, N2…
      const comDR = m.grupos.filter((g) => g.dr && g.colunas.some((c) => c.condutores.some((x) => x.funcao === "N")));
      for (const g of comDR) for (const c of g.colunas) for (const x of c.condutores.filter((y) => y.funcao === "N")) expect(x.barra).toBe(g.neutro);
    }
  });
});
