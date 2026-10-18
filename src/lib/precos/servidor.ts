import "server-only";
import { and, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import {
  catalogo,
  configPrecos,
  db,
  type FontePreco,
  type FonteWeb,
  kitItens,
  kits,
  type OfertaPesquisa,
  perfil,
  precosHistorico,
  precosLoja,
  sugestoesPreco,
} from "@/db";
import { pesquisarPrecoIA } from "./ia";
import { KITS_SUGERIDOS } from "./kits-sugeridos";
import { DIA_MS, normalizar, precoEfetivo, precoPreferido } from "./regras";
import {
  type Atributos,
  confere,
  ehFamilia,
  type Especificacao,
  especificacaoCompleta,
  especificacaoDoItem,
  type Familia,
  faltando,
  FAMILIAS,
  GRADES,
  inferirVariante,
  limparAtributos,
  nomeVariante,
  textoEspecificacao,
} from "./variantes";

/** Unidade e categoria padrão de cada família ao criar variantes. */
const PADRAO_FAMILIA: Record<Familia, { unidade: string; categoria: string }> = {
  disjuntor_din: { unidade: "un", categoria: "Proteção" },
  disjuntor_nema: { unidade: "un", categoria: "Proteção" },
  dr: { unidade: "un", categoria: "Proteção" },
  dps: { unidade: "un", categoria: "Proteção" },
  cabo_flexivel: { unidade: "m", categoria: "Cabos" },
  eletroduto_corrugado: { unidade: "m", categoria: "Infraestrutura" },
  tomada: { unidade: "un", categoria: "Acabamento" },
  interruptor: { unidade: "un", categoria: "Acabamento" },
  haste: { unidade: "un", categoria: "Aterramento" },
  quadro_caixa: { unidade: "un", categoria: "Proteção" },
};

/** Especificação de um material do catálogo (gravada ou inferida pelo nome). */
export function varianteDoItem(item: { tipo: string; nome: string; familia: string | null; atributos: Record<string, unknown> | null }) {
  if (item.tipo !== "material") return null;
  return especificacaoDoItem({ ...item, unidade: "", preco: 0 });
}

const MSG_SEM_VARIANTE = (e: Especificacao) =>
  `Defina as variantes antes de cotar: "${FAMILIAS[e.familia].nome}" muda de preço conforme ${faltando(e).join(", ")}. Use "Criar variantes" no catálogo.`;

export async function obterConfig() {
  const [c] = await db.select().from(configPrecos).where(eq(configPrecos.id, 1));
  if (c) return c;
  const [novo] = await db.insert(configPrecos).values({ id: 1 }).onConflictDoNothing().returning();
  return novo ?? (await db.select().from(configPrecos).where(eq(configPrecos.id, 1)))[0];
}

/** Contexto para calcular o preço dos serviços (valor/hora do perfil + config). */
export async function contextoServico() {
  const [config, [p]] = await Promise.all([obterConfig(), db.select({ valorHora: perfil.valorHora }).from(perfil).limit(1)]);
  return {
    config,
    ctx: { valorHora: p?.valorHora ?? null, valorHoraAjudante: config.valorHoraAjudante, margemServico: config.margemServico },
  };
}

/** Catálogo com o preço efetivo (serviços calculados pelas horas). */
export async function catalogoComPrecos(somenteAtivos = true) {
  const [{ ctx }, itens] = await Promise.all([
    contextoServico(),
    db.select().from(catalogo).where(somenteAtivos ? eq(catalogo.ativo, true) : undefined).orderBy(catalogo.categoria, catalogo.nome),
  ]);
  return itens.map((i) => {
    const calculado =
      i.tipo === "servico" && !i.precoFixo && !!ctx.valorHora && ((i.horasEletricista ?? 0) > 0 || (i.horasAjudante ?? 0) > 0);
    return { ...i, preco: precoEfetivo(i, ctx), precoSalvo: i.preco, calculado };
  });
}

/** Recalcula o preço de um item a partir do histórico, seguindo a regra de fonte preferida. */
export async function recalcular(catalogoId: number) {
  const config = await obterConfig();
  const hist = await db.select().from(precosHistorico).where(eq(precosHistorico.catalogoId, catalogoId));
  const pref = precoPreferido(
    hist.map((h) => ({ fonte: h.fonte, preco: h.preco, data: h.criadoEm })),
    { margemSinapi: config.margemSinapi, validadeDias: config.validadeDias },
  );
  if (!pref) return;
  const origem = hist
    .filter((h) => h.fonte === pref.fonte)
    .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())[0];
  await db
    .update(catalogo)
    .set({
      preco: pref.preco,
      fontePreco: pref.fonte,
      precoAtualizadoEm: pref.data,
      fornecedor: pref.fonte === "cotacao" ? (origem?.fornecedorNome ?? "") : pref.fonte === "ia" ? "Pesquisa web" : pref.fonte === "sinapi" ? "SINAPI" : "",
    })
    .where(eq(catalogo.id, catalogoId));
}

