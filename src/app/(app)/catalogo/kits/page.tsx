import { catalogoComPrecos, kitsComItens } from "@/lib/precos/servidor";
import { EditorKits } from "@/components/precos/kits";

export const metadata = { title: "Kits" };

export default async function KitsPage() {
  const [kits, catalogo] = await Promise.all([kitsComItens(), catalogoComPrecos(true)]);
  return (
    <EditorKits
      kits={kits}
      catalogo={catalogo.map((c) => ({ id: c.id, nome: c.nome, tipo: c.tipo, unidade: c.unidade, preco: c.preco, categoria: c.categoria }))}
    />
  );
}
