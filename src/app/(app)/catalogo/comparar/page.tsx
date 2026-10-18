import { Comparar } from "@/components/precos/comparar";
import { dadosComparativo } from "@/lib/precos/comparativo-servidor";

export const metadata = { title: "Comparar lojas" };

export default async function CompararPage({ searchParams }: PageProps<"/catalogo/comparar">) {
  const sp = await searchParams;
  const orcamento = Number(sp.orcamento) || undefined;
  const quadro = Number(sp.quadro) || undefined;
  const dados = await dadosComparativo({ orcamento, quadro });
  return <Comparar key={`${orcamento ?? ""}-${quadro ?? ""}`} dados={dados} />;
}
