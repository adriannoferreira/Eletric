/**
 * Manutenção preventiva recorrente do quadro: checklist gerado do QuadroDados,
 * avaliação de medições, estado geral, tendência entre visitas e itens de
 * orçamento para as pendências.
 */
import { faixaTensao, type Limite, dentroDoLimite, textoLimite } from "./inspecao";
import { buscarPreco, type ItemCatalogoSimples, MARCA_SEM_PRECO, type ItemOrcamentoGerado, varianteDaPeca } from "./orcamento-quadro";
import { peca } from "./pecas";
import {
  fasesDisponiveis,
  type Manutencao,
  novoId,
  PERIODICIDADES,
  type Periodicidade,
  type QuadroDados,
  type RespostaManutencao,
  type Visita,
} from "./tipos";

export type Prioridade = "alta" | "media" | "baixa";

export interface ItemManutencao {
  id: string;
  grupo: string;
  titulo: string;
  prioridade: Prioridade;
  medicao?: { rotulo: string; unidade: string; limite?: Limite; conferir?: string };
  /** Peça relacionada (para orçamento de pendências). */
  pecaId?: string;
}

/** Temperatura máxima de referência nos bornes/corpo do disjuntor (conferir datasheet do fabricante). */
export const TEMPERATURA_MAX_C = 60;

export function sugerirPeriodicidade(tipoImovel?: string): Periodicidade {
  if (tipoImovel === "comercio") return "trimestral";
  if (tipoImovel === "outro") return "semestral";
  return "anual";
}

/** Soma meses a uma data AAAA-MM-DD (ou ISO) e devolve AAAA-MM-DD. */
export function proximaData(data: string, periodicidade: Periodicidade) {
  const d = new Date(data.length === 10 ? `${data}T12:00:00` : data);
  d.setMonth(d.getMonth() + PERIODICIDADES[periodicidade]);
  return d.toISOString().slice(0, 10);
}

export function manutencaoPadrao(q: QuadroDados): Manutencao {
  const periodicidade = sugerirPeriodicidade(q.projeto?.obra.tipoImovel);
  return { periodicidade, proximaVisita: proximaData(new Date().toISOString(), periodicidade), visitas: [] };
}

