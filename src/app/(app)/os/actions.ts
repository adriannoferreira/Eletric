"use server";

import { and, asc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  clientes,
  configServicos,
  db,
  medicoes,
  orcamentoItens,
  orcamentos,
  ordensServico,
  osFotos,
  osHoras,
  osMateriais,
  type ItemChecklist,
  visitas,
} from "@/db";
import { totais } from "@/lib/orcamento";
import { gerarLegendas } from "@/lib/servicos/legendas-ia";
import { avaliarMedicao } from "@/lib/servicos/medicoes";
import { CHECKLIST_PADRAO, criarChecklist } from "@/lib/servicos/checklists";
import { guiaPorChave } from "@/lib/servicos/guias";
import { deDataHoraLocal, podeMudar, type StatusOS } from "@/lib/servicos/os";

const atualizar = (id: number) => {
  revalidatePath(`/os/${id}`);
  revalidatePath("/os");
  revalidatePath("/agenda");
  revalidatePath("/");
};

function enderecoDoCliente(c: { endereco: string; bairro: string; cidade: string }) {
  return [c.endereco, c.bairro, c.cidade].filter(Boolean).join(", ");
}

function checklistDoGuia(chave: string | null | undefined) {
  const g = chave ? guiaPorChave(chave) : undefined;
  return criarChecklist(g?.checklistEntrega.length ? g.checklistEntrega : CHECKLIST_PADRAO);
}

const NovaOS = z.object({
  clienteId: z.coerce.number().int().positive("Escolha o cliente."),
  titulo: z.string().trim().min(1, "Dê um título ao serviço.").max(200),
  categoria: z.string().trim().max(80).default("Geral"),
  guia: z.string().trim().max(80).optional(),
  endereco: z.string().trim().max(400).default(""),
  descricao: z.string().trim().max(5000).default(""),
  inicio: z.string().trim().optional(),
  duracaoMin: z.coerce.number().int().min(15).max(24 * 60).default(120),
  orcamentoId: z.coerce.number().int().positive().optional(),
  quadroId: z.coerce.number().int().positive().optional(),
});

export async function criarOS(_: string | null, form: FormData) {
  const bruto = Object.fromEntries([...form.entries()].filter(([, v]) => v !== ""));
  const dados = NovaOS.safeParse(bruto);
  if (!dados.success) return dados.error.issues[0]?.message ?? "Dados inválidos";
  const d = dados.data;

  const inicio = d.inicio ? deDataHoraLocal(d.inicio) : null;
  if (d.inicio && !inicio) return "Data/hora inválida.";

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, d.clienteId));
  if (!cliente) return "Cliente não encontrado.";
  const [cfg] = await db.select().from(configServicos).limit(1);

  let valor: number | null = null;
  let itensMaterial: { descricao: string; unidade: string; quantidade: number; precoUnitario: number }[] = [];
  if (d.orcamentoId) {
    const itens = await db.select().from(orcamentoItens).where(eq(orcamentoItens.orcamentoId, d.orcamentoId));
    const [o] = await db.select().from(orcamentos).where(eq(orcamentos.id, d.orcamentoId));
    if (o) valor = totais(itens, o.desconto).total;
    itensMaterial = itens
      .filter((i) => i.tipo === "material")
      .map(({ descricao, unidade, quantidade, precoUnitario }) => ({ descricao, unidade, quantidade, precoUnitario }));
  }

  const [os] = await db
    .insert(ordensServico)
    .values({
      clienteId: d.clienteId,
      titulo: d.titulo,
      categoria: d.categoria || "Geral",
      guia: d.guia || null,
      endereco: d.endereco || enderecoDoCliente(cliente),
      descricao: d.descricao,
      orcamentoId: d.orcamentoId ?? null,
      quadroId: d.quadroId ?? null,
      checklist: checklistDoGuia(d.guia),
      garantiaDias: cfg?.garantiaPadraoDias ?? 90,
      valor,
    })
    .returning({ id: ordensServico.id });

  if (inicio) await db.insert(visitas).values({ osId: os.id, inicio, duracaoMin: d.duracaoMin });
  if (itensMaterial.length) await db.insert(osMateriais).values(itensMaterial.map((i) => ({ ...i, osId: os.id })));

  atualizar(os.id);
  redirect(`/os/${os.id}`);
}

