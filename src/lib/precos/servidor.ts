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
  perfil,
  precosHistorico,
  sugestoesPreco,
} from "@/db";
import { pesquisarPrecoIA } from "./ia";
import { KITS_SUGERIDOS } from "./kits-sugeridos";
import { DIA_MS, normalizar, precoEfetivo, precoPreferido } from "./regras";

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
  const config = await obterConfig();
  const r = await pesquisarPrecoIA(item, { cidade: config.cidade, uf: config.uf });
  if (!r.encontrado || r.mediano == null) {
    return { ok: false as const, mensagem: r.observacao || "Não encontrei preços confiáveis para este item." };
  }
  await db
    .update(sugestoesPreco)
    .set({ status: "rejeitada", decididoEm: new Date() })
    .where(and(eq(sugestoesPreco.catalogoId, catalogoId), eq(sugestoesPreco.status, "pendente")));
  const [s] = await db
    .insert(sugestoesPreco)
    .values({
      catalogoId,
      fonte: "ia",
      preco: r.mediano,
      minimo: r.minimo,
      maximo: r.maximo,
      fontesWeb: r.fontes.slice(0, 8),
      observacao: [r.unidade && `Unidade: ${r.unidade}.`, r.observacao].filter(Boolean).join(" "),
    })
    .returning();
  if (item.tipo === "servico") {
    await db
      .update(catalogo)
      .set({ mercadoMin: r.minimo, mercadoMax: r.maximo, mercadoAtualizadoEm: new Date() })
      .where(eq(catalogo.id, catalogoId));
  }
  return { ok: true as const, sugestao: s };
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
    referencia: s.observacao,
    fontesWeb: s.fontesWeb,
  });
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
  return lista.filter((i) => !ids.has(i.id)).slice(0, limite);
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
    const [novo] = await db
      .insert(catalogo)
      .values({
        tipo,
        nome,
        unidade,
        categoria,
        preco: 0,
        precoAtualizadoEm: null,
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
    for (const m of k.materiais) mats.push({ ...m, id: await garantir(m.nome, "material", m.unidade, k.categoria) });
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
