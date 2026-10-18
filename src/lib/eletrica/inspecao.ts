/**
 * Checklist de verificação final — ABNT NBR 5410 seção 7 (inspeção visual
 * 7.2 e ensaios 7.3), gerado a partir do QuadroDados: itens gerais + itens
 * específicos por circuito, DR e DPS. Limites marcados com `conferir` devem
 * ser confirmados na edição vigente da norma.
 */
import { analisarQuadro } from "./calculo";
import { peca } from "./pecas";
import {
  type Fase,
  fasesDisponiveis,
  type Inspecao,
  novoId,
  type QuadroDados,
  type RespostaInspecao,
} from "./tipos";

export type SecaoInspecao = "visual" | "ensaio";

export interface Limite {
  tipo: "min" | "max" | "faixa";
  valor: number;
  valor2?: number;
}

export interface Medicao {
  rotulo: string;
  unidade: string;
  limite?: Limite;
  /** Segunda medição do mesmo item (ex.: tempo de disparo do DR). */
  segunda?: { rotulo: string; unidade: string; limite?: Limite };
  /** Limite não confirmado — mostrar "conferir na edição vigente". */
  conferir?: string;
}

export interface ItemInspecao {
  id: string;
  secao: SecaoInspecao;
  grupo: string;
  titulo: string;
  referencia: string;
  medicao?: Medicao;
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

export function textoLimite(l?: Limite, unidade = "") {
  if (!l) return "";
  if (l.tipo === "min") return `≥ ${fmt(l.valor)} ${unidade}`;
  if (l.tipo === "max") return `≤ ${fmt(l.valor)} ${unidade}`;
  return `${fmt(l.valor)} a ${fmt(l.valor2 ?? l.valor)} ${unidade}`;
}

export function dentroDoLimite(valor: number | null, l?: Limite): boolean | null {
  if (valor === null || !l) return null;
  if (l.tipo === "min") return valor >= l.valor;
  if (l.tipo === "max") return valor <= l.valor;
  return valor >= l.valor && valor <= (l.valor2 ?? l.valor);
}

/** Faixas de tensão adequada em regime permanente — ANEEL PRODIST Módulo 8 (conferir revisão vigente). */
export function faixaTensao(nominal: number): Limite {
  const faixas: Record<number, [number, number]> = {
    127: [117, 133],
    220: [202, 231],
    380: [350, 399],
  };
  const f = faixas[nominal] ?? [nominal * 0.92, nominal * 1.05];
  return { tipo: "faixa", valor: f[0], valor2: f[1] };
}

/** Isolamento mínimo — NBR 5410 Tabela 60 (até 500 V: ensaio 500 V cc, ≥ 0,5 MΩ). A IEC 60364-6 atual pede 1 MΩ. */
export const ISOLAMENTO_MIN_MOHM = 0.5;

export function gerarChecklist(q: QuadroDados): ItemInspecao[] {
  const itens: ItemInspecao[] = [];
  const a = q.alimentacao;
  const analise = analisarQuadro(q);
  const comps = q.componentes.map((c) => ({ c, p: peca(c.pecaId) }));
  const v = (id: string, grupo: string, titulo: string, referencia = "NBR 5410 7.2") =>
    itens.push({ id, secao: "visual", grupo, titulo, referencia });

  // ---------------- Inspeção visual (7.2) ----------------
  v("vis:identificacao", "Quadro", "Circuitos identificados no quadro (etiquetas) e diagrama unifilar/legenda disponível", "NBR 5410 6.1.5 / 7.2");
  v("vis:cores", "Quadro", "Cores dos condutores: neutro azul-claro, PE verde-amarelo (ou verde), fases em outras cores", "NBR 5410 6.1.5.3");
  v("vis:conexoes", "Quadro", "Conexões apertadas, com terminais/ponteiras, sem condutores expostos ou danificados", "NBR 5410 6.2.8 / 7.2");
  v("vis:barras", "Quadro", "Barramentos de neutro e PE separados e isolados entre si no QDC (sem ponte N–PE)", "NBR 5410 6.4.3");
  v("vis:tampa", "Quadro", "Tampa/espelho instalado, sem partes vivas acessíveis; módulos livres fechados com tampa cega", "NBR 5410 5.1.2.2 / 6.5.4");
  v("vis:reserva", "Quadro", `Espaço reserva disponível (mínimo ${analise.reservaExigida} módulo(s) para ${q.circuitos.length} circuito(s))`, "NBR 5410 6.5.4.7");
  v("vis:ip", "Quadro", "Grau de proteção do quadro adequado ao local (IP, umidade, poeira)", "NBR 5410 5.2 / 6.1.3");
  v("vis:advertencia", "Quadro", "Sinalização de advertência “Perigo — risco de choque elétrico” na tampa", "NR-10 10.10 / NBR 5410 6.5.4");
  v("vis:geral", "Quadro", "Dispositivo geral de seccionamento acessível e identificado", "NBR 5410 5.6 / 6.5.4");
  v("vis:aterramento", "Aterramento", "Eletrodo de aterramento e caixa de inspeção acessíveis; condutor de aterramento íntegro", "NBR 5410 6.4.1");
  v("vis:bep", "Aterramento", "Equipotencialização principal (BEP) interligando PE, eletrodo e tubulações metálicas", "NBR 5410 6.4.2");

  for (const { c, p } of comps) {
    if (p?.tipo === "dps") {
      v(`vis:dps:${c.id}`, "DPS", `DPS ${c.fases.join("") || "N-PE"} (${p.ucV} V): ligado ao PE com condutores curtos e indicador de estado normal`, "NBR 5410 6.3.5");
    }
  }
  analise.circuitos.forEach((r, i) => {
    const s = r.dim.secao;
    v(
      `vis:circ:${r.circuito.id}`,
      "Circuitos",
      `Circuito ${i + 1} — ${r.circuito.nome}: seção ${s ? `${fmt(s)} mm²` : "?"} e disjuntor ${r.pecaDisjuntor?.rotulo ?? "?"} conforme o projeto`,
      "NBR 5410 7.2 / 6.2",
    );
  });

  // ---------------- Ensaios (7.3) ----------------
  const e = (item: Omit<ItemInspecao, "secao">) => itens.push({ ...item, secao: "ensaio" });
  e({
    id: "ens:continuidade-pe",
    grupo: "Continuidade",
    titulo: "Continuidade dos condutores de proteção (PE) — do QDC até as tomadas/massas mais distantes",
    referencia: "NBR 5410 7.3.2",
    medicao: { rotulo: "Resistência", unidade: "Ω", limite: { tipo: "max", valor: 1 }, conferir: "A norma pede continuidade; o limite de 1 Ω é referência prática — conferir na edição vigente." },
  });
  e({
    id: "ens:continuidade-eq",
    grupo: "Continuidade",
    titulo: "Continuidade da equipotencialização principal e suplementar (banheiros)",
    referencia: "NBR 5410 7.3.2",
    medicao: { rotulo: "Resistência", unidade: "Ω", limite: { tipo: "max", valor: 1 }, conferir: "Referência prática — conferir na edição vigente." },
  });
  analise.circuitos.forEach((r, i) => {
    e({
      id: `ens:iso:${r.circuito.id}`,
      grupo: "Resistência de isolamento",
      titulo: `Circuito ${i + 1} — ${r.circuito.nome}: isolamento entre condutores vivos e entre vivos e PE`,
      referencia: "NBR 5410 7.3.3 / Tabela 60",
      medicao: {
        rotulo: "Isolamento",
        unidade: "MΩ",
        limite: { tipo: "min", valor: ISOLAMENTO_MIN_MOHM },
        conferir: "Tabela 60 (até 500 V): ensaio em 500 V cc, mínimo 0,5 MΩ; a IEC 60364-6 atual pede 1 MΩ — conferir na edição vigente.",
      },
    });
  });
  comps
    .filter((x) => x.p?.tipo === "dr")
    .forEach(({ c, p }, i) => {
      const idn = p?.sensibilidadeMa ?? 30;
      e({
        id: `ens:dr-botao:${c.id}`,
        grupo: "DR",
        titulo: `${c.etiqueta || `DR ${i + 1}`} (${p?.correnteNominal} A ${idn} mA): disparo pelo botão de teste “T”`,
        referencia: "NBR 5410 7.3.5",
      });
      e({
        id: `ens:dr-medido:${c.id}`,
        grupo: "DR",
        titulo: `${c.etiqueta || `DR ${i + 1}`}: corrente e tempo de disparo com instrumento (se disponível)`,
        referencia: "NBR 5410 7.3.5 / NBR NM 61008",
        medicao: {
          rotulo: "Corrente de disparo",
          unidade: "mA",
          limite: { tipo: "faixa", valor: idn / 2, valor2: idn },
          segunda: { rotulo: "Tempo a IΔn", unidade: "ms", limite: { tipo: "max", valor: 300 } },
          conferir: "Disparo entre 50% e 100% de IΔn e em até 300 ms a IΔn (DR geral, NBR NM 61008) — conferir na edição vigente.",
        },
      });
    });
  e({
    id: "ens:aterramento",
    grupo: "Aterramento",
    titulo: "Resistência de aterramento do eletrodo",
    referencia: "NBR 5410 7.3.4 / 6.4.1",
    medicao: {
      rotulo: "Resistência",
      unidade: "Ω",
      limite: { tipo: "max", valor: 10 },
      conferir: "A NBR 5410 não fixa um valor único; 10 Ω é referência usual de concessionárias. Em TT vale RA × IΔn ≤ 50 V — conferir na norma da concessionária.",
    },
  });

  const fases = fasesDisponiveis(a);
  for (const f of fases) {
    e({
      id: `ens:v-fn:${f}`,
      grupo: "Tensões",
      titulo: `Tensão fase ${f} – neutro`,
      referencia: "ANEEL PRODIST Módulo 8",
      medicao: { rotulo: "Tensão", unidade: "V", limite: faixaTensao(a.tensaoFN), conferir: "Faixa de tensão adequada do PRODIST — conferir a revisão vigente." },
    });
  }
  if (fases.length > 1) {
    const pares: [Fase, Fase][] = fases.length === 2 ? [["R", "S"]] : [["R", "S"], ["S", "T"], ["T", "R"]];
    for (const [f1, f2] of pares) {
      e({
        id: `ens:v-ff:${f1}${f2}`,
        grupo: "Tensões",
        titulo: `Tensão entre fases ${f1}–${f2}`,
        referencia: "ANEEL PRODIST Módulo 8",
        medicao: { rotulo: "Tensão", unidade: "V", limite: faixaTensao(a.tensaoFF) },
      });
    }
  }
  e({
    id: "ens:v-npe",
    grupo: "Tensões",
    titulo: "Tensão entre neutro e PE no quadro",
    referencia: "Boa prática",
    medicao: { rotulo: "Tensão", unidade: "V", limite: { tipo: "max", valor: 2 }, conferir: "Valor de referência prática (sem limite fixo na norma) — conferir." },
  });
  e({ id: "ens:polaridade", grupo: "Polaridade", titulo: "Polaridade: disjuntores unipolares no condutor de fase; fase/neutro corretos nas tomadas", referencia: "NBR 5410 7.3.7" });
  if (fases.length === 3) {
    e({ id: "ens:sequencia", grupo: "Polaridade", titulo: "Sequência de fases (motores e cargas trifásicas)", referencia: "NBR 5410 7.3.8" });
  }
  const geral = comps.find((x) => x.c.geral && x.p?.tipo === "disjuntor")?.p;
  for (const f of fases) {
    e({
      id: `ens:i:${f}`,
      grupo: "Balanceamento",
      titulo: `Corrente na fase ${f} com a instalação em carga`,
      referencia: "Balanceamento de fases",
      medicao: { rotulo: "Corrente", unidade: "A", limite: geral?.correnteNominal ? { tipo: "max", valor: geral.correnteNominal } : undefined },
    });
  }
  return itens;
}

export type ResultadoItem = "ok" | "nc" | "na" | "pendente";

/** Situação do item: escolha do usuário; se não houver, deduz pela medição. */
export function resultadoItem(item: ItemInspecao, r?: RespostaInspecao): ResultadoItem {
  if (r?.status) return r.status;
  if (!item.medicao || !r) return "pendente";
  const v1 = dentroDoLimite(r.valor, item.medicao.limite);
  const v2 = item.medicao.segunda ? dentroDoLimite(r.valor2, item.medicao.segunda.limite) : null;
  if (v1 === false || v2 === false) return "nc";
  if (v1 === true && (v2 === true || v2 === null)) return "ok";
  return "pendente";
}

export interface ResumoInspecao {
  total: number;
  ok: number;
  nc: number;
  na: number;
  pendentes: number;
  resultado: "aprovado" | "pendencias" | "incompleta";
  naoConformes: { item: ItemInspecao; resposta?: RespostaInspecao }[];
  desequilibrioPct: number | null;
}

export function resumirInspecao(itens: ItemInspecao[], insp: Inspecao): ResumoInspecao {
  const mapa = new Map(insp.respostas.map((r) => [r.itemId, r]));
  let ok = 0;
  let nc = 0;
  let na = 0;
  let pendentes = 0;
  const naoConformes: ResumoInspecao["naoConformes"] = [];
  for (const it of itens) {
    const res = resultadoItem(it, mapa.get(it.id));
    if (res === "ok") ok++;
    else if (res === "na") na++;
    else if (res === "nc") {
      nc++;
      naoConformes.push({ item: it, resposta: mapa.get(it.id) });
    } else pendentes++;
  }
  const correntes = itens
    .filter((i) => i.id.startsWith("ens:i:"))
    .map((i) => mapa.get(i.id)?.valor)
    .filter((x): x is number => typeof x === "number");
  const max = Math.max(...correntes);
  const desequilibrioPct = correntes.length > 1 && max > 0 ? ((max - Math.min(...correntes)) / max) * 100 : null;
  return {
    total: itens.length,
    ok,
    nc,
    na,
    pendentes,
    resultado: nc > 0 ? "pendencias" : pendentes > 0 ? "incompleta" : "aprovado",
    naoConformes,
    desequilibrioPct,
  };
}

export function novaInspecao(responsavel = ""): Inspecao {
  return {
    id: novoId("i"),
    data: new Date().toISOString(),
    responsavel,
    instrumentos: [],
    tensaoEnsaioV: 500,
    respostas: [],
    analiseIA: null,
  };
}

/** Texto das não conformidades e medições para a IA analisar. */
export function descreverInspecao(itens: ItemInspecao[], insp: Inspecao) {
  const mapa = new Map(insp.respostas.map((r) => [r.itemId, r]));
  const linhas: string[] = [];
  for (const it of itens) {
    const r = mapa.get(it.id);
    const res = resultadoItem(it, r);
    if (res === "pendente" && !r?.valor) continue;
    const med = it.medicao && r?.valor !== null && r?.valor !== undefined
      ? ` — medido ${fmt(r.valor)} ${it.medicao.unidade} (limite ${textoLimite(it.medicao.limite, it.medicao.unidade)})${
          it.medicao.segunda && r.valor2 !== null ? `; ${it.medicao.segunda.rotulo} ${fmt(r.valor2)} ${it.medicao.segunda.unidade}` : ""
        }`
      : "";
    linhas.push(`- [${res.toUpperCase()}] ${it.titulo}${med}${r?.obs ? ` — obs.: ${r.obs}` : ""} (${it.referencia})`);
  }
  return linhas.join("\n");
}
