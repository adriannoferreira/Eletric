/** Fichas (guias) dos serviços do eletricista predial. O conteúdo fica em guias-dados.ts. */

import { GUIAS_DADOS } from "./guias-dados";

export type CategoriaServico =
  | "Residencial"
  | "Corretiva"
  | "Concessionária"
  | "Condomínio e comércio"
  | "Motores e comandos"
  | "Tecnologia"
  | "Documentos";

export type Guia = {
  chave: string;
  nome: string;
  categoria: CategoriaServico;
  resumo: string;
  quandoOferecer: string[];
  passos: string[];
  materiais: string[];
  /** Chaves de kits sugeridos do catálogo relacionados (tabela kits.chave). */
  kits?: string[];
  ferramentas: string[];
  normas: string[];
  seguranca: string[];
  /** Tempo padrão em horas (faixa típica). */
  tempoHoras: [number, number];
  checklistEntrega: string[];
  argumentosVenda: string[];
  /** Exige engenheiro/responsável técnico habilitado. */
  exigeResponsavel?: string;
  /** Pontos a conferir na norma vigente. */
  conferir?: string[];
  /** Palavras para casar com itens do catálogo e mostrar faixa de preço. */
  palavrasCatalogo?: string[];
};

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
