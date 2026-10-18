import { eq } from "drizzle-orm";
import { Cabecalho } from "@/components/ui";
import { db, perfil } from "@/db";
import { CalculadoraPrecos } from "@/components/vendas/calculadora-precos";

export const metadata = { title: "Precificação" };

export default async function PrecosPage() {
  const [eu] = await db.select({ valorHora: perfil.valorHora }).from(perfil).where(eq(perfil.id, 1));
  return (
    <>
      <Cabecalho titulo="Precificação" subtitulo="Cobre o que seu trabalho vale, sem chute" />
      <CalculadoraPrecos valorHoraSalvo={eu?.valorHora ?? null} />
    </>
  );
}