export async function registrarPreco(
  catalogoId: number,
  dados: { preco: number; fonte: FontePreco; fornecedorId?: number | null; fornecedorNome?: string; referencia?: string; fontesWeb?: FonteWeb[] },
) {
  await db.insert(precosHistorico).values({
    catalogoId,
    preco: dados.preco,
    fonte: dados.fonte,
    fornecedorId: dados.fornecedorId ?? null,
    fornecedorNome: dados.fornecedorNome ?? "",
    referencia: dados.referencia ?? "",
    fontesWeb: dados.fontesWeb ?? [],
  });
  if (dados.fonte === "manual") {
    // Edição manual vale na hora (é a decisão mais recente do usuário).
    await db
      .update(catalogo)
      .set({ preco: dados.preco, fontePreco: "manual", precoAtualizadoEm: new Date(), fornecedor: "" })
      .where(eq(catalogo.id, catalogoId));
  } else {
    await recalcular(catalogoId);
  }
}

/** Pesquisa um item com IA e guarda como sugestão pendente (não altera o preço). */
export async function criarSugestaoIA(catalogoId: number) {
  const [item] = await db.select().from(catalogo).where(eq(catalogo.id, catalogoId));
  if (!item) throw new Error("Item não encontrado");
  const variante = varianteDoItem(item);
  if (variante && !especificacaoCompleta(variante)) return { ok: false as const, mensagem: MSG_SEM_VARIANTE(variante) };
  const config = await obterConfig();
  const r = await pesquisarPrecoIA(item, { cidade: config.cidade, uf: config.uf }, variante);
  if (!r.encontrado || r.mediano == null) {
    const descartadas = r.ofertas.filter((o) => !o.confere).length;
    return {
      ok: false as const,
      mensagem:
        (descartadas
          ? `Nenhuma oferta conferiu com a especificação (${descartadas} descartada(s) por ${[...new Set(r.ofertas.flatMap((o) => o.divergencias))].join(", ")}). `
          : "") + (r.observacao || "Não encontrei preços confiáveis para este item."),
    };
  }
  await db
    .update(sugestoesPreco)
    .set({ status: "rejeitada", decididoEm: new Date(), motivo: "substituída por pesquisa mais nova" })
    .where(and(eq(sugestoesPreco.catalogoId, catalogoId), eq(sugestoesPreco.status, "pendente")));
  const validas = r.ofertas.filter((o) => o.confere);
  const [sug] = await db
    .insert(sugestoesPreco)
    .values({
      catalogoId,
      fonte: "ia",
      preco: r.mediano,
      minimo: r.minimo,
      maximo: r.maximo,
      fontesWeb: validas.slice(0, 8).map((o) => ({ loja: o.loja, url: o.url, preco: o.precoConvertido })),
      ofertas: r.ofertas.slice(0, 16),
      especificacao: r.especificacao,
      observacao: r.observacao,
    })
    .returning();
  if (item.tipo === "servico") {
    await db
      .update(catalogo)
      .set({ mercadoMin: r.minimo, mercadoMax: r.maximo, mercadoAtualizadoEm: new Date() })
      .where(eq(catalogo.id, catalogoId));
  }
  return { ok: true as const, sugestao: sug };
}

