import { analisarQuadro, dimensionar, tensaoDoCircuito } from "@/lib/eletrica/calculo";
import { linhasDoModelo } from "@/lib/eletrica/caixas";
import { modulosOcupados, padraoDaPeca, peca, PECAS } from "@/lib/eletrica/pecas";
import {
  type Circuito,
  type Componente,
  type Fase,
  fasesDisponiveis,
  novoId,
  type QuadroDados,
} from "@/lib/eletrica/tipos";

/** Mapa de ocupação: [linha][módulo] = id do componente ou null (linhas = trilhos DIN, colunas NEMA e trilho auxiliar). */
export function ocupacao(q: QuadroDados, ignorar?: string) {
  const mapa: (string | null)[][] = linhasDoModelo(q.modelo).map((l) => Array<string | null>(l.modulos).fill(null));
  for (const c of q.componentes) {
    if (c.id === ignorar) continue;
    const p = peca(c.pecaId);
    if (!p || !mapa[c.fileira]) continue;
    for (let i = 0; i < modulosOcupados(p); i++) {
      if (c.posicao + i < mapa[c.fileira].length) mapa[c.fileira][c.posicao + i] = c.id;
    }
  }
  return mapa;
}

/** O espaço está livre? Com `padrao`, também exige que a linha seja do mesmo padrão da peça (DIN × NEMA). */
export function cabe(
  q: QuadroDados,
  fileira: number,
  posicao: number,
  largura: number,
  ignorar?: string,
  padrao?: "DIN" | "NEMA",
) {
  if (padrao && linhasDoModelo(q.modelo)[fileira]?.padrao !== padrao) return false;
  const mapa = ocupacao(q, ignorar);
  const linha = mapa[fileira];
  if (!linha || posicao < 0 || posicao + largura > linha.length) return false;
  for (let i = posicao; i < posicao + largura; i++) if (linha[i] !== null) return false;
  return true;
}

/** Primeiro espaço livre contíguo (preferindo a partir de uma posição). */
export function primeiroEspaco(
  q: QuadroDados,
  largura: number,
  preferencia?: { fileira: number; posicao: number },
  padrao: "DIN" | "NEMA" = "DIN",
) {
  if (preferencia && cabe(q, preferencia.fileira, preferencia.posicao, largura, undefined, padrao)) return preferencia;
  const linhas = linhasDoModelo(q.modelo);
  for (let f = 0; f < linhas.length; f++)
    for (let p = 0; p + largura <= linhas[f].modulos; p++)
      if (cabe(q, f, p, largura, undefined, padrao)) return { fileira: f, posicao: p };
  return null;
}

/** Fases menos carregadas para ligar um novo dispositivo de `polos` polos. */
export function fasesSugeridas(q: QuadroDados, polos: number): Fase[] {
  const disp = fasesDisponiveis(q.alimentacao);
  if (polos >= disp.length) return disp.slice(0, polos);
  const carga = analisarQuadro(q).correntePorFase;
  return [...disp].sort((a, b) => carga[a] - carga[b]).slice(0, polos);
}

export function polosDaLigacao(c: Pick<Circuito, "ligacao">) {
  return c.ligacao === "FN" ? 1 : c.ligacao === "FF" ? 2 : 3;
}

/**
 * Disjuntor sugerido pelo motor: polos da ligação, In calculada, curva B para iluminação
 * e C para o resto. Em caixa NEMA, o disjuntor NEMA com Ib ≤ In ≤ Iz (ou o menor ≥ Ib).
 */
export function disjuntorSugerido(q: QuadroDados, c: Circuito) {
  const d = dimensionar({
    ...c,
    tensaoV: tensaoDoCircuito(c.ligacao, q.alimentacao),
  });
  if (!d.disjuntor) return undefined;
  const polos = polosDaLigacao(c);
  if (q.modelo.padrao === "NEMA") {
    const nemas = PECAS.filter((p) => p.padrao === "NEMA" && p.polos === polos).sort(
      (a, b) => (a.correnteNominal ?? 0) - (b.correnteNominal ?? 0),
    );
    return (
      nemas.find((p) => (p.correnteNominal ?? 0) >= d.ib && (!d.iz || (p.correnteNominal ?? 0) <= d.iz)) ??
      nemas.find((p) => (p.correnteNominal ?? 0) >= d.ib)
    );
  }
  const curva = c.tipo === "iluminacao" ? "B" : "C";
  return peca(`dj-${polos}p-${curva}${d.disjuntor}`) ?? peca(`dj-${polos}p-C${d.disjuntor}`);
}

/** Adiciona um componente na posição dada (ou na primeira livre). Retorna o novo quadro e o id. */
export function adicionarComponente(
  q: QuadroDados,
  pecaId: string,
  onde?: { fileira: number; posicao: number },
  extra: Partial<Componente> = {},
): { quadro: QuadroDados; id: string } | null {
  const p = peca(pecaId);
  if (!p) return null;
  const lugar = primeiroEspaco(q, modulosOcupados(p), onde, padraoDaPeca(p));
  if (!lugar) return null;
  const id = novoId("k");
  let fases: Fase[];
  if (p.tipo === "dps") {
    // Um DPS por fase: escolhe a primeira fase que ainda não tem DPS.
    const comDPS = new Set(q.componentes.filter((c) => peca(c.pecaId)?.tipo === "dps").flatMap((c) => c.fases));
    const livre = fasesDisponiveis(q.alimentacao).find((f) => !comDPS.has(f));
    fases = livre ? [livre] : [];
  } else if (p.tipo === "dr") {
    // DR: o último polo fica para o neutro (DR 2P → 1 fase + N; 4P → até 3 fases + N).
    fases = fasesSugeridas(q, Math.max(1, Math.min(p.polos - 1, 3)));
  } else {
    fases = fasesSugeridas(q, Math.min(p.polos, 3));
  }
  const comp: Componente = {
    id,
    pecaId,
    fileira: lugar.fileira,
    posicao: lugar.posicao,
    fases,
    circuitoId: null,
    geral: false,
    etiqueta: "",
    ...extra,
  };
  return { quadro: { ...q, componentes: [...q.componentes, comp] }, id };
}

/** Cores padrão das fases (cabos preto, vermelho e branco — editáveis em Ligações). */
export const COR_FASE: Record<Fase, string> = { R: "#111827", S: "#dc2626", T: "#e2e8f0" };

/** Número do circuito (ordem na lista), para etiquetar o disjuntor como no quadro real. */
export function numeroCircuito(q: QuadroDados, circuitoId: string | null) {
  if (!circuitoId) return null;
  const i = q.circuitos.findIndex((c) => c.id === circuitoId);
  return i >= 0 ? i + 1 : null;
}
