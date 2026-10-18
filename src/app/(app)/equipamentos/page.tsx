import { asc } from "drizzle-orm";
import { Cabecalho } from "@/components/ui";
import { db, equipamentos } from "@/db";
import { ListaEquipamentos } from "./lista";

export const metadata = { title: "Equipamentos" };

export default async function EquipamentosPage() {
  const itens = await db.select().from(equipamentos).orderBy(asc(equipamentos.nome));
  return (
    <>
      <Cabecalho titulo="Equipamentos" voltar="/" ajuda={<p>Ferramentas, instrumentos e EPIs. Instrumentos com número de série e calibração aparecem nos relatórios de medição.</p>} />
      <ListaEquipamentos itens={itens} />
    </>
  );
}
