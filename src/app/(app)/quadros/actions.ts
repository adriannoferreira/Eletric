"use server";

import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { catalogo, clientes, db, kitItens, kits, orcamentoItens, orcamentos, quadros } from "@/db";
import { analisarQuadro } from "@/lib/eletrica/calculo";
import { kitsDaLista, listaDePontos } from "@/lib/eletrica/pontos";
import { expandirKit } from "@/lib/precos/kits";
import { quadroExemplo } from "@/lib/eletrica/exemplos";
import { itensOrcamentoPendencias } from "@/lib/eletrica/manutencao";
import { type ItemOrcamentoGerado, itensOrcamentoDoQuadro, MARCA_SEM_PRECO } from "@/lib/eletrica/orcamento-quadro";
import { gerarQuadro } from "@/lib/eletrica/projeto";
import { trocarCaixa } from "@/lib/eletrica/caixas";
import { larguraPeca } from "@/lib/eletrica/pecas";
import { ModeloSchema, InspecaoSchema, LaudoSchema, ManutencaoSchema, RegistroArtSchema, lerQuadro, novoQuadro, ProjetoObraSchema, type QuadroDados, QuadroDadosSchema } from "@/lib/eletrica/tipos";

const NovoQuadro = z.object({
  nome: z.string().trim().min(1, "Dê um nome ao quadro").max(120),
  clienteId: z.coerce.number().int().positive().optional().catch(undefined),
  tipo: z.enum(["monofasico", "bifasico", "trifasico"]),
  tensoes: z.enum(["127/220", "220/380", "220/220"]),
  esquema: z.enum(["TN-S", "TN-C-S", "TT"]),
  modelo: z.string(),
});

export async function criarQuadro(_: string | null, form: FormData) {
  const r = NovoQuadro.safeParse(Object.fromEntries(form));
  if (!r.success) return r.error.issues[0]?.message ?? "Dados inválidos";
  const d = r.data;
  let modelo: unknown = {};
  try {
    modelo = JSON.parse(d.modelo);
  } catch {
    /* modelo padrão */
  }
  const [fn, ff] = d.tensoes.split("/").map(Number);
  const dados = novoQuadro(
    { tipo: d.tipo, tensaoFN: fn, tensaoFF: d.tipo === "monofasico" ? fn : ff, esquema: d.esquema },
    ModeloSchema.parse(modelo),
  );
  const [q] = await db
    .insert(quadros)
    .values({ nome: d.nome, clienteId: d.clienteId ?? null, dados })
    .returning({ id: quadros.id });
  revalidatePath("/quadros");
  redirect(`/quadros/${q.id}`);
}

export async function salvarQuadro(id: number, nome: string, clienteId: number | null, dados: unknown) {
  const r = QuadroDadosSchema.safeParse(dados);
  if (!r.success) return { ok: false as const, erro: "Dados do quadro inválidos." };
  await db
    .update(quadros)
    .set({ nome: nome.trim() || "Quadro", clienteId, dados: r.data })
    .where(eq(quadros.id, id));
  revalidatePath("/quadros");
  return { ok: true as const };
}

export async function excluirQuadro(id: number) {
  await db.delete(quadros).where(eq(quadros.id, id));
  revalidatePath("/quadros");
  redirect("/quadros");
}

export async function duplicarQuadro(id: number) {
  const [q] = await db.select().from(quadros).where(eq(quadros.id, id));
  if (!q) return;
  const [novo] = await db
    .insert(quadros)
    .values({ nome: `${q.nome} (cópia)`, clienteId: q.clienteId, dados: q.dados })
    .returning({ id: quadros.id });
  revalidatePath("/quadros");
  redirect(`/quadros/${novo.id}`);
}

// ---------------------------------------------------------------------------
// Projeto a partir da obra
// ---------------------------------------------------------------------------

