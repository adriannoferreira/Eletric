/**
 * Lista de compras para levar à loja de material elétrico, a partir do quadro:
 * itens agrupados por categoria, unidades comerciais (rolos de 100 m, pacotes),
 * cores de cabo por função, especificação completa das peças e acessórios que
 * costumam faltar. Preços estimados pelo catálogo do eletricista.
 */
import { analisarQuadro, type AnaliseQuadro, secaoProtecao } from "./calculo";
import { buscarPreco, type ItemCatalogoSimples } from "./orcamento-quadro";
import { modulosOcupados, peca, type Peca } from "./pecas";
import type { Fase, QuadroDados } from "./tipos";

export const CATEGORIAS_COMPRA = {
  protecao: "Proteção (disjuntores, DR, DPS)",
  cabos: "Cabos",
  quadro: "Quadro e acessórios",
  aterramento: "Aterramento",
  infraestrutura: "Infraestrutura (estimativa)",
} as const;
export type CategoriaCompra = keyof typeof CATEGORIAS_COMPRA;

export interface ItemCompra {
  /** Chave estável para marcar como comprado. */
  chave: string;
  categoria: CategoriaCompra;
  descricao: string;
  /** Especificação para o balconista (polos, curva, corrente…). */
  especificacao: string;
  quantidade: number;
  unidade: string;
  /** Alternativa de compra (ex.: "1 rolo de 100 m"). */
  alternativa?: string;
  precoUnitario: number | null;
  total: number | null;
  observacao?: string;
}

export interface ListaCompras {
  itens: ItemCompra[];
  totalEstimado: number;
  itensSemPreco: number;
}

/** Cores usuais por fase (sugestão — o importante é manter o padrão em toda a obra). */
export const COR_CABO_FASE: Record<Fase, string> = { R: "preto", S: "vermelho", T: "branco" };
const ROLO_M = 100;

const fmt = (n: number) => n.toLocaleString("pt-BR");

function especificacaoPeca(p: Peca) {
  switch (p.tipo) {
    case "disjuntor":
      return `Termomagnético DIN ${p.polos} polo(s), curva ${p.curva}, ${p.correnteNominal} A, Icn ≥ 3 kA (confirme a corrente de curto no local) — ${p.norma}`;
    case "dr":
      return `Interruptor DR (IDR) ${p.polos} polos, ${p.correnteNominal} A, sensibilidade ${p.sensibilidadeMa} mA, tipo AC ou A — ${p.norma}`;
    case "dps":
      return `DPS classe II, Uc ${p.ucV} V, Imax ${p.imaxKa} kA (In ≥ 5 kA), 1 polo — ${p.norma}`;
    default:
      return `${p.descricao}`;
  }
}

