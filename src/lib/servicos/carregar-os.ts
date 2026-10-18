import { asc, eq } from "drizzle-orm";
import { clientes, db, ordensServico, osFotos, osHoras, osMateriais, perfil, visitas } from "@/db";

/** Carrega tudo o que o relatório/recibo de uma OS precisa. */
export async function carregarOSCompleta(id: number) {
  if (!Number.isInteger(id) || id <= 0) return null;
  const [os] = await db.select().from(ordensServico).where(eq(ordensServico.id, id));
  if (!os) return null;
  const [[cliente], vis, mats, hrs, fotos, [p]] = await Promise.all([
    db.select().from(clientes).where(eq(clientes.id, os.clienteId)),
    db.select().from(visitas).where(eq(visitas.osId, id)).orderBy(asc(visitas.inicio)),
    db.select().from(osMateriais).where(eq(osMateriais.osId, id)).orderBy(asc(osMateriais.id)),
    db.select().from(osHoras).where(eq(osHoras.osId, id)).orderBy(asc(osHoras.inicio)),
    db
      .select({ id: osFotos.id, etapa: osFotos.etapa, legenda: osFotos.legenda })
      .from(osFotos)
      .where(eq(osFotos.osId, id))
      .orderBy(asc(osFotos.id)),
    db.select().from(perfil).limit(1),
  ]);
  if (!cliente) return null;
  return { os, cliente, visitas: vis, materiais: mats, horas: hrs, fotos, perfil: p ?? null };
}
