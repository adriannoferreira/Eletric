"use server";

import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  catalogo,
  configPrecos,
  db,
  fornecedores,
  kitItens,
  kits,
  precosHistorico,
  sinapiItens,
} from "@/db";
import { ErroIA } from "@/lib/precos/ia";
import { normalizar } from "@/lib/precos/regras";
import {
  atualizarEmLote,
  carregarKitsSugeridos,
  criarSugestaoIA,
  decidirSugestao,
  obterConfig,
  registrarPreco,
} from "@/lib/precos/servidor";
import { CATALOGO_INICIAL } from "./sugestoes";

const revalidar = () => {
  revalidatePath("/catalogo", "layout");
  revalidatePath("/");
};

const num = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(/\s/g, "");
  if (!s) return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isFinite(n) ? n : null;
};

/* --------------------------------- Itens --------------------------------- */

const Item = z.object({
  tipo: z.enum(["servico", "material"]),
  categoria: z.string().trim().max(100),
  nome: z.string().trim().min(1, "Informe o nome").max(300),
  unidade: z.string().trim().min(1, "Informe a unidade").max(20),
  especificacao: z.string().trim().max(500),
  fornecedor: z.string().trim().max(200),
  codigoSinapi: z.string().trim().max(20),
});

export async function salvarItem(_: string | null, form: FormData) {
  const dados = Item.safeParse({
    tipo: form.get("tipo"),
    categoria: form.get("categoria") ?? "",
    nome: form.get("nome"),
    unidade: form.get("unidade") ?? "un",
    especificacao: form.get("especificacao") ?? "",
    fornecedor: form.get("fornecedor") ?? "",
    codigoSinapi: form.get("codigoSinapi") ?? "",
  });
  if (!dados.success) return dados.error.issues[0]?.message ?? "Dados inválidos";
  const preco = num(form.get("preco")) ?? 0;
  if (preco < 0) return "Preço inválido";
  const servico = dados.data.tipo === "servico";
  const extras = {
    horasEletricista: servico ? num(form.get("horasEletricista")) : null,
    horasAjudante: servico ? num(form.get("horasAjudante")) : null,
    multiplicador: servico ? (num(form.get("multiplicador")) ?? 1) : 1,
    deslocamento: servico ? num(form.get("deslocamento")) : null,
    precoFixo: servico ? form.get("precoFixo") === "on" : true,
  };
  const valores = { ...dados.data, ...extras, categoria: dados.data.categoria || "Geral" };
  const id = Number(form.get("id")) || null;

  if (id) {
    const [antes] = await db.select().from(catalogo).where(eq(catalogo.id, id));
    await db.update(catalogo).set(valores).where(eq(catalogo.id, id));
    if (antes && Math.abs(antes.preco - preco) > 0.004) await registrarPreco(id, { preco, fonte: "manual" });
  } else {
    const [novo] = await db.insert(catalogo).values({ ...valores, preco }).returning({ id: catalogo.id });
    if (preco > 0) await registrarPreco(novo.id, { preco, fonte: "manual" });
  }
  revalidar();
  return null;
}

export async function excluirItem(id: number) {
  await db.delete(catalogo).where(eq(catalogo.id, id));
  revalidar();
}

export async function carregarCatalogoInicial() {
  await db.insert(catalogo).values(CATALOGO_INICIAL);
  revalidar();
}

export async function historicoItem(id: number) {
  return db
    .select()
    .from(precosHistorico)
    .where(eq(precosHistorico.catalogoId, id))
    .orderBy(precosHistorico.criadoEm)
    .then((l) => l.reverse().slice(0, 20));
}

/* ------------------------------ Pesquisa IA ------------------------------ */

export async function pesquisarItemIA(id: number) {
  try {
    const r = await criarSugestaoIA(id);
    revalidar();
    return r.ok ? { ok: true as const, sugestao: r.sugestao } : { ok: false as const, erro: r.mensagem };
  } catch (e) {
    return { ok: false as const, erro: e instanceof ErroIA ? e.message : "Erro ao pesquisar o preço." };
  }
}

export async function decidir(sugestaoId: number, aprovar: boolean, preco?: number) {
  await decidirSugestao(sugestaoId, aprovar, preco);
  revalidar();
}

export async function atualizarDesatualizados() {
  const r = await atualizarEmLote(8, { concorrencia: 4, prazoMs: 200_000 });
  revalidar();
  return r;
}

/* --------------------------------- Kits ---------------------------------- */

export async function carregarKits() {
  const n = await carregarKitsSugeridos();
  revalidar();
  return n;
}

const Kit = z.object({
  id: z.number().int().positive().nullable(),
  nome: z.string().trim().min(1, "Informe o nome do kit").max(200),
  categoria: z.string().trim().max(100),
  unidade: z.string().trim().min(1).max(20),
  descricao: z.string().trim().max(1000),
  itens: z
    .array(
      z.object({
        catalogoId: z.number().int().positive().nullable(),
        tipo: z.enum(["servico", "material"]),
        descricao: z.string().trim().min(1).max(300),
        unidade: z.string().trim().max(20),
        quantidade: z.number().positive("Quantidade deve ser maior que zero"),
      }),
    )
    .min(1, "Adicione ao menos um item ao kit")
    .max(100),
});