/** Cria uma OS a partir de um orçamento (usado também pelo editor de orçamentos). */
export async function criarOSDeOrcamento(orcamentoId: number) {
  const [existente] = await db
    .select({ id: ordensServico.id })
    .from(ordensServico)
    .where(eq(ordensServico.orcamentoId, orcamentoId));
  if (existente) redirect(`/os/${existente.id}`);

  const [o] = await db.select().from(orcamentos).where(eq(orcamentos.id, orcamentoId));
  if (!o) throw new Error("Orçamento não encontrado");
  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, o.clienteId));
  const itens = await db
    .select()
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, orcamentoId))
    .orderBy(asc(orcamentoItens.ordem));
  const [cfg] = await db.select().from(configServicos).limit(1);

  const servicos = itens.filter((i) => i.tipo !== "material");
  const [os] = await db
    .insert(ordensServico)
    .values({
      clienteId: o.clienteId,
      orcamentoId,
      titulo: o.titulo,
      descricao: servicos.map((s) => `• ${s.quantidade} ${s.unidade} — ${s.descricao}`).join("\n"),
      endereco: cliente ? enderecoDoCliente(cliente) : "",
      checklist: criarChecklist(CHECKLIST_PADRAO),
      garantiaDias: cfg?.garantiaPadraoDias ?? 90,
      valor: totais(itens, o.desconto).total,
      formaPagamento: o.condicoesPagamento,
    })
    .returning({ id: ordensServico.id });

  const materiais = itens.filter((i) => i.tipo === "material");
  if (materiais.length) {
    await db.insert(osMateriais).values(
      materiais.map(({ descricao, unidade, quantidade, precoUnitario }) => ({
        osId: os.id,
        descricao,
        unidade,
        quantidade,
        precoUnitario,
      })),
    );
  }
  atualizar(os.id);
  revalidatePath(`/orcamentos/${orcamentoId}`);
  redirect(`/os/${os.id}`);
}

async function fecharCronometro(osId: number) {
  await db
    .update(osHoras)
    .set({ fim: new Date() })
    .where(and(eq(osHoras.osId, osId), isNull(osHoras.fim)));
}

export async function mudarStatusOS(id: number, status: StatusOS) {
  const [os] = await db.select().from(ordensServico).where(eq(ordensServico.id, id));
  if (!os || !podeMudar(os.status, status)) return "Mudança de status não permitida.";

  const agora = new Date();
  if (status === "em_andamento") {
    const [aberto] = await db
      .select({ id: osHoras.id })
      .from(osHoras)
      .where(and(eq(osHoras.osId, id), isNull(osHoras.fim)));
    if (!aberto) await db.insert(osHoras).values({ osId: id, inicio: agora });
  } else {
    await fecharCronometro(id);
  }
  if (status === "concluida") {
    await db
      .update(visitas)
      .set({ status: "realizada" })
      .where(and(eq(visitas.osId, id), eq(visitas.status, "agendada")));
  }
  await db
    .update(ordensServico)
    .set({ status, concluidaEm: status === "concluida" ? agora : status === "em_andamento" ? null : os.concluidaEm })
    .where(eq(ordensServico.id, id));
  atualizar(id);
  return null;
}

const Campos = z.object({
  titulo: z.string().trim().min(1).max(200),
  descricao: z.string().max(5000),
  endereco: z.string().max(400),
  categoria: z.string().max(80),
  observacoes: z.string().max(10000),
  garantiaDias: z.number().int().min(0).max(3650),
  valor: z.number().min(0).nullable(),
  formaPagamento: z.string().max(200),
  pagamento: z.enum(["a_receber", "pago"]),
});

export async function salvarCamposOS(id: number, campos: z.infer<typeof Campos>) {
  const ok = Campos.safeParse(campos);
  if (!ok.success) return "Confira os campos.";
  const [os] = await db.select({ pagamento: ordensServico.pagamento, pagoEm: ordensServico.pagoEm }).from(ordensServico).where(eq(ordensServico.id, id));
  await db
    .update(ordensServico)
    .set({
      ...ok.data,
      pagoEm: ok.data.pagamento === "pago" ? (os?.pagoEm ?? new Date()) : null,
    })
    .where(eq(ordensServico.id, id));
  atualizar(id);
  return null;
}

const Checklist = z.array(z.object({ id: z.string().max(40), texto: z.string().trim().min(1).max(300), feito: z.boolean() })).max(100);

