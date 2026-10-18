/**
 * Converte um quadro (lista de materiais + circuitos) em itens de orçamento,
 * buscando os preços no catálogo do eletricista por nome normalizado /
 * palavras-chave. Itens sem correspondência ficam com preço 0 e marcados.
 */
import { capacidadeTotal } from "./caixas";
import { listaMateriaisCompleta } from "./ligacoes";
import { analisarQuadro, type AnaliseQuadro } from "./calculo";
import { peca } from "./pecas";
import type { QuadroDados } from "./tipos";
import { type Especificacao, resolverVariante } from "../precos/variantes";

export interface ItemCatalogoSimples {
  tipo: string;
  nome: string;
  unidade: string;
  preco: number;
  /** Família e atributos técnicos (variantes). Itens antigos: inferidos pelo nome. */
  familia?: string | null;
  atributos?: Record<string, unknown> | null;
}

export interface ItemOrcamentoGerado {
  tipo: "servico" | "material";
  descricao: string;
  quantidade: number;
  unidade: string;
  precoUnitario: number;
  /** true quando não houve correspondência no catálogo (preço a preencher). */
  semPreco: boolean;
}

export const MARCA_SEM_PRECO = " [definir preço]";

export function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/²/g, "2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Critério de busca: todas as `exige` precisam casar; cada `prefere` soma pontos. */
interface Busca {
  tipo: "servico" | "material";
  exige: RegExp[];
  prefere?: RegExp[];
  /** Material com especificação técnica: casa só a variante exata (nunca outra corrente/seção). */
  variante?: Especificacao;
}

export function buscarPreco(catalogo: ItemCatalogoSimples[], b: Busca): ItemCatalogoSimples | null {
  if (b.variante) {
    const r = resolverVariante(catalogo, b.variante);
    return r.status === "ok" ? r.item : null;
  }
  let melhor: ItemCatalogoSimples | null = null;
  let pontos = -1;
  for (const c of catalogo) {
    if (c.tipo !== b.tipo) continue;
    const nome = normalizar(c.nome);
    if (!b.exige.every((r) => r.test(nome))) continue;
    const p = (b.prefere ?? []).filter((r) => r.test(nome)).length;
    if (p > pontos) {
      melhor = c;
      pontos = p;
    }
  }
  return melhor;
}

const num = (n: number) => String(n).replace(".", ",");
const reSecao = (s: number) => new RegExp(`(^|[^\\d,])${num(s).replace(",", "[,.]")} ?mm`);

/** Especificação técnica (família + atributos) de uma peça do construtor. */
export function varianteDaPeca(pecaId: string): Especificacao | null {
  const p = peca(pecaId);
  if (!p) return null;
  if (p.tipo === "disjuntor" && p.correnteNominal) {
    return p.padrao === "NEMA"
      ? { familia: "disjuntor_nema", atributos: { polos: p.polos, corrente: p.correnteNominal } }
      : { familia: "disjuntor_din", atributos: { polos: p.polos, curva: p.curva ?? "C", corrente: p.correnteNominal } };
  }
  if (p.tipo === "dr" && p.correnteNominal) {
    return { familia: "dr", atributos: { polos: p.polos, corrente: p.correnteNominal, idnMa: p.sensibilidadeMa ?? 30 } };
  }
  if (p.tipo === "dps" && p.ucV && p.imaxKa) {
    return { familia: "dps", atributos: { classe: "II", ucV: p.ucV, imaxKa: p.imaxKa } };
  }
  return null;
}