export async function salvarKit(dados: z.input<typeof Kit>) {
  const ok = Kit.safeParse(dados);
  if (!ok.success) return ok.error.issues[0]?.message ?? "Dados inválidos";
  const { id, itens, ...kit } = ok.data;
  let kitId = id;
  if (kitId) await db.update(kits).set({ ...kit, categoria: kit.categoria || "Geral" }).where(eq(kits.id, kitId));
  else [{ id: kitId }] = await db.insert(kits).values({ ...kit, categoria: kit.categoria || "Geral" }).returning({ id: kits.id });
  await db.delete(kitItens).where(eq(kitItens.kitId, kitId!));
  await db.insert(kitItens).values(itens.map((i, ordem) => ({ ...i, kitId: kitId!, ordem })));
  revalidar();
  return null;
}

export async function excluirKit(id: number) {
  await db.delete(kits).where(eq(kits.id, id));
  revalidar();
}

/* ------------------------------ Fornecedores ----------------------------- */

export async function salvarFornecedor(_: string | null, form: FormData) {
  const nome = String(form.get("nome") ?? "").trim();
  if (!nome) return "Informe o nome da loja";
  const valores = {
    nome: nome.slice(0, 200),
    whatsapp: String(form.get("whatsapp") ?? "").trim().slice(0, 40),
    cidade: String(form.get("cidade") ?? "").trim().slice(0, 100),
  };
  const id = Number(form.get("id")) || null;
  if (id) await db.update(fornecedores).set(valores).where(eq(fornecedores.id, id));
  else await db.insert(fornecedores).values(valores);
  revalidar();
  return "ok";
}

export async function excluirFornecedor(id: number) {
  await db.delete(fornecedores).where(eq(fornecedores.id, id));
  revalidar();
}

const ItensCotacao = z.array(
  z.object({
    catalogoId: z.number().int().positive().nullable(),
    criarNovo: z.boolean(),
    tipo: z.enum(["servico", "material"]),
    descricao: z.string().trim().min(1).max(300),
    unidade: z.string().trim().max(20),
    preco: z.number().positive(),
  }),
);

/** Grava os preços aprovados de uma cotação (cria itens novos quando pedido). */
export async function aplicarCotacao(fornecedorId: number | null, itens: z.input<typeof ItensCotacao>) {
  const ok = ItensCotacao.safeParse(itens);
  if (!ok.success) return { erro: "Confira os itens: descrição e preço maior que zero.", aplicados: 0 };
  const [forn] = fornecedorId ? await db.select().from(fornecedores).where(eq(fornecedores.id, fornecedorId)) : [];
  let aplicados = 0;
  for (const i of ok.data) {
    let id = i.catalogoId;
    if (!id && i.criarNovo) {
      [{ id }] = await db
        .insert(catalogo)
        .values({ tipo: i.tipo, nome: i.descricao, unidade: i.unidade || "un", categoria: "Cotações", preco: i.preco })
        .returning({ id: catalogo.id });
    }
    if (!id) continue;
    await registrarPreco(id, {
      preco: i.preco,
      fonte: "cotacao",
      fornecedorId: forn?.id ?? null,
      fornecedorNome: forn?.nome ?? "",
      referencia: i.descricao,
    });
    aplicados++;
  }
  revalidar();
  return { erro: null, aplicados };
}

/* -------------------------------- SINAPI --------------------------------- */

const LoteSinapi = z.object({
  regime: z.enum(["nao_desonerado", "desonerado"]),
  uf: z.string().length(2),
  referencia: z.string().max(20),
  itens: z
    .array(
      z.object({
        tipo: z.enum(["insumo", "composicao"]),
        codigo: z.string().min(1).max(20),
        descricao: z.string().min(1).max(1000),
        unidade: z.string().max(20),
        preco: z.number().nullable(),
      }),
    )
    .max(2000),
  horas: z.record(z.string(), z.object({ eletricista: z.number(), ajudante: z.number() })).optional(),
});

export async function importarSinapiLote(lote: z.input<typeof LoteSinapi>) {
  const ok = LoteSinapi.safeParse(lote);
  if (!ok.success) return "Lote inválido";
  const { regime, uf, referencia, itens, horas } = ok.data;
  if (itens.length) {
    await db
      .insert(sinapiItens)
      .values(itens.map((i) => ({ ...i, regime, uf, referencia })))
      .onConflictDoUpdate({
        target: [sinapiItens.tipo, sinapiItens.codigo, sinapiItens.regime],
        set: {
          descricao: sqlExcluded("descricao"),
          unidade: sqlExcluded("unidade"),
          preco: sqlExcluded("preco"),
          uf: sqlExcluded("uf"),
          referencia: sqlExcluded("referencia"),
        },
      });
  }
  if (horas) {
    for (const [codigo, h] of Object.entries(horas)) {
      await db
        .update(sinapiItens)
        .set({ horasEletricista: h.eletricista, horasAjudante: h.ajudante })
        .where(and(eq(sinapiItens.tipo, "composicao"), eq(sinapiItens.codigo, codigo)));
    }
  }
  if (referencia) await db.update(configPrecos).set({ referenciaSinapi: referencia }).where(eq(configPrecos.id, 1));
  return null;
}