/** Gera o quadro a partir dos dados da obra (no servidor) e cria ou atualiza o registro. */
export async function salvarProjetoObra(
  quadroId: number | null,
  nome: string,
  clienteId: number | null,
  projeto: unknown,
) {
  const r = ProjetoObraSchema.safeParse(projeto);
  if (!r.success) return { ok: false as const, erro: "Dados da obra inválidos." };
  if (r.data.ambientes.length === 0 && r.data.cargas.length === 0) {
    return { ok: false as const, erro: "Informe ao menos um ambiente ou uma carga." };
  }
  const { dados } = gerarQuadro(r.data);
  const nomeOk = nome.trim() || "Projeto da obra";
  let id = quadroId;
  if (id) {
    const [atual] = await db.select({ dados: quadros.dados }).from(quadros).where(eq(quadros.id, id));
    if (!atual) return { ok: false as const, erro: "Quadro não encontrado." };
    // Mantém o histórico de inspeções e o laudo ao regerar o projeto.
    const anterior = lerQuadro(atual.dados);
    await db
      .update(quadros)
      .set({ nome: nomeOk, clienteId, dados: { ...dados, inspecoes: anterior.inspecoes, laudo: anterior.laudo, art: anterior.art, manutencao: anterior.manutencao } })
      .where(eq(quadros.id, id));
  } else {
    const [q] = await db.insert(quadros).values({ nome: nomeOk, clienteId, dados }).returning({ id: quadros.id });
    id = q.id;
  }
  revalidatePath("/quadros");
  revalidatePath(`/quadros/${id}`);
  return { ok: true as const, id };
}

/** Guarda o último memorial gerado pela IA dentro dos dados do quadro. */
export async function salvarMemorial(id: number, texto: string) {
  const memorial = { texto: texto.slice(0, 100_000), geradoEm: new Date().toISOString() };
  await db
    .update(quadros)
    .set({ dados: sql`jsonb_set(${quadros.dados}, '{memorial}', ${JSON.stringify(memorial)}::jsonb, true)` })
    .where(eq(quadros.id, id));
  return memorial;
}

// ---------------------------------------------------------------------------
// Modelos de quadro
// ---------------------------------------------------------------------------

export async function salvarComoModelo(nome: string, descricao: string, dados: unknown) {
  const r = QuadroDadosSchema.safeParse(dados);
  if (!r.success) return { ok: false as const, erro: "Dados do quadro inválidos." };
  const n = nome.trim();
  if (!n) return { ok: false as const, erro: "Dê um nome ao modelo." };
  await db.insert(quadros).values({
    nome: n.slice(0, 120),
    descricao: descricao.trim().slice(0, 300),
    clienteId: null,
    modelo: true,
    dados: { ...r.data, memorial: null, compras: [], inspecoes: [], laudo: null, art: null, manutencao: null },
  });
  revalidatePath("/quadros");
  return { ok: true as const };
}

export async function usarModelo(modeloId: number, nome: string, clienteId: number | null, novaCaixa?: unknown) {
  const [m] = await db
    .select()
    .from(quadros)
    .where(and(eq(quadros.id, modeloId), eq(quadros.modelo, true)));
  if (!m) return "Modelo não encontrado.";
  let dados: QuadroDados = { ...lerQuadro(m.dados), memorial: null, compras: [], inspecoes: [], laudo: null, art: null, manutencao: null };
  if (novaCaixa) {
    const modelo = ModeloSchema.parse(novaCaixa);
    const r = trocarCaixa(dados.componentes, modelo, larguraPeca);
    if (r.naoCouberam.length) return `${r.naoCouberam.length} peça(s) não cabem na caixa escolhida. Escolha uma caixa maior.`;
    dados = { ...dados, modelo, componentes: r.componentes };
  }
  const [q] = await db
    .insert(quadros)
    .values({ nome: nome.trim() || m.nome, clienteId, dados })
    .returning({ id: quadros.id });
  revalidatePath("/quadros");
  redirect(`/quadros/${q.id}`);
}

export async function renomearModelo(id: number, nome: string, descricao: string) {
  const n = nome.trim();
  if (!n) return;
  await db
    .update(quadros)
    .set({ nome: n.slice(0, 120), descricao: descricao.trim().slice(0, 300) })
    .where(and(eq(quadros.id, id), eq(quadros.modelo, true)));
  revalidatePath("/quadros");
}