export function montarListaCompras(
  dados: QuadroDados,
  catalogo: ItemCatalogoSimples[] = [],
  analise: AnaliseQuadro = analisarQuadro(dados),
): ListaCompras {
  const itens: ItemCompra[] = [];
  const preco = (exige: RegExp[], prefere: RegExp[] = []) =>
    buscarPreco(catalogo, { tipo: "material", exige, prefere })?.preco ?? null;
  const add = (i: Omit<ItemCompra, "total">) =>
    itens.push({ ...i, total: i.precoUnitario === null ? null : Math.round(i.precoUnitario * i.quantidade * 100) / 100 });

  // --- Proteção
  const contagem = new Map<string, number>();
  for (const c of dados.componentes) contagem.set(c.pecaId, (contagem.get(c.pecaId) ?? 0) + 1);
  const ordemTipo = { disjuntor: 0, dr: 1, dps: 2, seccionadora: 3 } as const;
  const pecas = [...contagem]
    .map(([id, n]) => ({ p: peca(id), n }))
    .filter((x): x is { p: Peca; n: number } => Boolean(x.p))
    .sort((a, b) => ordemTipo[a.p.tipo] - ordemTipo[b.p.tipo] || (a.p.correnteNominal ?? 0) - (b.p.correnteNominal ?? 0));
  for (const { p, n } of pecas) {
    let pu: number | null = null;
    if (p.tipo === "disjuntor") {
      pu = preco([/disjuntor/, new RegExp(`\\b${p.polos} ?p\\b`)], [new RegExp(`curva ${p.curva?.toLowerCase()}`), new RegExp(`\\b${p.correnteNominal} ?a\\b`)]);
    } else if (p.tipo === "dr") {
      pu = preco([/\b(dr|idr|diferencial)\b/, new RegExp(`\\b${p.polos} ?p\\b`), new RegExp(`\\b${p.correnteNominal} ?a\\b`)]);
    } else if (p.tipo === "dps") {
      pu = preco([/\bdps\b/], [new RegExp(`${p.ucV} ?v`)]);
    }
    add({ chave: `peca:${p.id}`, categoria: "protecao", descricao: p.nome, especificacao: especificacaoPeca(p), quantidade: n, unidade: "un", precoUnitario: pu });
  }

  // --- Cabos (por seção e cor), 10% de folga
  const metros = new Map<string, { secao: number; cor: string; funcao: string; m: number }>();
  const somar = (secao: number, funcao: string, cor: string, m: number) => {
    const k = `${secao}|${funcao}|${cor}`;
    const atual = metros.get(k) ?? { secao, cor, funcao, m: 0 };
    atual.m += m;
    metros.set(k, atual);
  };
  for (const r of analise.circuitos) {
    const s = r.dim.secao;
    const L = r.circuito.comprimentoM;
    if (!s || L <= 0) continue;
    const fases: Fase[] = r.fases.length ? r.fases : ["R"];
    const nFases = r.circuito.ligacao === "FN" ? 1 : r.circuito.ligacao === "FF" ? 2 : 3;
    for (const f of fases.slice(0, nFases)) somar(s, "fase", COR_CABO_FASE[f], L);
    if (r.circuito.ligacao !== "FF") somar(s, "neutro", "azul-claro", L);
    somar(secaoProtecao(s), "proteção (PE)", "verde-amarelo", L);
    // Retorno dos interruptores: ~1 condutor ao longo do circuito de iluminação (estimativa).
    if (r.circuito.tipo === "iluminacao") somar(s, "retorno", "amarelo ou cinza", L);
  }
  for (const c of [...metros.values()].sort((a, b) => a.secao - b.secao || a.funcao.localeCompare(b.funcao))) {
    const m = Math.ceil(c.m * 1.1);
    const rolos = Math.ceil(m / ROLO_M);
    const pm = preco([/cabo/, new RegExp(`(^|[^\\d,])${String(c.secao).replace(".", "[,.]")} ?mm`)]);
    add({
      chave: `cabo:${c.secao}:${c.funcao}:${c.cor}`,
      categoria: "cabos",
      descricao: `Cabo flexível ${fmt(c.secao)} mm² 450/750 V — ${c.funcao}, ${c.cor}`,
      especificacao: `Cobre, classe 5 (flexível), isolação PVC 70 °C, 450/750 V (NBR NM 247-3), cor ${c.cor}`,
      quantidade: m,
      unidade: "m",
      alternativa: m >= 60 ? `ou ${rolos} rolo(s) de ${ROLO_M} m (sobra ${rolos * ROLO_M - m} m)` : `por metro (não compensa rolo de ${ROLO_M} m)`,
      precoUnitario: pm,
      observacao: c.funcao === "retorno" ? "Estimativa: depende da posição dos interruptores." : undefined,
    });
  }

  // --- Quadro e acessórios
  const totalMod = dados.modelo.fileiras * dados.modelo.modulosPorFileira;
  const livres = Math.max(0, totalMod - dados.componentes.reduce((s, c) => s + (peca(c.pecaId) ? modulosOcupados(peca(c.pecaId)!) : 0), 0));
  add({
    chave: "quadro:caixa",
    categoria: "quadro",
    descricao: `Quadro de distribuição de ${dados.modelo.instalacao} ${totalMod} módulos DIN`,
    especificacao: `${dados.modelo.fileiras} fileira(s) × ${dados.modelo.modulosPorFileira} módulos, com trilho DIN 35 mm, porta e barras de neutro/terra (confira se vem incluso)`,
    quantidade: 1,
    unidade: "un",
    precoUnitario: preco([/quadro/, new RegExp(`\\b${totalMod} ?(modulos|disjuntores)`)], [new RegExp(dados.modelo.instalacao)]),
  });
  add({
    chave: "quadro:pente",
    categoria: "quadro",
    descricao: "Barramento pente",
    especificacao: `Pente de cobre isolado para disjuntores DIN (mono/bi/tri conforme a fileira) — ${dados.modelo.fileiras} peça(s) de ${dados.modelo.modulosPorFileira} módulos, cortar na medida`,
    quantidade: dados.modelo.fileiras,
    unidade: "un",
    precoUnitario: preco([/pente|barramento/]),
  });
  const nCirc = dados.circuitos.length;
  add({ chave: "quadro:neutro", categoria: "quadro", descricao: "Barra de neutro isolada (azul)", especificacao: `Com pelo menos ${nCirc + 2} bornes`, quantidade: 1, unidade: "un", precoUnitario: preco([/barra|borne/, /neutro/]) });
  add({ chave: "quadro:terra", categoria: "quadro", descricao: "Barra de terra/PE (verde)", especificacao: `Com pelo menos ${nCirc + 2} bornes`, quantidade: 1, unidade: "un", precoUnitario: preco([/barra|borne/, /terra/]) });
  if (livres > 0) {
    add({ chave: "quadro:tampa", categoria: "quadro", descricao: "Tampa cega para módulo DIN", especificacao: "Para fechar os espaços livres/reserva", quantidade: livres, unidade: "un", precoUnitario: preco([/tampa/]) });
  }
  // Ponteiras: uma por condutor em cada borne do quadro.
  const condutores = analise.circuitos.reduce((s, r) => s + (r.circuito.ligacao === "FN" ? 3 : r.circuito.ligacao === "FF" ? 3 : 5), 0);
  const ponteiras = Math.max(20, Math.ceil((condutores * 1.2) / 10) * 10);
  add({
    chave: "quadro:ponteiras",
    categoria: "quadro",
    descricao: "Terminais tubulares (ponteiras) isolados",
    especificacao: "Nas bitolas dos cabos usados (1,5 / 2,5 / 4 / 6 / 10 mm²…), para todos os condutores que entram em disjuntores e barras",
    quantidade: ponteiras,
    unidade: "un",
    alternativa: `ou ${Math.ceil(ponteiras / 100)} pacote(s) de 100 sortidos`,
    precoUnitario: preco([/ponteira|terminal tubular/]),
  });
  add({ chave: "quadro:abracadeiras", categoria: "quadro", descricao: "Abraçadeiras de nylon (enforca-gato)", especificacao: "100 mm a 200 mm", quantidade: 1, unidade: "pacote 100", precoUnitario: preco([/abracadeira/]) });
  add({ chave: "quadro:fita", categoria: "quadro", descricao: "Fita isolante", especificacao: "Antichama, 19 mm × 20 m", quantidade: nCirc > 10 ? 2 : 1, unidade: "rolo", precoUnitario: preco([/fita isolante/]) });
  add({
    chave: "quadro:identificacao",
    categoria: "quadro",
    descricao: "Identificação de circuitos",
    especificacao: `Etiquetas/anilhas para ${nCirc} circuito(s) + diagrama plastificado para a porta do quadro`,
    quantidade: 1,
    unidade: "kit",
    precoUnitario: preco([/etiqueta|anilha|identificacao/]),
  });

  // --- Aterramento (instalação nova pelo gerador, ou esquema TT)
  if (dados.projeto || dados.alimentacao.esquema === "TT") {
    add({
      chave: "aterr:haste",
      categoria: "aterramento",
      descricao: "Haste de aterramento cobreada 5/8\" × 2,4 m",
      especificacao: "Quantidade de hastes conforme a norma da concessionária (normalmente 1 a 3) — conferir",
      quantidade: 1,
      unidade: "un",
      precoUnitario: preco([/haste/]),
      observacao: "Conferir na norma da concessionária.",
    });
    add({ chave: "aterr:conector", categoria: "aterramento", descricao: "Conector/grampo para haste", especificacao: "Bronze, para haste 5/8\" e cabo até 16 mm²", quantidade: 1, unidade: "un", precoUnitario: preco([/conector|grampo/]) });
    add({ chave: "aterr:caixa", categoria: "aterramento", descricao: "Caixa de inspeção de aterramento", especificacao: "PVC ou concreto, com tampa", quantidade: 1, unidade: "un", precoUnitario: preco([/caixa de inspecao/]) });
    add({ chave: "aterr:bep", categoria: "aterramento", descricao: "Barra de equipotencialização (BEP)", especificacao: "Para interligar PE, eletrodo e tubulações metálicas (NBR 5410 6.4.2)", quantidade: 1, unidade: "un", precoUnitario: preco([/equipotencial|bep/]) });
  }

  // --- Infraestrutura (estimativa grosseira)
  const somaComp = analise.circuitos.reduce((s, r) => s + r.circuito.comprimentoM, 0);
  if (somaComp > 0) {
    const eletroduto = Math.ceil(somaComp * 0.6);
    add({
      chave: "infra:eletroduto",
      categoria: "infraestrutura",
      descricao: "Eletroduto corrugado 3/4\"",
      especificacao: "Flexível amarelo (parede) ou reforçado laranja (laje/piso), conforme o local",
      quantidade: eletroduto,
      unidade: "m",
      alternativa: `ou ${Math.ceil(eletroduto / 50)} rolo(s) de 50 m`,
      precoUnitario: preco([/eletroduto/]),
      observacao: "Estimativa (~60% da soma dos circuitos, que dividem eletrodutos). Medir na obra.",
    });
    const pontos = analise.circuitos.reduce((s, r) => s + r.circuito.quantidadePontos, 0);
    add({
      chave: "infra:caixas",
      categoria: "infraestrutura",
      descricao: "Caixa 4×2 de embutir",
      especificacao: "PVC, para tomadas e interruptores",
      quantidade: pontos,
      unidade: "un",
      precoUnitario: preco([/caixa 4 ?x ?2/]),
      observacao: "Estimativa: 1 por ponto previsto.",
    });
  }

  const totalEstimado = Math.round(itens.reduce((s, i) => s + (i.total ?? 0), 0) * 100) / 100;
  return { itens, totalEstimado, itensSemPreco: itens.filter((i) => i.precoUnitario === null).length };
}

/** Texto para mandar à loja pelo WhatsApp pedindo cotação. */
export function textoCotacao(lista: ListaCompras, titulo: string) {
  const linhas = [`Olá! Gostaria de uma *cotação* dos materiais abaixo (${titulo}):`, ""];
  for (const [cat, nome] of Object.entries(CATEGORIAS_COMPRA)) {
    const doGrupo = lista.itens.filter((i) => i.categoria === cat);
    if (!doGrupo.length) continue;
    linhas.push(`*${nome}*`);
    for (const i of doGrupo) linhas.push(`• ${fmt(i.quantidade)} ${i.unidade} — ${i.descricao}${i.alternativa ? ` (${i.alternativa})` : ""}`);
    linhas.push("");
  }
  linhas.push("Pode me passar preço e disponibilidade? Obrigado!");
  return linhas.join("\n");
}
