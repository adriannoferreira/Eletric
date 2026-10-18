import type { ItemChecklist } from "@/db/schema-servicos";

/** Checklist genérico de execução usado quando a OS não vem de um guia. */
export const CHECKLIST_PADRAO = [
  "Conferir o serviço combinado com o cliente",
  "Desenergizar o circuito, testar ausência de tensão e sinalizar (NR-10)",
  "Executar o serviço conforme NBR 5410",
  "Conferir aperto das conexões e isolamento",
  "Reenergizar e testar funcionamento",
  "Testar DR (botão T), se houver",
  "Identificar o circuito no quadro",
  "Limpar o local e recolher sobras",
  "Explicar ao cliente o que foi feito e a garantia",
];

export function criarChecklist(textos: string[]): ItemChecklist[] {
  return textos.map((texto, i) => ({ id: `c${i + 1}`, texto, feito: false }));
}