function sqlExcluded(coluna: string) {
  return sql.raw(`excluded.${coluna}`);
}

/** Busca no SINAPI importado por palavras da descrição. */
export async function buscarSinapi(texto: string, tipo: "insumo" | "composicao") {
  const config = await obterConfig();
  const palavras = normalizar(texto)
    .split(" ")
    .filter((p) => p.length >= 2)
    .slice(0, 6);
  if (!palavras.length) return [];
  return db
    .select()
    .from(sinapiItens)
    .where(
      and(
        eq(sinapiItens.tipo, tipo),
        eq(sinapiItens.regime, config.regimeSinapi),
        ...palavras.map((p) => or(ilike(sinapiItens.descricao, `%${p}%`), ilike(sinapiItens.codigo, `${p}%`))),
      ),
    )
    .limit(15);
}

/** Liga um item do catálogo a um código SINAPI e registra o preço/horas de referência. */
export async function associarSinapi(catalogoId: number, sinapiId: number) {
  const [s] = await db.select().from(sinapiItens).where(eq(sinapiItens.id, sinapiId));
  const [item] = await db.select().from(catalogo).where(eq(catalogo.id, catalogoId));
  if (!s || !item) return;
  await db.update(catalogo).set({ codigoSinapi: s.codigo }).where(eq(catalogo.id, catalogoId));
  if (item.tipo === "servico" && (s.horasEletricista || s.horasAjudante)) {
    await db
      .update(catalogo)
      .set({ horasEletricista: s.horasEletricista, horasAjudante: s.horasAjudante })
      .where(eq(catalogo.id, catalogoId));
  }
  if (item.tipo === "material" && s.preco) {
    await registrarPreco(catalogoId, {
      preco: Math.round(s.preco * 100) / 100,
      fonte: "sinapi",
      referencia: `SINAPI ${s.codigo} ${s.uf} ${s.referencia} (${s.regime === "desonerado" ? "desonerado" : "não desonerado"})`,
    });
  }
  revalidar();
}

/** Reaplica o preço SINAPI (com a margem atual) em todos os itens ligados a um código. */
export async function atualizarPelosCodigosSinapi() {
  const config = await obterConfig();
  const ligados = await db.select().from(catalogo).where(and(eq(catalogo.tipo, "material")));
  const comCodigo = ligados.filter((i) => i.codigoSinapi);
  if (!comCodigo.length) return 0;
  const refs = await db
    .select()
    .from(sinapiItens)
    .where(
      and(
        eq(sinapiItens.tipo, "insumo"),
        eq(sinapiItens.regime, config.regimeSinapi),
        inArray(sinapiItens.codigo, comCodigo.map((i) => i.codigoSinapi)),
      ),
    );
  const porCodigo = new Map(refs.map((r) => [r.codigo, r]));
  let n = 0;
  for (const i of comCodigo) {
    const r = porCodigo.get(i.codigoSinapi);
    if (!r?.preco) continue;
    await registrarPreco(i.id, {
      preco: Math.round(r.preco * 100) / 100,
      fonte: "sinapi",
      referencia: `SINAPI ${r.codigo} ${r.uf} ${r.referencia}`,
    });
    n++;
  }
  revalidar();
  return n;
}

const Config = z.object({
  cidade: z.string().trim().min(1).max(100),
  margemSinapi: z.number().min(0).max(500),
  regimeSinapi: z.enum(["nao_desonerado", "desonerado"]),
  margemServico: z.number().min(0).max(500),
  valorHoraAjudante: z.number().min(0).nullable(),
  validadeDias: z.number().int().min(7).max(365),
});

export async function salvarConfig(_: string | null, form: FormData) {
  const ok = Config.safeParse({
    cidade: form.get("cidade"),
    margemSinapi: num(form.get("margemSinapi")) ?? 30,
    regimeSinapi: form.get("regimeSinapi"),
    margemServico: num(form.get("margemServico")) ?? 0,
    valorHoraAjudante: num(form.get("valorHoraAjudante")),
    validadeDias: num(form.get("validadeDias")) ?? 60,
  });
  if (!ok.success) return ok.error.issues[0]?.message ?? "Dados inválidos";
  await obterConfig();
  await db.update(configPrecos).set(ok.data).where(eq(configPrecos.id, 1));
  revalidar();
  return "ok";
}