export async function salvarChecklist(id: number, itens: ItemChecklist[]) {
  const ok = Checklist.safeParse(itens);
  if (!ok.success) return "Checklist inválido.";
  await db.update(ordensServico).set({ checklist: ok.data }).where(eq(ordensServico.id, id));
  revalidatePath(`/os/${id}`);
  return null;
}

export async function agendarVisita(osId: number, inicioLocal: string, duracaoMin: number) {
  const inicio = deDataHoraLocal(inicioLocal);
  if (!inicio) return "Data/hora inválida.";
  const dur = Math.min(24 * 60, Math.max(15, Math.round(duracaoMin) || 120));
  await db.insert(visitas).values({ osId, inicio, duracaoMin: dur });
  const [os] = await db.select({ status: ordensServico.status }).from(ordensServico).where(eq(ordensServico.id, osId));
  if (os?.status === "cancelada") await db.update(ordensServico).set({ status: "agendada" }).where(eq(ordensServico.id, osId));
  atualizar(osId);
  return null;
}

export async function mudarVisita(osId: number, visitaId: number, status: "agendada" | "realizada" | "cancelada" | "excluir") {
  if (status === "excluir") await db.delete(visitas).where(and(eq(visitas.id, visitaId), eq(visitas.osId, osId)));
  else await db.update(visitas).set({ status }).where(and(eq(visitas.id, visitaId), eq(visitas.osId, osId)));
  atualizar(osId);
}

const Material = z.object({
  catalogoId: z.number().int().positive().nullable(),
  descricao: z.string().trim().min(1).max(300),
  unidade: z.string().trim().max(20),
  quantidade: z.number().positive(),
  precoUnitario: z.number().min(0),
});

export async function adicionarMaterial(osId: number, m: z.infer<typeof Material>) {
  const ok = Material.safeParse(m);
  if (!ok.success) return "Material inválido.";
  await db.insert(osMateriais).values({ ...ok.data, osId });
  revalidatePath(`/os/${osId}`);
  return null;
}

export async function removerMaterial(osId: number, materialId: number) {
  await db.delete(osMateriais).where(and(eq(osMateriais.id, materialId), eq(osMateriais.osId, osId)));
  revalidatePath(`/os/${osId}`);
}

export async function alternarCronometro(osId: number) {
  const [aberto] = await db
    .select({ id: osHoras.id })
    .from(osHoras)
    .where(and(eq(osHoras.osId, osId), isNull(osHoras.fim)));
  if (aberto) await db.update(osHoras).set({ fim: new Date() }).where(eq(osHoras.id, aberto.id));
  else await db.insert(osHoras).values({ osId, inicio: new Date() });
  revalidatePath(`/os/${osId}`);
}

export async function lancarHoras(osId: number, inicioLocal: string, minutos: number, descricao: string) {
  const inicio = deDataHoraLocal(inicioLocal);
  if (!inicio || !(minutos > 0) || minutos > 24 * 60) return "Informe data/hora e minutos válidos.";
  await db.insert(osHoras).values({
    osId,
    inicio,
    fim: new Date(inicio.getTime() + Math.round(minutos) * 60_000),
    descricao: descricao.slice(0, 300),
  });
  revalidatePath(`/os/${osId}`);
  return null;
}

export async function excluirHora(osId: number, horaId: number) {
  await db.delete(osHoras).where(and(eq(osHoras.id, horaId), eq(osHoras.osId, osId)));
  revalidatePath(`/os/${osId}`);
}

/** Limite por foto (~600 KB em base64). O navegador já reduz para ~1280 px JPEG. */
const LIMITE_FOTO = 800_000;

export async function adicionarFoto(osId: number, etapa: "antes" | "durante" | "depois", dados: string, legenda = "") {
  if (!["antes", "durante", "depois"].includes(etapa)) return "Etapa inválida.";
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(dados)) return "Imagem inválida.";
  if (dados.length > LIMITE_FOTO) return "Foto muito grande.";
  await db.insert(osFotos).values({ osId, etapa, dados, legenda: legenda.slice(0, 200) });
  revalidatePath(`/os/${osId}`);
  return null;
}

export async function excluirFoto(osId: number, fotoId: number) {
  await db.delete(osFotos).where(and(eq(osFotos.id, fotoId), eq(osFotos.osId, osId)));
  revalidatePath(`/os/${osId}`);
}