export async function excluirModelo(id: number) {
  await db.delete(quadros).where(and(eq(quadros.id, id), eq(quadros.modelo, true)));
  revalidatePath("/quadros");
}

/** Carrega um dos modelos de exemplo na lista de modelos do usuário. */
export async function carregarExemplo(exemploId: string) {
  const ex = quadroExemplo(exemploId);
  if (!ex) return;
  await db.insert(quadros).values({ nome: ex.nome, descricao: ex.descricao, modelo: true, dados: ex.dados });
  revalidatePath("/quadros");
}

// ---------------------------------------------------------------------------
// Lista de compras e orçamento
// ---------------------------------------------------------------------------

/** Marca/desmarca itens comprados (salvo direto no banco para sincronizar aparelhos). */
export async function salvarCompras(id: number, chaves: string[]) {
  const lista = [...new Set(chaves.filter((c) => typeof c === "string"))].slice(0, 500);
  await db
    .update(quadros)
    .set({ dados: sql`jsonb_set(${quadros.dados}, '{compras}', ${JSON.stringify(lista)}::jsonb, true)` })
    .where(eq(quadros.id, id));
}

/** Marca as ligações já feitas na montagem (salva só esse campo). */
export async function salvarLigacoesFeitas(id: number, chaves: string[]) {
  const lista = [...new Set(chaves.filter((c) => typeof c === "string"))].slice(0, 2000);
  await db
    .update(quadros)
    .set({
      dados: sql`jsonb_set(${quadros.dados}, '{ligacoes}', coalesce(${quadros.dados}->'ligacoes', '{}'::jsonb) || jsonb_build_object('feitas', ${JSON.stringify(lista)}::jsonb), true)`,
    })
    .where(eq(quadros.id, id));
}

/**
 * Cria um orçamento (rascunho) a partir do quadro salvo: materiais da lista do
 * quadro + mão de obra, com preços do catálogo. Redireciona para o editor.
 */
