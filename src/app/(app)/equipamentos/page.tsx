import { asc } from "drizzle-orm";
import { Cabecalho } from "@/components/ui";
import { db, equipamentos } from "@/db";
import { ListaEquipamentos } from "./lista";

export const metadata = { title: "Equipamentos" };

export default async function EquipamentosPage() {
  const itens = await db.select().from(equipamentos).orderBy(asc(equipamentos.nome));
  return (
    <>
      <Cabecalho titulo="Equipamentos" subtitulo="Ferramentas, instrumentos e EPIs" voltar="/" />
      <ListaEquipamentos itens={itens} />
    </>
  );
}
