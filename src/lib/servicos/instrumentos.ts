import { asc, eq } from "drizzle-orm";
import { db, equipamentos } from "@/db";

export function listarInstrumentos() {
  return db
    .select({
      id: equipamentos.id,
      nome: equipamentos.nome,
      marca: equipamentos.marca,
      modelo: equipamentos.modelo,
      numeroSerie: equipamentos.numeroSerie,
      proximaVerificacao: equipamentos.proximaVerificacao,
    })
    .from(equipamentos)
    .where(eq(equipamentos.categoria, "instrumento"))
    .orderBy(asc(equipamentos.nome));
}
