/** Fichas (guias) dos serviços do eletricista predial. O conteúdo fica em guias-dados.ts. */

import { GUIAS_DADOS } from "./guias-dados";

export type { CategoriaServico, Guia } from "./tipos-guia";
import type { CategoriaServico, Guia } from "./tipos-guia";

export const GUIAS: Guia[] = GUIAS_DADOS;

export const CATEGORIAS_SERVICO: CategoriaServico[] = [
  "Residencial",
  "Corretiva",
  "Concessionária",
  "Condomínio e comércio",
  "Motores e comandos",
  "Tecnologia",
  "Documentos",
];

export function guiaPorChave(chave: string) {
  return GUIAS.find((g) => g.chave === chave);
}