export async function decidirSugestao(id: number, aprovar: boolean, precoAjustado?: number) {
  const [s] = await db.select().from(sugestoesPreco).where(eq(sugestoesPreco.id, id));
  if (!s || s.status !== "pendente") return;
  await db
    .update(sugestoesPreco)
    .set({ status: aprovar ? "aprovada" : "rejeitada", decididoEm: new Date() })
    .where(eq(sugestoesPreco.id, id));
  if (!aprovar) return;
  const [item] = await db.select().from(catalogo).where(eq(catalogo.id, s.catalogoId));
  const preco = precoAjustado ?? s.preco;
  await registrarPreco(s.catalogoId, {
    preco,
    fonte: "ia",
    referencia: [s.especificacao, s.observacao].filter(Boolean).join(" — "),
    fontesWeb: s.fontesWeb,
  });
  // Cada oferta que conferiu vira um preço por loja (para o comparativo).
  await registrarOfertasPorLoja(s.catalogoId, s.ofertas.filter((o) => o.confere));
  // Serviço com preço calculado: a pesquisa só informa a faixa de mercado.
  if (item?.tipo === "servico" && !item.precoFixo) {
    await db.update(catalogo).set({ preco: item.preco }).where(eq(catalogo.id, item.id));
  }
}

/** Itens com preço vencido ou sem preço, sem sugestão pendente. */
export async function itensDesatualizados(limite: number) {
  const config = await obterConfig();
  const corte = new Date(Date.now() - config.validadeDias * DIA_MS);
  const pendentes = db
    .select({ id: sugestoesPreco.catalogoId })
    .from(sugestoesPreco)
    .where(eq(sugestoesPreco.status, "pendente"));
  const lista = await db
    .select()
    .from(catalogo)
    .where(
      and(
        eq(catalogo.ativo, true),
        or(isNull(catalogo.precoAtualizadoEm), lt(catalogo.precoAtualizadoEm, corte), eq(catalogo.preco, 0)),
      ),
    )
    .orderBy(catalogo.precoAtualizadoEm)
    .limit(limite * 3);
  const ids = new Set((await pendentes).map((p) => p.id));
  // Material sem especificação suficiente (ex.: disjuntor sem corrente) não é cotado.
  return lista
    .filter((i) => !ids.has(i.id))
    .filter((i) => {
      const v = varianteDoItem(i);
      return !v || especificacaoCompleta(v);
    })
    .slice(0, limite);
}

/** Roda pesquisas com IA em paralelo limitado, parando antes do tempo máximo. */
export async function atualizarEmLote(limite: number, { concorrencia = 4, prazoMs = 240_000 } = {}) {
  const inicio = Date.now();
  const fila = await itensDesatualizados(limite);
  const resultado = { pesquisados: 0, sugestoes: 0, falhas: 0 };
  async function trabalhador() {
    for (;;) {
      if (Date.now() - inicio > prazoMs) return;
      const item = fila.shift();
      if (!item) return;
      resultado.pesquisados++;
      try {
        const r = await criarSugestaoIA(item.id);
        if (r.ok) resultado.sugestoes++;
      } catch (e) {
        console.error("lote IA", item.nome, e);
        resultado.falhas++;
      }
    }
  }
  await Promise.all(Array.from({ length: concorrencia }, trabalhador));
  return resultado;
}