/** Cria um orçamento rascunho com os itens dados e redireciona para o editor. */
async function criarOrcamento(
  clienteId: number,
  titulo: string,
  observacoes: string,
  itens: (ItemOrcamentoGerado & { grupo?: string })[],
) {
  const [o] = await db
    .insert(orcamentos)
    .values({ clienteId, titulo, tokenPublico: randomBytes(12).toString("base64url"), observacoes })
    .returning({ id: orcamentos.id });
  if (itens.length) {
    await db.insert(orcamentoItens).values(
      itens.map((i, ordem) => ({
        orcamentoId: o.id,
        tipo: i.tipo,
        descricao: i.descricao,
        quantidade: i.quantidade,
        unidade: i.unidade,
        precoUnitario: i.precoUnitario,
        grupo: i.grupo ?? "",
        ordem,
      })),
    );
  }
  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${o.id}`);
}

async function quadroECliente(quadroId: number, clienteEscolhido: number | null) {
  const [q] = await db.select().from(quadros).where(eq(quadros.id, quadroId));
  if (!q) return { erro: "Quadro não encontrado." } as const;
  const clienteId = clienteEscolhido ?? q.clienteId;
  if (!clienteId) return { erro: "Escolha o cliente do orçamento." } as const;
  const [cli] = await db.select({ id: clientes.id }).from(clientes).where(eq(clientes.id, clienteId));
  if (!cli) return { erro: "Cliente não encontrado." } as const;
  if (!q.clienteId && !q.modelo) await db.update(quadros).set({ clienteId }).where(eq(quadros.id, quadroId));
  const cat = await db
    .select({ tipo: catalogo.tipo, nome: catalogo.nome, unidade: catalogo.unidade, preco: catalogo.preco })
    .from(catalogo)
    .where(eq(catalogo.ativo, true));
  return { q, clienteId, cat, dados: lerQuadro(q.dados) } as const;
}

/**
 * Cria um orçamento (rascunho) a partir do quadro salvo: materiais da lista do
 * quadro + mão de obra, com preços do catálogo. Redireciona para o editor.
 */
export async function gerarOrcamentoDoQuadro(quadroId: number, clienteEscolhido: number | null) {
  const r = await quadroECliente(quadroId, clienteEscolhido);
  if ("erro" in r) return r.erro;
  await criarOrcamento(
    r.clienteId,
    `Instalação do quadro ${r.q.nome}`,
    [
      "Serviço executado conforme a ABNT NBR 5410 (instalações elétricas de baixa tensão) e a NR-10.",
      "Materiais e quantidades conforme o projeto do quadro de distribuição; cabos com 10% de folga.",
    ].join("\n"),
    itensOrcamentoDoQuadro(r.dados, r.cat),
  );
}

/** Orçamento das pendências de uma visita de manutenção preventiva. */
export async function gerarOrcamentoPendencias(quadroId: number, visitaId: string, clienteEscolhido: number | null) {
  const r = await quadroECliente(quadroId, clienteEscolhido);
  if ("erro" in r) return r.erro;
  const visita = r.dados.manutencao?.visitas.find((v) => v.id === visitaId);
  if (!visita) return "Visita não encontrada (salve a visita antes).";
  const itens = itensOrcamentoPendencias(r.dados, visita, r.cat);
  if (!itens.length) return "Esta visita não tem pendências.";
  await criarOrcamento(
    r.clienteId,
    `Correções da manutenção preventiva nº ${visita.numero} — ${r.q.nome}`,
    "Correções identificadas na manutenção preventiva, a executar conforme a ABNT NBR 5410 e a NR-10.",
    itens,
  );
}

export async function salvarManutencao(id: number, manutencao: unknown) {
  const r = ManutencaoSchema.safeParse(manutencao);
  if (!r.success) return { ok: false as const };
  await db
    .update(quadros)
    .set({ dados: sql`jsonb_set(${quadros.dados}, '{manutencao}', ${JSON.stringify(r.data)}::jsonb, true)` })
    .where(eq(quadros.id, id));
  revalidatePath("/");
  return { ok: true as const };
}

/** Salva o histórico de inspeções (direto no banco, para sincronizar celular e notebook). */
export async function salvarInspecoes(id: number, inspecoes: unknown) {
  const r = z.array(InspecaoSchema).safeParse(inspecoes);
  if (!r.success) return { ok: false as const };
  await db
    .update(quadros)
    .set({ dados: sql`jsonb_set(${quadros.dados}, '{inspecoes}', ${JSON.stringify(r.data)}::jsonb, true)` })
    .where(eq(quadros.id, id));
  return { ok: true as const };
}

export async function salvarLaudo(id: number, laudo: unknown) {
  const r = LaudoSchema.safeParse(laudo);
  if (!r.success) return { ok: false as const };
  const valor = { ...r.data, atualizadoEm: new Date().toISOString() };
  await db
    .update(quadros)
    .set({ dados: sql`jsonb_set(${quadros.dados}, '{laudo}', ${JSON.stringify(valor)}::jsonb, true)` })
    .where(eq(quadros.id, id));
  return { ok: true as const, laudo: valor };
}

export async function salvarArt(id: number, art: unknown) {
  const r = RegistroArtSchema.safeParse(art);
  if (!r.success) return { ok: false as const };
  await db
    .update(quadros)
    .set({ dados: sql`jsonb_set(${quadros.dados}, '{art}', ${JSON.stringify(r.data)}::jsonb, true)` })
    .where(eq(quadros.id, id));
  return { ok: true as const };
}

/** Salva o checklist da lista de pontos (direto no banco, para sincronizar celular e notebook). */
export async function salvarPontosFeitos(id: number, feitos: string[]) {
  const r = z.array(z.string().max(200)).max(2000).safeParse(feitos);
  if (!r.success) return { ok: false as const };
  await db
    .update(quadros)
    .set({
      dados: sql`jsonb_set(${quadros.dados}, '{pontos}', coalesce(${quadros.dados}->'pontos', '{"ajustes":{}}'::jsonb) || jsonb_build_object('feitos', ${JSON.stringify(r.data)}::jsonb), true)`,
    })
    .where(eq(quadros.id, id));
  return { ok: true as const };
}

/**
 * Orçamento da lista de pontos: um kit do catálogo por tipo de ponto (tomada 10/20 A,
 * iluminação, interruptor, chuveiro, ar), com os materiais e preços do próprio kit.
 * Pontos sem kit cadastrado entram como serviço a definir preço.
 */
export async function gerarOrcamentoPontos(quadroId: number, clienteEscolhido: number | null) {
  const r = await quadroECliente(quadroId, clienteEscolhido);
  if ("erro" in r) return r.erro;
  const lista = listaDePontos(r.dados, analisarQuadro(r.dados));
  const { kits: pedidos, avulsos } = kitsDaLista(lista);
  if (!pedidos.length && !avulsos.length) return "O quadro não tem pontos para orçar.";

  const linhas = await db.select().from(kits);
  const porChave = new Map(linhas.filter((k) => k.chave).map((k) => [k.chave!, k]));
  const ids = pedidos.map((p) => porChave.get(p.chave)?.id).filter((x): x is number => x != null);
  const itensKits = ids.length ? await db.select().from(kitItens) : [];
  // Catálogo completo (com família/atributos): expandirKit resolve a variante exata de cada material.
  const cat = await db.select().from(catalogo);
  const precos = new Map(cat.map((c) => [c.id, c]));

  const ROTULO: Record<string, string> = {
    "tomada-10a-embutida": "Ponto de tomada 10 A",
    "tomada-20a-embutida": "Ponto de tomada 20 A",
    "ponto-iluminacao": "Ponto de iluminação",
    "interruptor-simples": "Ponto de interruptor simples",
    "interruptor-paralelo": "Interruptor paralelo (dois pontos)",
    "chuveiro-circuito": "Ponto de chuveiro",
    "ar-condicionado": "Ponto de ar-condicionado",
  };
  const itens: (ItemOrcamentoGerado & { grupo?: string })[] = [];
  for (const pedido of pedidos) {
    const kit = porChave.get(pedido.chave);
    const doKit = kit ? itensKits.filter((i) => i.kitId === kit.id).sort((a, b) => a.ordem - b.ordem) : [];
    if (kit && doKit.length) {
      for (const i of expandirKit({ nome: kit.nome, itens: doKit }, pedido.quantidade, precos)) {
        const semPreco = i.precoUnitario <= 0;
        itens.push({ ...i, descricao: semPreco ? i.descricao + MARCA_SEM_PRECO : i.descricao, semPreco });
      }
    } else {
      itens.push({
        tipo: "servico",
        descricao: `${ROTULO[pedido.chave] ?? pedido.chave}${MARCA_SEM_PRECO}`,
        quantidade: pedido.quantidade,
        unidade: "un",
        precoUnitario: 0,
        semPreco: true,
      });
    }
  }
  for (const a of avulsos) {
    itens.push({ tipo: "servico", descricao: a.descricao + MARCA_SEM_PRECO, quantidade: a.quantidade, unidade: "un", precoUnitario: 0, semPreco: true });
  }
  await criarOrcamento(
    r.clienteId,
    `Pontos elétricos — ${r.q.nome}`,
    [
      `Lista de pontos por ambiente: ${lista.totais.pontosLuz} ponto(s) de luz, ${lista.totais.interruptores} interruptor(es), ${lista.totais.tug} tomada(s) de uso geral e ${lista.totais.tue} ponto(s) de uso específico.`,
      "Quantidades mínimas conforme a ABNT NBR 5410 (9.5.2); execução conforme a NBR 5410 e a NR-10.",
      ...(porChave.size ? [] : ["Dica: carregue os kits sugeridos em Catálogo → Kits para os pontos virem com materiais e preços."]),
    ].join("\n"),
    itens,
  );
}
