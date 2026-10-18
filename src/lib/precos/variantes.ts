/**
 * Variantes técnicas de materiais: cada item do catálogo pertence a uma família
 * (disjuntor, DR, cabo…) e tem atributos (polos, curva, corrente, seção…).
 * O preço só é usado quando os atributos críticos conferem exatamente —
 * um disjuntor de 20 A nunca recebe o preço de um de 63 A.
 */
import { z } from "zod";

const num = z.coerce.number().finite();
const texto = z.string().trim().min(1);

/** Atributos comuns a todas as famílias. */
const comum = {
  marca: texto.optional(),
  linha: texto.optional(),
};

export const FAMILIAS = {
  disjuntor_din: {
    nome: "Disjuntor DIN",
    schema: z.object({
      polos: z.coerce.number().int().min(1).max(4),
      curva: z.enum(["B", "C", "D"]).optional(),
      corrente: num,
      icnKa: num.optional(),
      norma: texto.optional(),
      ...comum,
    }),
    criticos: ["polos", "curva", "corrente"],
    opcionais: ["icnKa", "marca"],
  },
  disjuntor_nema: {
    nome: "Disjuntor NEMA",
    schema: z.object({
      polos: z.coerce.number().int().min(1).max(3),
      corrente: num,
      icnKa: num.optional(),
      ...comum,
    }),
    criticos: ["polos", "corrente"],
    opcionais: ["icnKa", "marca"],
  },
  dr: {
    nome: "DR (interruptor diferencial)",
    schema: z.object({
      polos: z.coerce.number().int().refine((p) => p === 2 || p === 4),
      corrente: num,
      idnMa: num,
      tipoDr: z.enum(["AC", "A", "B"]).optional(),
      ...comum,
    }),
    criticos: ["polos", "corrente", "idnMa"],
    opcionais: ["tipoDr", "marca"],
  },
  dps: {
    nome: "DPS",
    schema: z.object({
      classe: z.enum(["I", "II", "III"]),
      ucV: num,
      imaxKa: num,
      inKa: num.optional(),
      ...comum,
    }),
    criticos: ["classe", "ucV", "imaxKa"],
    opcionais: ["inKa", "marca"],
  },
  cabo_flexivel: {
    nome: "Cabo flexível",
    schema: z.object({
      secao: num,
      cor: texto.optional(),
      tensaoV: num.optional(),
      classe: texto.optional(),
      ...comum,
    }),
    criticos: ["secao"],
    opcionais: ["cor", "tensaoV", "marca"],
  },
  eletroduto_corrugado: {
    nome: "Eletroduto corrugado",
    schema: z.object({ diametro: texto, ...comum }),
    criticos: ["diametro"],
    opcionais: ["marca"],
  },
  tomada: {
    nome: "Tomada",
    schema: z.object({ corrente: num, padrao: texto.optional(), ...comum }),
    criticos: ["corrente"],
    opcionais: ["padrao", "marca"],
  },
  interruptor: {
    nome: "Interruptor",
    schema: z.object({ modelo: z.enum(["simples", "paralelo", "intermediario"]), teclas: num.optional(), ...comum }),
    criticos: ["modelo"],
    opcionais: ["teclas", "marca"],
  },
  haste: {
    nome: "Haste de aterramento",
    schema: z.object({ diametro: texto, comprimentoM: num, ...comum }),
    criticos: ["diametro", "comprimentoM"],
    opcionais: ["marca"],
  },
  quadro_caixa: {
    nome: "Quadro de distribuição",
    schema: z.object({ modulos: num, instalacao: z.enum(["embutir", "sobrepor"]).optional(), ...comum }),
    criticos: ["modulos"],
    opcionais: ["instalacao", "marca"],
  },
} as const;

export type Familia = keyof typeof FAMILIAS;
export type Atributos = Record<string, string | number>;
export type Especificacao = { familia: Familia; atributos: Atributos };

export const ehFamilia = (f: unknown): f is Familia => typeof f === "string" && f in FAMILIAS;

/** Valida e limpa os atributos de uma família (campos inválidos são descartados). */
export function limparAtributos(familia: Familia, atributos: Record<string, unknown>): Atributos {
  const r = FAMILIAS[familia].schema.partial().safeParse(atributos);
  const base = r.success ? r.data : {};
  return Object.fromEntries(Object.entries(base).filter(([, v]) => v !== undefined && v !== "")) as Atributos;
}