export function gerarChecklistManutencao(q: QuadroDados): ItemManutencao[] {
  const itens: ItemManutencao[] = [];
  const add = (i: ItemManutencao) => itens.push(i);
  add({ id: "man:reaperto", grupo: "Conexões", titulo: "Reaperto de todas as conexões (disjuntores, barramentos, bornes N e PE)", prioridade: "alta" });
  for (const c of q.componentes) {
    const p = peca(c.pecaId);
    if (!p) continue;
    const circ = q.circuitos.findIndex((x) => x.id === c.circuitoId);
    const nome = c.geral ? `${p.rotulo} geral` : circ >= 0 ? `${p.rotulo} — circuito ${circ + 1}` : c.etiqueta || p.nome;
    if (p.tipo === "disjuntor" || p.tipo === "dr") {
      add({
        id: `man:temp:${c.id}`,
        grupo: "Aquecimento (termômetro infravermelho)",
        titulo: `Temperatura ${p.tipo === "dr" ? "do DR" : "do disjuntor"} ${nome}`,
        prioridade: "alta",
        pecaId: p.id,
        medicao: {
          rotulo: "Temperatura",
          unidade: "°C",
          limite: { tipo: "max", valor: TEMPERATURA_MAX_C },
          conferir: "Referência prática; compare também com peças vizinhas e com o datasheet do fabricante.",
        },
      });
    }
    if (p.tipo === "dr") {
      add({ id: `man:dr:${c.id}`, grupo: "Proteções", titulo: `${c.etiqueta || p.nome}: disparo pelo botão de teste “T”`, prioridade: "alta", pecaId: p.id });
    }
    if (p.tipo === "dps") {
      add({ id: `man:dps:${c.id}`, grupo: "Proteções", titulo: `DPS ${c.fases.join("") || "N-PE"}: janela de sinalização em estado normal (verde)`, prioridade: "media", pecaId: p.id });
    }
  }
  const estado: [string, string, Prioridade][] = [
    ["man:limpeza", "Limpeza: sem poeira, insetos ou resíduos dentro do quadro", "baixa"],
    ["man:umidade", "Sem umidade ou infiltração no quadro e na caixa", "media"],
    ["man:oxidacao", "Sem oxidação em barramentos, bornes e terminais", "media"],
    ["man:carbonizacao", "Sem sinais de carbonização, cheiro de queimado ou isolação derretida", "alta"],
    ["man:tampas", "Tampa, espelho e tampas cegas no lugar, sem partes vivas expostas", "media"],
    ["man:sinalizacao", "Sinalização de advertência e identificação dos circuitos legíveis", "baixa"],
  ];
  for (const [id, titulo, prioridade] of estado) add({ id, grupo: "Estado do quadro", titulo, prioridade });

  const fases = fasesDisponiveis(q.alimentacao);
  const geral = q.componentes.map((c) => ({ c, p: peca(c.pecaId) })).find((x) => x.c.geral && x.p?.tipo === "disjuntor")?.p;
  for (const f of fases) {
    add({
      id: `man:i:${f}`,
      grupo: "Correntes e tensões",
      titulo: `Corrente na fase ${f} (instalação em uso)`,
      prioridade: "media",
      medicao: { rotulo: "Corrente", unidade: "A", limite: geral?.correnteNominal ? { tipo: "max", valor: geral.correnteNominal } : undefined },
    });
  }
  for (const f of fases) {
    add({
      id: `man:v:${f}`,
      grupo: "Correntes e tensões",
      titulo: `Tensão fase ${f} – neutro`,
      prioridade: "media",
      medicao: { rotulo: "Tensão", unidade: "V", limite: faixaTensao(q.alimentacao.tensaoFN), conferir: "Faixa adequada ANEEL PRODIST Módulo 8 — conferir." },
    });
  }
  add({
    id: "man:aterramento",
    grupo: "Aterramento",
    titulo: "Resistência de aterramento / continuidade do PE",
    prioridade: "alta",
    medicao: { rotulo: "Resistência", unidade: "Ω", limite: { tipo: "max", valor: 10 }, conferir: "Referência usual — conferir norma da concessionária." },
  });
  return itens;
}

export type ResultadoManutencao = "ok" | "corrigido" | "pendente" | "sem_resposta";

export function resultadoManutencao(item: ItemManutencao, r?: RespostaManutencao): ResultadoManutencao {
  if (r?.status) return r.status;
  if (item.medicao && r && r.valor !== null) {
    const d = dentroDoLimite(r.valor, item.medicao.limite);
    if (d === false) return "pendente";
    if (d === true) return "ok";
  }
  return "sem_resposta";
}

export interface ResumoVisita {
  estado: "bom" | "atencao" | "critico";
  pendencias: { item: ItemManutencao; resposta?: RespostaManutencao }[];
  corrigidos: { item: ItemManutencao; resposta?: RespostaManutencao }[];
  ok: number;
  semResposta: number;
  desequilibrioPct: number | null;
}

export function resumirVisita(itens: ItemManutencao[], v: Visita): ResumoVisita {
  const mapa = new Map(v.respostas.map((r) => [r.itemId, r]));
  const pendencias: ResumoVisita["pendencias"] = [];
  const corrigidos: ResumoVisita["corrigidos"] = [];
  let ok = 0;
  let semResposta = 0;
  for (const it of itens) {
    const res = resultadoManutencao(it, mapa.get(it.id));
    if (res === "pendente") pendencias.push({ item: it, resposta: mapa.get(it.id) });
    else if (res === "corrigido") corrigidos.push({ item: it, resposta: mapa.get(it.id) });
    else if (res === "ok") ok++;
    else semResposta++;
  }
  const ordem = { alta: 0, media: 1, baixa: 2 };
  pendencias.sort((a, b) => ordem[a.item.prioridade] - ordem[b.item.prioridade]);
  const correntes = itens.filter((i) => i.id.startsWith("man:i:")).map((i) => mapa.get(i.id)?.valor).filter((x): x is number => typeof x === "number");
  const max = Math.max(...correntes);
  const deseq = correntes.length > 1 && max > 0 ? ((max - Math.min(...correntes)) / max) * 100 : null;
  const estado = pendencias.some((p) => p.item.prioridade === "alta") ? "critico" : pendencias.length || (deseq ?? 0) > 20 ? "atencao" : "bom";
  return { estado, pendencias, corrigidos, ok, semResposta, desequilibrioPct: deseq };
}

