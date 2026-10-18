import { normalizar } from "./regras";

/**
 * Leitura tolerante das planilhas do SINAPI (Caixa). O layout muda de tempos em
 * tempos (arquivos por UF ou planilha única com uma coluna por UF), então
 * localizamos o cabeçalho e as colunas pelo texto, não pela posição.
 */

export type Regime = "nao_desonerado" | "desonerado";
export type TipoAba = "insumo" | "composicao" | "analitico";

export type LinhaSinapi = {
  tipo: "insumo" | "composicao";
  codigo: string;
  descricao: string;
  unidade: string;
  preco: number | null;
};

export type HorasComposicao = Record<string, { eletricista: number; ajudante: number }>;

export type ResultadoAba = {
  tipo: TipoAba | null;
  regime: Regime;
  itens: LinhaSinapi[];
  horas: HorasComposicao;
};

/** Converte número em formato brasileiro ("1.234,56") ou já numérico. */
export function numeroBR(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s/g, "").replace(/^R\$/, "");
  if (!s) return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isFinite(n) ? n : null;
}

const txt = (v: unknown) => (v == null ? "" : String(v).trim());

export function detectarRegime(...nomes: string[]): Regime {
  const s = normalizar(nomes.join(" ")).replace(/\s/g, "");
  if (/naodesonerad|semdesoner|(^|[^a-z])isd|csd/.test(s)) return "nao_desonerado";
  if (/desonerad|comdesoner|icd|ccd/.test(s)) return "desonerado";
  return "nao_desonerado";
}

export function detectarTipo(...nomes: string[]): TipoAba | null {
  const s = normalizar(nomes.join(" "));
  if (/anal/.test(s)) return "analitico";
  if (/\b(isd|icd)\b|insumo/.test(s)) return "insumo";
  if (/\b(csd|ccd)\b|composi|sintetic/.test(s)) return "composicao";
  return null;
}

function acharCabecalho(linhas: unknown[][]) {
  for (let i = 0; i < Math.min(linhas.length, 60); i++) {
    const cels = (linhas[i] ?? []).map((c) => normalizar(txt(c)));
    if (cels.some((c) => /^cod/.test(c)) && cels.some((c) => /descri/.test(c))) return i;
  }
  return -1;
}

function coluna(cab: string[], ...padroes: RegExp[]) {
  for (const p of padroes) {
    const i = cab.findIndex((c) => p.test(c));
    if (i >= 0) return i;
  }
  return -1;
}

/** Interpreta uma aba já convertida em matriz de células. */
export function interpretarAba({
  arquivo,
  aba,
  linhas,
  uf,
}: {
  arquivo: string;
  aba: string;
  linhas: unknown[][];
  uf: string;
}): ResultadoAba {
  const regime = detectarRegime(arquivo, aba);
  const h = acharCabecalho(linhas);
  let tipo = detectarTipo(aba) ?? detectarTipo(arquivo);
  const res: ResultadoAba = { tipo, regime, itens: [], horas: {} };
  if (h < 0) return res;

  const bruto = (linhas[h] ?? []).map(txt);
  const cab = bruto.map((c) => normalizar(c));
  if (!tipo && cab.some((c) => /coef/.test(c))) tipo = res.tipo = "analitico";
  if (!tipo) return res;

  const cDesc = coluna(cab, /descri.*item/, /descri/);
  const cUnid = coluna(cab, /unid.*item/, /^unid/);

  if (tipo === "analitico") {
    const cComp = coluna(cab, /cod.*composi/, /^cod/);
    const cItem = coluna(cab, /cod.*item/);
    const cCoef = coluna(cab, /coef/);
    if (cComp < 0 || cCoef < 0) return res;
    for (const linha of linhas.slice(h + 1)) {
      const comp = txt(linha[cComp]).replace(/\D/g, "");
      if (!comp || (cItem >= 0 && !txt(linha[cItem]))) continue;
      const desc = normalizar(txt(linha[cDesc]));
      const unid = normalizar(txt(linha[cUnid]));
      const coef = numeroBR(linha[cCoef]);
      if (!coef || !/eletricista/.test(desc) || (unid && unid !== "h")) continue;
      const t = (res.horas[comp] ??= { eletricista: 0, ajudante: 0 });
      if (/auxiliar|ajudante/.test(desc)) t.ajudante += coef;
      else t.eletricista += coef;
    }
    return res;
  }

  const cCod = coluna(cab, /^cod/);
  // Planilha única tem uma coluna por UF; a antiga tem "preço"/"custo".
  let cPreco = bruto.findIndex((c) => c.toUpperCase() === uf.toUpperCase());
  if (cPreco < 0) cPreco = coluna(cab, /preco mediano/, /^preco/, /custo total/, /^custo/, /preco/, /custo/);
  if (cCod < 0 || cDesc < 0) return res;

  for (const linha of linhas.slice(h + 1)) {
    const codigo = txt(linha[cCod]).replace(/\D/g, "");
    const descricao = txt(linha[cDesc]);
    if (!codigo || !descricao) continue;
    res.itens.push({
      tipo,
      codigo,
      descricao,
      unidade: txt(linha[cUnid]),
      preco: cPreco >= 0 ? numeroBR(linha[cPreco]) : null,
    });
  }
  return res;
}

/** "SINAPI_..._2026_09..." → "2026-09" (referência do mês), se der para achar. */
export function referenciaDoArquivo(nome: string) {
  const m = nome.match(/(20\d{2})[_\-.]?(0[1-9]|1[0-2])(?!\d)/) ?? nome.match(/(0[1-9]|1[0-2])[_\-.](20\d{2})/);
  if (!m) return "";
  return m[1].length === 4 ? `${m[1]}-${m[2]}` : `${m[2]}-${m[1]}`;
}