export async function salvarAssinatura(osId: number, dados: string | null, nome: string) {
  if (dados && (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dados) || dados.length > 400_000)) {
    return "Assinatura inválida.";
  }
  await db
    .update(ordensServico)
    .set({ assinatura: dados, assinadoPor: nome.trim().slice(0, 200) })
    .where(eq(ordensServico.id, osId));
  revalidatePath(`/os/${osId}`);
  return null;
}

export async function salvarConfigServicos(link: string, garantiaPadraoDias: number) {
  const url = link.trim();
  if (url && !/^https:\/\/\S+$/.test(url)) return "O link deve começar com https://";
  const dias = Math.min(3650, Math.max(0, Math.round(garantiaPadraoDias) || 0));
  await db
    .insert(configServicos)
    .values({ id: 1, linkAvaliacaoGoogle: url, garantiaPadraoDias: dias })
    .onConflictDoUpdate({ target: configServicos.id, set: { linkAvaliacaoGoogle: url, garantiaPadraoDias: dias } });
  revalidatePath("/os", "layout");
  return null;
}

export async function excluirOS(id: number) {
  await db.delete(ordensServico).where(eq(ordensServico.id, id));
  revalidatePath("/os");
  revalidatePath("/agenda");
  redirect("/os");
}

export async function atualizarLegenda(osId: number, fotoId: number, legenda: string) {
  await db
    .update(osFotos)
    .set({ legenda: legenda.trim().slice(0, 200) })
    .where(and(eq(osFotos.id, fotoId), eq(osFotos.osId, osId)));
  revalidatePath(`/os/${osId}`);
}

/** Preenche com IA as legendas das fotos que ainda estão sem legenda (até 12 por vez). */
export async function legendarFotosComIA(osId: number) {
  const [os] = await db.select({ titulo: ordensServico.titulo }).from(ordensServico).where(eq(ordensServico.id, osId));
  if (!os) return { erro: "OS não encontrada.", feitas: 0 };
  const pendentes = (
    await db.select().from(osFotos).where(eq(osFotos.osId, osId)).orderBy(asc(osFotos.id))
  )
    .filter((f) => !f.legenda.trim())
    .slice(0, 12);
  if (pendentes.length === 0) return { erro: null, feitas: 0 };

  const r = await gerarLegendas(os.titulo, pendentes);
  if ("erro" in r) return { erro: r.erro, feitas: 0 };
  let feitas = 0;
  for (const [i, f] of pendentes.entries()) {
    if (!r.legendas[i]) continue;
    await db.update(osFotos).set({ legenda: r.legendas[i] }).where(eq(osFotos.id, f.id));
    feitas++;
  }
  revalidatePath(`/os/${osId}`);
  return { erro: null, feitas };
}

const NovaMedicao = z.object({
  ponto: z.string().trim().max(200).default(""),
  tipo: z.string().min(1).max(40),
  valor: z.number().finite(),
  unidade: z.string().max(20).default(""),
  parametros: z.record(z.string(), z.number().finite()).default({}),
  limiteMin: z.number().finite().nullable().default(null),
  limiteMax: z.number().finite().nullable().default(null),
  instrumentoId: z.number().int().positive().nullable().default(null),
  observacao: z.string().trim().max(500).default(""),
});

export async function adicionarMedicao(osId: number, dados: z.input<typeof NovaMedicao>) {
  const m = NovaMedicao.safeParse(dados);
  if (!m.success) return "Confira o valor medido.";
  const { resultado } = avaliarMedicao(m.data.tipo, m.data.valor, m.data.parametros, m.data.limiteMin, m.data.limiteMax);
  await db.insert(medicoes).values({ osId, ...m.data, resultado });
  revalidatePath(`/os/${osId}`);
  return null;
}

export async function excluirMedicao(osId: number, medicaoId: number) {
  await db.delete(medicoes).where(and(eq(medicoes.id, medicaoId), eq(medicoes.osId, osId)));
  revalidatePath(`/os/${osId}`);
}

export async function salvarAnaliseMedicoes(osId: number, texto: string) {
  await db
    .update(ordensServico)
    .set({ analiseMedicoes: texto.slice(0, 20_000) })
    .where(eq(ordensServico.id, osId));
  revalidatePath(`/os/${osId}`);
}
