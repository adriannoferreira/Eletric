import { Cabecalho } from "@/components/ui";
import { FormCliente } from "../form-cliente";

export const metadata = { title: "Novo cliente" };

export default async function NovoClientePage({ searchParams }: PageProps<"/clientes/novo">) {
  const { voltar } = await searchParams;
  return (
    <>
      <Cabecalho titulo="Novo cliente" voltar="/clientes" />
      <FormCliente voltar={typeof voltar === "string" ? voltar : undefined} />
    </>
  );
}