/** Critério de busca para cada item da lista de materiais. */
function buscaMaterial(descricao: string, pecaId?: string): Busca | null {
  const p = pecaId ? peca(pecaId) : undefined;
  const v = pecaId ? varianteDaPeca(pecaId) : null;
  if (v) return { tipo: "material", exige: [], variante: v };
  if (p?.tipo === "seccionadora") return { tipo: "material", exige: [/seccionadora|interruptor de manobra/] };
  const d = normalizar(descricao);
  const cabo = d.match(/cabo flexivel ([\d,]+) mm2/);
  if (cabo) {
    const secao = Number(cabo[1].replace(",", "."));
    return { tipo: "material", exige: [/cabo/, reSecao(secao)], variante: { familia: "cabo_flexivel", atributos: { secao } } };
  }
  const quadro = d.match(/quadro de distribuicao.* (\d+) modulos/);
  if (quadro) {
    const instalacao = d.includes("sobrepor") ? /sobrepor/ : /embutir/;
    return { tipo: "material", exige: [/quadro/, new RegExp(`\\b${quadro[1]} ?(modulos|disjuntores)`)], prefere: [instalacao] };
  }
  if (d.includes("pente")) return { tipo: "material", exige: [/pente|barramento/] };
  if (d.includes("neutro")) return { tipo: "material", exige: [/barra|borne/, /neutro/] };
  if (d.includes("terra")) return { tipo: "material", exige: [/barra|borne/, /terra|pe\b/] };
  if (d.includes("tampa")) return { tipo: "material", exige: [/tampa/] };
  return null;
}

function item(
  catalogo: ItemCatalogoSimples[],
  busca: Busca | null,
  tipo: "servico" | "material",
  descricao: string,
  quantidade: number,
  unidade: string,
): ItemOrcamentoGerado {
  const achado = busca ? buscarPreco(catalogo, busca) : null;
  return {
    tipo,
    descricao: achado ? descricao : descricao + MARCA_SEM_PRECO,
    quantidade,
    unidade: achado?.unidade || unidade,
    precoUnitario: achado?.preco ?? 0,
    semPreco: !achado,
  };
}

export function itensOrcamentoDoQuadro(
  dados: QuadroDados,
  catalogo: ItemCatalogoSimples[],
  analise: AnaliseQuadro = analisarQuadro(dados),
): ItemOrcamentoGerado[] {
  const itens: ItemOrcamentoGerado[] = [];

  // Materiais — mesma lista do construtor; peças são casadas pelo id do catálogo de peças.
  const nomeParaPeca = new Map(dados.componentes.map((c) => [peca(c.pecaId)?.nome ?? "", c.pecaId]));
  for (const m of listaMateriaisCompleta(dados, analise)) {
    const pecaId = nomeParaPeca.get(m.descricao);
    itens.push(item(catalogo, buscaMaterial(m.descricao, pecaId), "material", m.descricao, m.quantidade, m.unidade));
  }

  // Mão de obra
  const total = capacidadeTotal(dados.modelo);
  itens.push(
    item(
      catalogo,
      { tipo: "servico", exige: [/quadro/], prefere: [/montagem|instalacao|troca/, /distribuicao/] },
      "servico",
      `Montagem e instalação do quadro de distribuição (${total} módulos)`,
      1,
      "un",
    ),
  );
  const nDR = dados.componentes.filter((c) => peca(c.pecaId)?.tipo === "dr").length;
  if (nDR) {
    itens.push(item(catalogo, { tipo: "servico", exige: [/\b(dr|idr|diferencial)\b/] }, "servico", "Instalação e teste de DR", nDR, "un"));
  }
  const nDPS = dados.componentes.filter((c) => peca(c.pecaId)?.tipo === "dps").length;
  if (nDPS) {
    itens.push(item(catalogo, { tipo: "servico", exige: [/\bdps\b/] }, "servico", "Instalação de DPS", nDPS, "un"));
  }
  analise.circuitos.forEach((r, i) => {
    const L = Math.max(1, Math.round(r.circuito.comprimentoM));
    itens.push(
      item(
        catalogo,
        { tipo: "servico", exige: [/cabo|fiacao|enfiacao/], prefere: [/passagem/] },
        "servico",
        `Circuito ${i + 1} — ${r.circuito.nome}: passagem de cabos e ligação`,
        L,
        "m",
      ),
    );
  });
  if (dados.projeto || dados.alimentacao.esquema === "TT") {
    itens.push(
      item(catalogo, { tipo: "servico", exige: [/aterramento/] }, "servico", "Aterramento (haste, conexões e equipotencialização)", 1, "un"),
    );
  }
  return itens;
}
