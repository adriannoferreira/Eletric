"use server";

import { randomBytes } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clientes, db, orcamentoItens, orcamentos, quadros } from "@/db";
import { cargasEquatorial } from "@/lib/eletrica/equatorial";
import { lerQuadro } from "@/lib/eletrica/tipos";
import type { CategoriaCarga } from "@/lib/normas/equatorial-pa";
import { catalogoComPrecos } from "@/lib/precos/servidor";
import { normalizar } from "@/lib/precos/regras";
import { NORMAS } from "@/lib/normas/equatorial-pa";

/** Listas para a calculadora do padrão de entrada (importar quadro e escolher cliente). */
export async function dadosCalculadora() {
  const [qs, cs] = await Promise.all([
    db
      .select({ id: quadros.id, nome: quadros.nome, modelo: quadros.modelo })
      .from(quadros)
      .orderBy(asc(quadros.nome)),
    db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).orderBy(asc(clientes.nome)),
  ]);
  return { quadros: qs.filter((q) => !q.modelo).map(({ id, nome }) => ({ id, nome })), clientes: cs };
}

export type CargaImportada = {
  descricao: string;
  quantidade: number;
  potenciaW: number;
  categoria: CategoriaCarga;
  ligacao: "FN" | "FF" | "3F";
};

/** Converte os circuitos de um quadro salvo em cargas para a calculadora. */
export async function cargasDoQuadro(id: number): Promise<CargaImportada[]> {
  const [q] = await db.select().from(quadros).where(eq(quadros.id, id));
  if (!q) return [];
  const dados = lerQuadro(q.dados);
  const circuitos = dados.circuitos.filter((c) => c.potenciaW > 0);
  const cargas = cargasEquatorial(circuitos);
  return circuitos.map((c, i) => ({ ...cargas[i], ligacao: c.ligacao }));
}

const Item = z.object({
  tipo: z.enum(["servico", "material"]),
  descricao: z.string().min(1).max(300),
  quantidade: z.number().positive(),
  unidade: z.string().max(20),
  busca: z.array(z.string()).max(10),
});

/** Cria um orçamento rascunho do padrão de entrada, com preços do catálogo quando houver. */
export async function gerarOrcamentoPadrao(clienteId: number, titulo: string, itensBrutos: unknown) {
  const itens = z.array(Item).max(60).safeParse(itensBrutos);
  if (!itens.success || !Number.isInteger(clienteId) || clienteId <= 0) return "Escolha o cliente e confira os itens.";
  const cat = await catalogoComPrecos();
  /** Exige todas as palavras (como palavras inteiras) e ignora itens sem preço. */
  const preco = (tipo: string, busca: string[]) => {
    const termos = busca.map(normalizar).filter(Boolean);
    if (!termos.length) return null;
    const achado = cat
      .filter((c) => c.tipo === tipo && c.preco > 0)
      .map((c) => ({ c, nome: ` ${normalizar(c.nome)} ` }))
      .filter(({ nome }) => termos.every((t) => nome.includes(` ${t} `)))
      .sort((x, y) => x.nome.length - y.nome.length)[0];
    return achado?.c.preco ?? null;
  };

  const [o] = await db
    .insert(orcamentos)
    .values({
      clienteId,
      titulo: titulo.slice(0, 200) || "Padrão de entrada Equatorial",
      tokenPublico: randomBytes(12).toString("base64url"),
      observacoes: `Padrão de entrada conforme Equatorial ${NORMAS["NT.00001"].codigo} rev. ${NORMAS["NT.00001"].revisao}. Ramal de conexão e medidor são fornecidos e instalados pela Equatorial.`,
    })
    .returning({ id: orcamentos.id });
  await db.insert(orcamentoItens).values(
    itens.data.map((i, ordem) => {
      const p = preco(i.tipo, i.busca);
      return {
        orcamentoId: o.id,
        tipo: i.tipo,
        descricao: p === null ? `${i.descricao} [definir preço]` : i.descricao,
        quantidade: i.quantidade,
        unidade: i.unidade,
        precoUnitario: p ?? 0,
        ordem,
      };
    }),
  );
  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${o.id}`);
}
