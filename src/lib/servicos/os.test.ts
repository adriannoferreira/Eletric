import { describe, expect, it } from "vitest";
import {
  conflitos,
  deDataHoraLocal,
  diaLocal,
  formatarDuracao,
  idsEmConflito,
  inicioDaSemana,
  osAtrasada,
  paraDataHoraLocal,
  podeMudar,
  totalMinutos,
} from "./os";

const d = (s: string) => new Date(s);

describe("conflitos de horário", () => {
  it("detecta sobreposição e ignora encostadas", () => {
    const v = [
      { id: 1, inicio: d("2026-10-20T12:00:00Z"), duracaoMin: 120 },
      { id: 2, inicio: d("2026-10-20T13:30:00Z"), duracaoMin: 60 },
      { id: 3, inicio: d("2026-10-20T14:30:00Z"), duracaoMin: 30 },
    ];
    expect(conflitos(v).map(([a, b]) => [a.id, b.id])).toEqual([[1, 2]]);
    expect([...idsEmConflito(v)].sort()).toEqual([1, 2]);
  });
  it("sem visitas, sem conflito", () => {
    expect(conflitos([])).toEqual([]);
  });
});

describe("horas", () => {
  it("soma registros fechados e abertos", () => {
    const agora = d("2026-10-20T15:00:00Z");
    const regs = [
      { inicio: d("2026-10-20T12:00:00Z"), fim: d("2026-10-20T13:30:00Z") },
      { inicio: d("2026-10-20T14:15:00Z"), fim: null },
    ];
    expect(totalMinutos(regs, agora)).toBe(135);
    expect(formatarDuracao(135)).toBe("2 h 15 min");
    expect(formatarDuracao(45)).toBe("45 min");
    expect(formatarDuracao(120)).toBe("2 h");
  });
});

describe("status", () => {
  it("respeita transições", () => {
    expect(podeMudar("agendada", "em_andamento")).toBe(true);
    expect(podeMudar("agendada", "concluida")).toBe(false);
    expect(podeMudar("pausada", "concluida")).toBe(true);
    expect(podeMudar("cancelada", "agendada")).toBe(true);
  });
  it("marca atrasada", () => {
    const agora = d("2026-10-21T12:00:00Z");
    const visitas = [{ inicio: d("2026-10-20T12:00:00Z"), duracaoMin: 60, status: "agendada" }];
    expect(osAtrasada("agendada", visitas, agora)).toBe(true);
    expect(osAtrasada("concluida", visitas, agora)).toBe(false);
    expect(osAtrasada("agendada", [{ ...visitas[0], status: "realizada" }], agora)).toBe(false);
  });
});

describe("datas em Belém (UTC−3)", () => {
  it("converte ida e volta", () => {
    const x = deDataHoraLocal("2026-10-20T08:30")!;
    expect(x.toISOString()).toBe("2026-10-20T11:30:00.000Z");
    expect(paraDataHoraLocal(x)).toBe("2026-10-20T08:30");
    expect(diaLocal(d("2026-10-21T02:00:00Z"))).toBe("2026-10-20");
    expect(deDataHoraLocal("lixo")).toBeNull();
  });
  it("semana começa na segunda", () => {
    expect(inicioDaSemana("2026-10-18")).toBe("2026-10-12"); // domingo
    expect(inicioDaSemana("2026-10-20")).toBe("2026-10-19"); // terça
  });
});
