import { describe, expect, it } from "vitest";
import { carregadorVE, consumoMensal, correnteMotor, estimarBTU, estimarSolar, luminarias, ocupacaoEletroduto, taxaMaxima } from "./calculos";

describe("calculadoras de campo", () => {
  it("BTU por área, pessoas e sol", () => {
    expect(estimarBTU({ areaM2: 15, solTarde: false, pessoas: 2, eletronicos: 1 })).toEqual({ btu: 10200, sugerido: 12000 });
    expect(estimarBTU({ areaM2: 12, solTarde: true, pessoas: 1, eletronicos: 0 }).btu).toBe(9600);
  });
  it("luminotécnico pelo método dos lúmens", () => {
    const r = luminarias({ lux: 500, areaM2: 12, lumensPorLuminaria: 1800, utilizacao: 0.6, manutencao: 0.8 });
    expect(r.fluxoTotal).toBe(12500);
    expect(r.quantidade).toBe(7);
    expect(r.luxObtido).toBeGreaterThanOrEqual(500);
  });
  it("consumo mensal", () => {
    const r = consumoMensal([{ nome: "Chuveiro", watts: 5500, horasDia: 0.5, diasMes: 30, quantidade: 1 }], 1);
    expect(r.totalKWh).toBeCloseTo(82.5);
    expect(r.totalCusto).toBeCloseTo(82.5);
    expect(consumoMensal([], null).totalCusto).toBeNull();
  });
  it("corrente de motor trifásico", () => {
    const r = correnteMotor({ potencia: 1, unidade: "cv", tensao: 220, fases: 3, rendimento: 0.8, fp: 0.8 });
    expect(r.In).toBeCloseTo(3.02, 1);
    expect(r.contator).toBe(9);
    expect(r.correnteCabo).toBeCloseTo(r.In * 1.25);
  });
  it("solar desconta o custo de disponibilidade", () => {
    const r = estimarSolar({ consumoMensalKWh: 400, ligacao: "bi", hsp: 5, pr: 0.75, potenciaModuloW: 550, areaModuloM2: 2.6 });
    expect(r.compensar).toBe(350);
    expect(r.kWp).toBeCloseTo(3.11, 1);
    expect(r.modulos).toBe(6);
  });
  it("carregador VE", () => {
    const r = carregadorVE({ kW: 7.4, fases: 1, tensao: 220, bateriaKWh: 50, eficiencia: 0.9 });
    expect(r.I).toBeCloseTo(33.6, 0);
    expect(r.horasCargaCompleta).toBeCloseTo(7.5, 0);
  });
  it("ocupação de eletroduto", () => {
    expect(taxaMaxima(1)).toBe(0.53);
    expect(taxaMaxima(2)).toBe(0.31);
    expect(taxaMaxima(5)).toBe(0.4);
    const r = ocupacaoEletroduto([{ secao: "2,5", quantidade: 6 }], 19.0);
    expect(r.ok).toBe(true);
    const r2 = ocupacaoEletroduto([{ secao: "6", quantidade: 9 }], 15.4);
    expect(r2.ok).toBe(false);
    expect(r2.sugerido?.nome).toContain("DN");
  });
});
