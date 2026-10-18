import { notFound } from "next/navigation";
import { PaginaDiagnostico } from "@/components/diagnostico/pagina-diagnostico";

export const metadata = { title: "Diagnóstico de defeitos" };

export default async function DiagnosticoIdPage({ params }: PageProps<"/diagnostico/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <PaginaDiagnostico id={id} />;
}