/** Os atributos críticos estão todos definidos? (Só assim dá para cotar.) */
export function especificacaoCompleta(e: Especificacao | null | undefined): boolean {
  if (!e) return false;
  return (FAMILIAS[e.familia].criticos as readonly string[]).every((k) => {
    if (e.familia === "disjuntor_din" && k === "curva") return e.atributos.curva !== undefined;
    return e.atributos[k] !== undefined;
  });
}

export function faltando(e: Especificacao): string[] {
  return (FAMILIAS[e.familia].criticos as readonly string[]).filter((k) => e.atributos[k] === undefined);
}

const fmt = (n: string | number) => String(n).replace(".", ",");

/** Nome padronizado gerado a partir dos atributos. */
export function nomeVariante({ familia, atributos: a }: Especificacao): string {
  const marca = a.marca ? ` — ${a.marca}${a.linha ? ` ${a.linha}` : ""}` : "";
  switch (familia) {
    case "disjuntor_din":
      return `Disjuntor DIN ${a.polos ?? "?"}P${a.curva ? ` curva ${a.curva}` : ""} ${a.corrente ? `${fmt(a.corrente)} A` : "(corrente?)"}${a.icnKa ? ` ${fmt(a.icnKa)} kA` : ""}${marca}`;
    case "disjuntor_nema":
      return `Disjuntor NEMA ${a.polos ?? "?"}P ${a.corrente ? `${fmt(a.corrente)} A` : "(corrente?)"}${a.icnKa ? ` ${fmt(a.icnKa)} kA` : ""}${marca}`;
    case "dr":
      return `DR ${a.polos ?? "?"}P ${a.corrente ? `${fmt(a.corrente)} A` : "(corrente?)"} ${a.idnMa ? `${fmt(a.idnMa)} mA` : "(IΔn?)"}${a.tipoDr ? ` tipo ${a.tipoDr}` : ""}${marca}`;
    case "dps":
      return `DPS classe ${a.classe ?? "?"} ${a.ucV ? `${fmt(a.ucV)} V` : "(Uc?)"} ${a.imaxKa ? `${fmt(a.imaxKa)} kA` : "(Imax?)"}${a.inKa ? ` (In ${fmt(a.inKa)} kA)` : ""}${marca}`;
    case "cabo_flexivel":
      return `Cabo flexível ${a.secao ? `${fmt(a.secao)} mm²` : "(seção?)"} ${a.tensaoV ? `${fmt(a.tensaoV)} V` : "750 V"}${a.cor ? ` ${a.cor}` : ""}${marca}`;
    case "eletroduto_corrugado":
      return `Eletroduto corrugado ${a.diametro ?? "(diâmetro?)"}${marca}`;
    case "tomada":
      return `Tomada ${a.padrao ?? "2P+T"} ${a.corrente ? `${fmt(a.corrente)} A` : "(corrente?)"} com placa${marca}`;
    case "interruptor":
      return `Interruptor ${a.modelo ?? "(tipo?)"}${a.teclas && Number(a.teclas) > 1 ? ` ${a.teclas} teclas` : ""} com placa${marca}`;
    case "haste":
      return `Haste de aterramento ${a.diametro ?? "?"} x ${a.comprimentoM ? `${fmt(a.comprimentoM)} m` : "?"}${marca}`;
    case "quadro_caixa":
      return `Quadro de distribuição${a.instalacao ? ` de ${a.instalacao}` : ""} ${a.modulos ? `${a.modulos} módulos DIN` : "(módulos?)"}${marca}`;
  }
}

/** Texto curto da especificação (usado em listas, prompts e cotações). */
export function textoEspecificacao(e: Especificacao): string {
  const rot: Record<string, string> = {
    polos: "polos",
    curva: "curva",
    corrente: "corrente (A)",
    icnKa: "Icn (kA)",
    idnMa: "IΔn (mA)",
    tipoDr: "tipo",
    classe: "classe",
    ucV: "Uc (V)",
    imaxKa: "Imax (kA)",
    inKa: "In (kA)",
    secao: "seção (mm²)",
    cor: "cor",
    tensaoV: "isolação (V)",
    diametro: "diâmetro",
    padrao: "padrão",
    modelo: "tipo",
    teclas: "teclas",
    comprimentoM: "comprimento (m)",
    modulos: "módulos",
    instalacao: "instalação",
    marca: "marca",
    linha: "linha",
    norma: "norma",
  };
  return Object.entries(e.atributos)
    .map(([k, v]) => `${rot[k] ?? k}: ${fmt(v)}`)
    .join(" · ");
}

// ---------------------------------------------------------------------------
// Inferência a partir do nome (itens antigos, cotações, ofertas da web)

export function normalizarTexto(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/²/g, "2")
    .replace(/\s+/g, " ")
    .trim();
}

