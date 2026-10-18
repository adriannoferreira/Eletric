import { Cabecalho } from "@/components/ui";
import { db, perfil } from "@/db";
import { FormPerfil } from "./form";

export const metadata = { title: "Meu perfil" };

export default async function PerfilPage() {
  const [p] = await db.select().from(perfil).limit(1);
  return (
    <>
      <Cabecalho titulo="Meu perfil" ajuda={<p>Seus dados aparecem nos orçamentos, relatórios e laudos enviados aos clientes.</p>} voltar="/" />
      <FormPerfil perfil={p} />
    </>
  );
}
