export const numeroOrcamento = (id: number) => `Nº ${String(id).padStart(4, "0")}`;

export function totais(itens: { quantidade: number; precoUnitario: number; tipo: string }[], desconto: number) {
  let servicos = 0;
  let materiais = 0;
  for (const i of itens) {
    const v = i.quantidade * i.precoUnitario;
    if (i.tipo === "material") materiais += v;
    else servicos += v;
  }
  const bruto = servicos + materiais;
  return { servicos, materiais, bruto, desconto, total: Math.max(0, bruto - desconto) };
}