/** Carrega os kits sugeridos, criando no catálogo os itens que faltarem (com preço a definir). */
export async function carregarKitsSugeridos() {
  const existentes = await db.select().from(catalogo);
  const porNome = new Map(existentes.map((c) => [normalizar(c.nome), c]));

  async function garantir(nome: string, tipo: "servico" | "material", unidade: string, categoria: string, horas?: { e: number; a: number }) {
    const atual = porNome.get(normalizar(nome));
    if (atual) {
      if (horas && atual.horasEletricista == null && atual.horasAjudante == null) {
        await db.update(catalogo).set({ horasEletricista: horas.e, horasAjudante: horas.a }).where(eq(catalogo.id, atual.id));
      }
      return atual.id;
    }
    const variante = tipo === "material" ? inferirVariante(nome) : null;
    const [novo] = await db
      .insert(catalogo)
      .values({
        tipo,
        nome: variante && especificacaoCompleta(variante) ? nomeVariante(variante) : nome,
        unidade,
        categoria,
        preco: 0,
        precoAtualizadoEm: null,
        familia: variante?.familia ?? null,
        atributos: variante?.atributos ?? {},
        ...(horas ? { horasEletricista: horas.e, horasAjudante: horas.a, precoFixo: false } : {}),
      })
      .returning();
    porNome.set(normalizar(nome), novo);
    return novo.id;
  }

  const jaTem = new Set(
    (await db.select({ chave: kits.chave }).from(kits).where(inArray(kits.chave, KITS_SUGERIDOS.map((k) => k.chave)))).map((k) => k.chave),
  );
  let criados = 0;
  for (const k of KITS_SUGERIDOS) {
    if (jaTem.has(k.chave)) continue;
    const servicoId = await garantir(k.servico.nome, "servico", k.servico.unidade, k.categoria, {
      e: k.servico.horasEletricista,
      a: k.servico.horasAjudante,
    });
    const mats = [];
    for (const m of k.materiais) {
      // Material parametrizável (ex.: disjuntor com a corrente do circuito): não cria item genérico.
      mats.push({ ...m, id: m.familia ? null : await garantir(m.nome, "material", m.unidade, k.categoria) });
    }
    const [kit] = await db
      .insert(kits)
      .values({ chave: k.chave, nome: k.nome, categoria: k.categoria, unidade: k.unidade, descricao: k.descricao })
      .returning();
    await db.insert(kitItens).values([
      { kitId: kit.id, catalogoId: servicoId, tipo: "servico", descricao: k.servico.nome, unidade: k.servico.unidade, quantidade: 1, ordem: 0 },
      ...mats.map((m, i) => ({
        kitId: kit.id,
        catalogoId: m.id,
        tipo: "material",
        descricao: m.nome,
        unidade: m.unidade,
        quantidade: m.qtd,
        ordem: i + 1,
        familia: m.familia ?? null,
        atributos: m.atributos ?? {},
        variaveis: m.variaveis ?? {},
      })),
    ]);
    criados++;
  }
  return criados;
}

/** Kits com seus itens, prontos para o editor de orçamento. */
export async function kitsComItens() {
  const [ks, its] = await Promise.all([
    db.select().from(kits).orderBy(kits.categoria, kits.nome),
    db.select().from(kitItens).orderBy(kitItens.ordem),
  ]);
  return ks.map((k) => ({ ...k, itens: its.filter((i) => i.kitId === k.id) }));
}

export async function sugestoesPendentes() {
  return db
    .select({ s: sugestoesPreco, item: catalogo })
    .from(sugestoesPreco)
    .innerJoin(catalogo, eq(catalogo.id, sugestoesPreco.catalogoId))
    .where(eq(sugestoesPreco.status, "pendente"))
    .orderBy(desc(sugestoesPreco.criadoEm));
}

/* ------------------------------ Variantes ------------------------------- */

/** Cada oferta da web que conferiu com a variante vira um preço por loja. */
export async function registrarOfertasPorLoja(catalogoId: number, ofertas: OfertaPesquisa[]) {
  const linhas = ofertas
    .filter((o) => o.precoConvertido != null && o.precoConvertido > 0 && o.loja.trim())
    .map((o) => ({ catalogoId, loja: o.loja.trim().slice(0, 120), preco: o.precoConvertido!, fonte: "ia" as const, url: o.url.slice(0, 1000) }));
  if (linhas.length) await db.insert(precosLoja).values(linhas);
}

export async function registrarPrecoLoja(
  catalogoId: number,
  dados: { preco: number; loja: string; fornecedorId?: number | null; fonte: "cotacao" | "ia" | "manual"; url?: string },
) {
  await db.insert(precosLoja).values({
    catalogoId,
    preco: dados.preco,
    loja: dados.loja.trim().slice(0, 120) || "Loja",
    fornecedorId: dados.fornecedorId ?? null,
    fonte: dados.fonte,
    url: dados.url ?? "",
  });
}

/**
 * Migração idempotente dos materiais antigos (sem família): infere família e atributos
 * pelo nome; os completos ganham o nome padronizado; os incompletos (ex.: disjuntor sem
 * corrente) ficam marcados e suas sugestões de preço pendentes são invalidadas.
 */