const POLOS: Record<string, number> = { mono: 1, uni: 1, bi: 2, tri: 3, tetra: 4 };
const CORES = ["preto", "vermelho", "azul", "branco", "verde-amarelo", "verde", "amarelo", "marrom", "cinza"];
const nr = (s: string) => Number(s.replace(",", "."));

function polosDe(n: string): number | undefined {
  const m = n.match(/\b([1-4]) ?p\b|\b([1-4]) ?polos?\b/);
  if (m) return Number(m[1] ?? m[2]);
  const p = n.match(/\b(mono|uni|bi|tri|tetra)polar\b/);
  return p ? POLOS[p[1]] : undefined;
}

/** Tenta descobrir família e atributos a partir de um nome livre. */
export function inferirVariante(nome: string): Especificacao | null {
  const n = normalizarTexto(nome);
  const corrente = (() => {
    // Faixas como "10 a 63 A" não definem uma corrente.
    if (/\b\d{1,3} ?a ?\d{1,3} ?a\b|\bde \d{1,3} a \d{1,3}\b/.test(n)) return undefined;
    const m = n.match(/\b(\d{1,3}(?:[,.]\d)?) ?a\b/) ?? n.match(/\b[bcd] ?(\d{1,3})\b/);
    return m ? nr(m[1]) : undefined;
  })();

  if (/\b(dr|idr|interruptor diferencial|diferencial residual)\b/.test(n)) {
    const idn = n.match(/\b(\d{2,3}) ?ma\b/);
    const tipo = n.match(/\btipo (ac|a|b)\b/);
    return {
      familia: "dr",
      atributos: limparAtributos("dr", {
        polos: polosDe(n),
        corrente: n.match(/\b(\d{2,3}) ?a\b/)?.[1],
        idnMa: idn?.[1],
        tipoDr: tipo?.[1]?.toUpperCase(),
      }),
    };
  }
  if (/\bdps\b|protetor (contra )?surto/.test(n)) {
    const classe = n.match(/classe (iii|ii|i|[123])\b/)?.[1];
    const romano = { "1": "I", "2": "II", "3": "III" }[classe ?? ""] ?? classe?.toUpperCase();
    return {
      familia: "dps",
      atributos: limparAtributos("dps", {
        classe: romano,
        ucV: n.match(/\b(\d{3}) ?v\b/)?.[1],
        imaxKa: n.match(/\b(\d{1,3}) ?ka\b/)?.[1],
      }),
    };
  }
  if (/\bdisjuntor\b/.test(n) && !/disjuntor[- ]motor/.test(n)) {
    const nema = /\bnema\b/.test(n);
    const curva = n.match(/curva ([bcd])\b/)?.[1] ?? n.match(/\b([bcd]) ?\d{1,3}\b/)?.[1];
    const icn = n.match(/\b(\d{1,2}(?:[,.]\d)?) ?ka\b/)?.[1];
    const familia: Familia = nema ? "disjuntor_nema" : "disjuntor_din";
    return {
      familia,
      atributos: limparAtributos(familia, {
        polos: polosDe(n),
        curva: curva?.toUpperCase(),
        corrente,
        icnKa: icn ? nr(icn) : undefined,
      }),
    };
  }
  if (/\bcabo\b|\bfio\b/.test(n) && /mm ?2|mm\b/.test(n)) {
    const secao = n.match(/\b(\d{1,3}(?:[,.]\d)?) ?mm/)?.[1];
    const cor = CORES.find((c) => n.includes(c));
    const tensao = n.match(/\b(450|750|1000) ?v\b/)?.[1];
    return {
      familia: "cabo_flexivel",
      atributos: limparAtributos("cabo_flexivel", { secao: secao ? nr(secao) : undefined, cor, tensaoV: tensao }),
    };
  }
  if (/^eletroduto/.test(n)) {
    const d = n.match(/(\d+ \d\/\d|\d\/\d|\d+)"/)?.[1] ?? n.match(/\b(\d{2}) ?mm\b/)?.[1];
    return { familia: "eletroduto_corrugado", atributos: limparAtributos("eletroduto_corrugado", { diametro: d ? `${d}"`.replace(/(\d{2})"$/, "$1 mm") : undefined }) };
  }
  if (/^tomada\b/.test(n)) {
    const c = n.match(/\b(10|20) ?a\b/)?.[1];
    return { familia: "tomada", atributos: limparAtributos("tomada", { corrente: c, padrao: /2p ?\+ ?t/.test(n) ? "2P+T" : undefined }) };
  }
  if (/^interruptor\b/.test(n) && !/seccionador|diferencial/.test(n)) {
    const modelo = /intermediario/.test(n) ? "intermediario" : /paralelo|three ?way/.test(n) ? "paralelo" : /simples/.test(n) ? "simples" : undefined;
    return { familia: "interruptor", atributos: limparAtributos("interruptor", { modelo }) };
  }
  if (/^haste\b/.test(n)) {
    const d = n.match(/(\d\/\d)"/)?.[1];
    const c = n.match(/x ?(\d(?:[,.]\d+)?) ?m\b/)?.[1];
    return { familia: "haste", atributos: limparAtributos("haste", { diametro: d ? `${d}"` : undefined, comprimentoM: c ? nr(c) : undefined }) };
  }
  if (/\bquadro\b/.test(n) && /modulo|disjuntores|din/.test(n)) {
    const mod = n.match(/\b(\d{1,3}) ?(modulos|disjuntores)\b/)?.[1];
    const inst = /sobrepor/.test(n) ? "sobrepor" : /embutir/.test(n) ? "embutir" : undefined;
    return { familia: "quadro_caixa", atributos: limparAtributos("quadro_caixa", { modulos: mod, instalacao: inst }) };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Casamento exato

export interface ItemComVariante {
  tipo: string;
  nome: string;
  unidade: string;
  preco: number;
  familia?: string | null;
  atributos?: Record<string, unknown> | null;
}

/** Especificação do item: a gravada no catálogo ou, para itens antigos, a inferida pelo nome. */
export function especificacaoDoItem(item: ItemComVariante): (Especificacao & { inferida: boolean }) | null {
  if (ehFamilia(item.familia)) {
    return { familia: item.familia, atributos: limparAtributos(item.familia, item.atributos ?? {}), inferida: false };
  }
  const e = inferirVariante(item.nome);
  return e ? { ...e, inferida: true } : null;
}

const igual = (a: string | number, b: string | number) =>
  typeof a === "number" || typeof b === "number"
    ? Math.abs(Number(a) - Number(b)) < 1e-6
    : normalizarTexto(String(a)) === normalizarTexto(String(b));

/**
 * O item atende à especificação pedida?
 * - Atributo crítico pedido: o item precisa ter o mesmo valor (sem ele, não serve).
 * - Atributo opcional pedido (cor, marca, Icn…): se o item define, tem de ser igual;
 *   se o item não define, aceita (ex.: cabo sem cor definida serve para qualquer cor).
 */
export function confere(pedido: Especificacao, item: Especificacao): { ok: boolean; divergencias: string[] } {
  if (pedido.familia !== item.familia) return { ok: false, divergencias: ["família"] };
  const f = FAMILIAS[pedido.familia];
  const divergencias: string[] = [];
  for (const k of f.criticos as readonly string[]) {
    const v = pedido.atributos[k];
    if (v === undefined) continue;
    const w = item.atributos[k];
    if (w === undefined || !igual(v, w)) divergencias.push(k);
  }
  for (const k of f.opcionais as readonly string[]) {
    const v = pedido.atributos[k];
    const w = item.atributos[k];
    if (v !== undefined && w !== undefined && !igual(v, w)) divergencias.push(k);
  }
  return { ok: divergencias.length === 0, divergencias };
}

export type ResultadoVariante<T> =
  | { status: "ok"; item: T; inferida: boolean }
  | { status: "inexistente"; motivo: string };

/**
 * Encontra no catálogo o material com família + atributos exatos.
 * Nunca devolve o preço de outra corrente/seção: sem correspondência → "inexistente".
 */
export function resolverVariante<T extends ItemComVariante>(catalogo: T[], pedido: Especificacao): ResultadoVariante<T> {
  if (!especificacaoCompleta(pedido)) {
    return { status: "inexistente", motivo: `especificação incompleta (falta: ${faltando(pedido).join(", ")})` };
  }
  let melhor: { item: T; inferida: boolean; pontos: number } | null = null;
  for (const item of catalogo) {
    if (item.tipo !== "material") continue;
    const e = especificacaoDoItem(item);
    if (!e || !especificacaoCompleta(e) || !confere(pedido, e).ok) continue;
    const f = FAMILIAS[pedido.familia];
    const pontos =
      (e.inferida ? 0 : 10) +
      (item.preco > 0 ? 5 : 0) +
      (f.opcionais as readonly string[]).filter((k) => pedido.atributos[k] !== undefined && e.atributos[k] !== undefined).length;
    if (!melhor || pontos > melhor.pontos) melhor = { item, inferida: e.inferida, pontos };
  }
  return melhor
    ? { status: "ok", item: melhor.item, inferida: melhor.inferida }
    : { status: "inexistente", motivo: `nenhum item do catálogo é "${nomeVariante(pedido)}"` };
}

// ---------------------------------------------------------------------------
// Unidades (cabo por metro × rolo de 100 m, peça × caixa)

/** Quantas unidades-base (m ou un) há numa unidade comercial, ex.: "rolo 100 m" → 100 m. */
export function lerUnidade(u: string): { base: "m" | "un" | "kg"; fator: number } | null {
  const n = normalizarTexto(u);
  const metros = n.match(/(\d+(?:[,.]\d+)?) ?m(etros?)?\b/);
  if (/rolo|bobina|lance/.test(n)) return { base: "m", fator: metros ? nr(metros[1]) : 100 };
  if (metros && !/mm/.test(n)) return { base: "m", fator: nr(metros[1]) };
  if (/^(m|metro|metros|ml)$/.test(n)) return { base: "m", fator: 1 };
  const caixa = n.match(/(caixa|pacote|kit|cx|pct) ?(c\/|com|de)? ?(\d+)/);
  if (caixa) return { base: "un", fator: Number(caixa[3]) };
  if (/^(un|und|unid|unidade|pc|pç|peca|pca)s?$/.test(n)) return { base: "un", fator: 1 };
  if (/^kg$/.test(n)) return { base: "kg", fator: 1 };
  return null;
}

/** Converte o preço de uma oferta para a unidade do item do catálogo; null se forem incompatíveis. */
export function converterPreco(preco: number, unidadeOferta: string, unidadeItem: string): number | null {
  const o = lerUnidade(unidadeOferta);
  const i = lerUnidade(unidadeItem);
  if (!o || !i || o.base !== i.base) return null;
  return Math.round(((preco / o.fator) * i.fator) * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Grades e presets para criar variantes

export const GRADES: Partial<Record<Familia, Record<string, (string | number)[]>>> = {
  disjuntor_din: { polos: [1, 2, 3], curva: ["B", "C"], corrente: [6, 10, 16, 20, 25, 32, 40, 50, 63] },
  disjuntor_nema: { polos: [1, 2, 3], corrente: [10, 15, 20, 25, 30, 35, 40, 50, 60, 70] },
  dr: { polos: [2, 4], corrente: [25, 40, 63, 80], idnMa: [30] },
  dps: { classe: ["II"], ucV: [175, 275, 320], imaxKa: [20, 40, 45] },
  cabo_flexivel: { secao: [1.5, 2.5, 4, 6, 10, 16, 25, 35], cor: ["preto", "vermelho", "branco", "azul", "verde-amarelo"] },
  eletroduto_corrugado: { diametro: ['3/4"', '1"', '1 1/4"'] },
  tomada: { corrente: [10, 20] },
  interruptor: { modelo: ["simples", "paralelo", "intermediario"] },
  quadro_caixa: { modulos: [6, 12, 18, 24, 36, 48], instalacao: ["embutir", "sobrepor"] },
};

export const PRESETS: { nome: string; familia: Familia; combinacoes: Atributos[] }[] = [
  {
    nome: "Disjuntores residencial básico",
    familia: "disjuntor_din",
    combinacoes: [
      ...[10, 16, 20, 25, 32].map((corrente) => ({ polos: 1, curva: "C", corrente })),
      ...[6, 10].map((corrente) => ({ polos: 1, curva: "B", corrente })),
      ...[25, 32, 40, 50, 63].map((corrente) => ({ polos: 2, curva: "C", corrente })),
    ],
  },
  { nome: "DR residenciais", familia: "dr", combinacoes: [25, 40, 63].map((corrente) => ({ polos: 2, corrente, idnMa: 30 })) },
  { nome: "DPS residenciais", familia: "dps", combinacoes: [{ classe: "II", ucV: 275, imaxKa: 20 }, { classe: "II", ucV: 175, imaxKa: 20 }] },
  { nome: "Cabos mais usados (qualquer cor)", familia: "cabo_flexivel", combinacoes: [1.5, 2.5, 4, 6, 10, 16].map((secao) => ({ secao, tensaoV: 750 })) },
  { nome: "Tomadas 10 A e 20 A", familia: "tomada", combinacoes: [10, 20].map((corrente) => ({ corrente, padrao: "2P+T" })) },
];

/** Produto cartesiano das escolhas da grade. */
export function combinar(escolhas: Record<string, (string | number)[]>): Atributos[] {
  return Object.entries(escolhas)
    .filter(([, vs]) => vs.length > 0)
    .reduce<Atributos[]>((acc, [k, vs]) => acc.flatMap((a) => vs.map((v) => ({ ...a, [k]: v }))), [{}]);
}
