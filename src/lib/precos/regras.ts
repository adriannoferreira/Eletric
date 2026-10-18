import type { FontePreco } from "@/db/schema-precos";

export const DIA_MS = 86_400_000;

export const ROTULO_FONTE: Record<string, string> = {
  cotacao: "Cotação",
  ia: "Pesquisa IA",
  sinapi: "SINAPI",
  manual: "Manual",
  calculado: "Calculado",
};

export type EntradaPreco = { fonte: FontePreco; preco: number; data: Date };

export type Preferido = { preco: number; fonte: FontePreco; data: Date };

/**
 * Escolhe o preço que o catálogo deve usar a partir do histórico, nesta ordem:
 * cotação recente > pesquisa IA recente > SINAPI (+ margem de varejo) > manual.
 * Se nada se encaixar, usa o registro mais novo de qualquer fonte.
 */
export function precoPreferido(
  historico: EntradaPreco[],
  { margemSinapi, validadeDias, agora = new Date() }: { margemSinapi: number; validadeDias: number; agora?: Date },
): Preferido | null {
  if (historico.length === 0) return null;
  const limite = agora.getTime() - validadeDias * DIA_MS;
  const maisNovo = (fonte: FontePreco, soRecentes: boolean) =>
    historico
      .filter((h) => h.fonte === fonte && (!soRecentes || h.data.getTime() >= limite))
      .sort((a, b) => b.data.getTime() - a.data.getTime())[0];

  const cot = maisNovo("cotacao", true);
  if (cot) return cot;
  const ia = maisNovo("ia", true);
  if (ia) return ia;
  const sin = maisNovo("sinapi", false);
  if (sin) return { ...sin, preco: arred(sin.preco * (1 + margemSinapi / 100)) };
  const man = maisNovo("manual", false);
  if (man) return man;
  return [...historico].sort((a, b) => b.data.getTime() - a.data.getTime())[0];
}

export const arred = (v: number) => Math.round(v * 100) / 100;

export type ServicoHoras = {
  horasEletricista: number | null;
  horasAjudante: number | null;
  multiplicador: number;
  deslocamento: number | null;
};

/** Preço de um serviço pelo custo: horas × valor/hora × dificuldade × (1 + margem) + deslocamento. */
export function precoServico(
  s: ServicoHoras,
  { valorHora, valorHoraAjudante, margemServico }: { valorHora: number; valorHoraAjudante?: number | null; margemServico: number },
) {
  const ajudante = valorHoraAjudante ?? valorHora / 2;
  const custoHoras = (s.horasEletricista ?? 0) * valorHora + (s.horasAjudante ?? 0) * ajudante;
  return arred(custoHoras * (s.multiplicador || 1) * (1 + margemServico / 100) + (s.deslocamento ?? 0));
}

type ItemComPreco = ServicoHoras & { tipo: string; preco: number; precoFixo: boolean };

/** Preço usado de fato: serviços com preço calculado usam as horas; o resto usa o preço salvo. */
export function precoEfetivo(
  item: ItemComPreco,
  ctx: { valorHora: number | null; valorHoraAjudante?: number | null; margemServico: number },
) {
  if (
    item.tipo === "servico" &&
    !item.precoFixo &&
    ctx.valorHora &&
    ((item.horasEletricista ?? 0) > 0 || (item.horasAjudante ?? 0) > 0)
  ) {
    return precoServico(item, { ...ctx, valorHora: ctx.valorHora });
  }
  return item.preco;
}

/** Idade do preço em dias (null = nunca atualizado). */
export function idadeDias(data: Date | string | null | undefined, agora = new Date()) {
  if (!data) return null;
  const d = typeof data === "string" ? new Date(data) : data;
  return Math.max(0, Math.floor((agora.getTime() - d.getTime()) / DIA_MS));
}

export function desatualizado(data: Date | string | null | undefined, validadeDias: number, agora = new Date()) {
  const idade = idadeDias(data, agora);
  return idade === null || idade > validadeDias;
}

/** Normaliza texto para comparação (sem acento, minúsculo, só letras/números). */
export function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}

const PARADAS = new Set(["de", "da", "do", "das", "dos", "com", "para", "e", "em", "a", "o", "un", "m", "x"]);

/** Similaridade simples por palavras em comum (0 a 1), boa para casar descrições de loja com o catálogo. */
export function similaridade(a: string, b: string) {
  const ta = new Set(normalizar(a).split(" ").filter((t) => t && !PARADAS.has(t)));
  const tb = new Set(normalizar(b).split(" ").filter((t) => t && !PARADAS.has(t)));
  if (!ta.size || !tb.size) return 0;
  let comum = 0;
  for (const t of ta) if (tb.has(t)) comum++;
  return comum / Math.min(ta.size, tb.size) * (2 * comum / (ta.size + tb.size)) ** 0.5;
}
