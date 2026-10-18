import { asc } from "drizzle-orm";
import { Cabecalho } from "@/components/ui";
import { clientes, db } from "@/db";
import { GUIAS } from "@/lib/servicos/guias";
import { diaLocal } from "@/lib/servicos/os";
import { FormNovaOS } from "./form";

export const metadata = { title: "Nova OS" };

export default async function NovaOSPage({ searchParams }: PageProps<"/os/nova">) {
  const q = await searchParams;
  const s = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : undefined);
  const lista = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(asc(clientes.nome));
  const data = s("data") && /^\d{4}-\d{2}-\d{2}$/.test(s("data")!) ? s("data")! : diaLocal(new Date());
  const hora = s("hora") && /^\d{2}:\d{2}$/.test(s("hora")!) ? s("hora")! : "08:00";
  const guia = GUIAS.find((g) => g.chave === s("guia"));

  return (
    <>
      <Cabecalho titulo="Nova ordem de serviço" voltar="/os" />
      <FormNovaOS
        clientes={lista}
        guias={GUIAS.map((g) => ({ chave: g.chave, nome: g.nome, categoria: g.categoria, horas: g.tempoHoras[1] }))}
        inicial={{
          clienteId: Number(s("cliente")) || undefined,
          inicio: `${data}T${hora}`,
          guia: guia?.chave,
          titulo: s("titulo") ?? guia?.nome,
          descricao: s("descricao"),
          quadroId: Number(s("quadro")) || undefined,
        }}
      />
    </>
  );
}