export async function migrarVariantes() {
  const itens = await db.select().from(catalogo).where(and(eq(catalogo.tipo, "material"), isNull(catalogo.familia)));
  let migrados = 0;
  const incompletos: number[] = [];
  for (const i of itens) {
    const e = inferirVariante(i.nome);
    if (!e) continue;
    const completo = especificacaoCompleta(e);
    await db
      .update(catalogo)
      .set({
        familia: e.familia,
        atributos: e.atributos,
        ...(completo ? { nome: nomeVariante(e), especificacao: textoEspecificacao(e) } : {}),
      })
      .where(eq(catalogo.id, i.id));
    if (!completo) incompletos.push(i.id);
    migrados++;
  }
  if (incompletos.length) {
    await db
      .update(sugestoesPreco)
      .set({
        status: "rejeitada",
        decididoEm: new Date(),
        motivo: "Item sem especificação suficiente (ex.: corrente do disjuntor) — o preço misturaria variantes diferentes.",
      })
      .where(and(inArray(sugestoesPreco.catalogoId, incompletos), eq(sugestoesPreco.status, "pendente")));
  }
  // Itens de kit ligados a materiais genéricos passam a ser parametrizáveis.
  const genericos = await db.select().from(catalogo).where(and(eq(catalogo.tipo, "material")));
  const porId = new Map(genericos.map((g) => [g.id, g]));
  const itensKit = await db.select({ ik: kitItens, chave: kits.chave }).from(kitItens).innerJoin(kits, eq(kits.id, kitItens.kitId));
  for (const { ik, chave } of itensKit) {
    if (ik.tipo !== "material" || ik.familia || ik.catalogoId == null) continue;
    const g = porId.get(ik.catalogoId);
    const e = g && ehFamilia(g.familia) ? { familia: g.familia, atributos: limparAtributos(g.familia, g.atributos) } : null;
    if (!e || especificacaoCompleta(e)) continue;
    const sugerido = KITS_SUGERIDOS.find((k) => k.chave === chave)?.materiais.find((m) => m.familia === e.familia)?.variaveis;
    const variaveis: Atributos = {};
    for (const k of faltando(e)) {
      const v = sugerido?.[k] ?? GRADES[e.familia]?.[k]?.[0];
      if (v !== undefined) variaveis[k] = v;
    }
    await db
      .update(kitItens)
      .set({ familia: e.familia, atributos: e.atributos, variaveis, catalogoId: null })
      .where(eq(kitItens.id, ik.id));
  }
  return { migrados, incompletos: incompletos.length };
}

/** Cria no catálogo as variantes escolhidas (pula as que já existem). */
export async function criarVariantes(familia: Familia, combinacoes: Atributos[], preco = 0) {
  const existentes = (await db.select().from(catalogo).where(eq(catalogo.tipo, "material")))
    .map((c) => ({ c, e: varianteDoItem(c) }))
    .filter((x) => x.e?.familia === familia);
  const { unidade, categoria } = PADRAO_FAMILIA[familia];
  let criadas = 0;
  const ids: number[] = [];
  for (const bruto of combinacoes) {
    const e: Especificacao = { familia, atributos: limparAtributos(familia, bruto) };
    if (!especificacaoCompleta(e)) continue;
    const ja = existentes.find((x) => x.e && especificacaoCompleta(x.e) && confere(e, x.e).ok && confere(x.e, e).ok);
    if (ja) {
      ids.push(ja.c.id);
      continue;
    }
    const [novo] = await db
      .insert(catalogo)
      .values({
        tipo: "material",
        categoria,
        unidade,
        nome: nomeVariante(e),
        especificacao: textoEspecificacao(e),
        familia,
        atributos: e.atributos,
        preco,
        precoAtualizadoEm: preco > 0 ? new Date() : null,
      })
      .returning({ id: catalogo.id });
    if (preco > 0) await registrarPreco(novo.id, { preco, fonte: "manual" });
    ids.push(novo.id);
    criadas++;
  }
  return { criadas, ids };
}

/** Preço mais recente de cada item em cada loja (para o comparativo). */
export async function precosPorLoja(catalogoIds: number[]) {
  if (!catalogoIds.length) return [];
  const linhas = await db
    .select()
    .from(precosLoja)
    .where(inArray(precosLoja.catalogoId, catalogoIds))
    .orderBy(desc(precosLoja.criadoEm));
  const vistos = new Set<string>();
  return linhas.filter((l) => {
    const k = `${l.catalogoId}|${normalizar(l.loja)}`;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}