/** Comparação das medições com a visita anterior (tendência). */
export function tendencia(itens: ItemManutencao[], atual: Visita, anterior?: Visita) {
  if (!anterior) return [];
  const antes = new Map(anterior.respostas.map((r) => [r.itemId, r.valor]));
  return itens
    .filter((i) => i.medicao && (i.id.startsWith("man:i:") || i.id.startsWith("man:temp:")))
    .map((i) => {
      const agora = atual.respostas.find((r) => r.itemId === i.id)?.valor ?? null;
      const ant = antes.get(i.id) ?? null;
      return { item: i, anterior: ant, atual: agora, delta: agora !== null && ant !== null ? agora - ant : null };
    })
    .filter((x) => x.atual !== null || x.anterior !== null);
}

export function novaVisita(m: Manutencao, tecnico = ""): Visita {
  return {
    id: novoId("v"),
    numero: (m.visitas.at(-1)?.numero ?? 0) + 1,
    data: new Date().toISOString(),
    tecnico,
    respostas: [],
    trocas: [],
    recomendacoes: "",
  };
}

/** Itens de orçamento para as pendências da visita (preço pelo catálogo; sem preço = 0 marcado). */
export function itensOrcamentoPendencias(
  q: QuadroDados,
  v: Visita,
  catalogo: ItemCatalogoSimples[],
  itens: ItemManutencao[] = gerarChecklistManutencao(q),
): ItemOrcamentoGerado[] {
  const r = resumirVisita(itens, v);
  const saida: ItemOrcamentoGerado[] = [];
  const add = (tipo: "servico" | "material", descricao: string, achado: ItemCatalogoSimples | null, quantidade = 1, unidade = "un") =>
    saida.push({
      tipo,
      descricao: achado ? descricao : descricao + MARCA_SEM_PRECO,
      quantidade,
      unidade: achado?.unidade || unidade,
      precoUnitario: achado?.preco ?? 0,
      semPreco: !achado,
    });
  for (const { item, resposta } of r.pendencias) {
    const p = item.pecaId ? peca(item.pecaId) : undefined;
    const obs = resposta?.obs ? ` (${resposta.obs})` : "";
    if (p && (item.id.startsWith("man:temp:") || item.id.startsWith("man:dr:") || item.id.startsWith("man:dps:"))) {
      const v = varianteDaPeca(p.id);
      const mat = v
        ? buscarPreco(catalogo, { tipo: "material", exige: [], variante: v })
        : p.tipo === "dps"
          ? buscarPreco(catalogo, { tipo: "material", exige: [/\bdps\b/] })
          : null;
      add("material", `${p.nome} (substituição)`, mat);
      const serv =
        p.tipo === "disjuntor"
          ? buscarPreco(catalogo, { tipo: "servico", exige: [/disjuntor/] })
          : buscarPreco(catalogo, { tipo: "servico", exige: [p.tipo === "dr" ? /\b(dr|idr|diferencial)\b/ : /\bdps\b/] });
      add("servico", `Substituição: ${item.titulo}${obs}`, serv);
    } else if (item.id === "man:aterramento") {
      add("servico", `Correção do aterramento${obs}`, buscarPreco(catalogo, { tipo: "servico", exige: [/aterramento/] }));
    } else {
      add("servico", `Correção: ${item.titulo}${obs}`, null);
    }
  }
  return saida;
}

export function textoLimiteItem(i: ItemManutencao) {
  return i.medicao ? textoLimite(i.medicao.limite, i.medicao.unidade) : "";
}
