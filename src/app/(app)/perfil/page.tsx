import { Cabecalho } from "@/components/ui";
import { db, perfil } from "@/db";
import { FormPerfil } from "./form";

export const metadata = { title: "Meu perfil" };

export default async function PerfilPage() {
  const [p] = await db.select().from(perfil).limit(1);
  return (
    <>
      <Cabecalho titulo="Meu perfil" subtitulo="Seus dados aparecem nos orçamentos enviados aos clientes" voltar="/" />
      <FormPerfil perfil={p} />
    </>
  );
}
