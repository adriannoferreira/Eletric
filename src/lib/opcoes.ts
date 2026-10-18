import type { Tom } from "@/components/ui";

export const TIPOS_CLIENTE = {
  residencial: "Residencial",
  comercial: "Comercial",
  condominio: "Condomínio",
  industrial: "Industrial",
} as const;

export const ORIGENS_CLIENTE = {
  indicacao: "Indicação",
  instagram: "Instagram",
  google: "Google",
  whatsapp: "WhatsApp",
  panfleto: "Panfleto",
  outro: "Outro",
} as const;

export const STATUS_ORCAMENTO: Record<string, { rotulo: string; tom: Tom }> = {
  rascunho: { rotulo: "Rascunho", tom: "neutro" },
  enviado: { rotulo: "Enviado", tom: "info" },
  aprovado: { rotulo: "Aprovado", tom: "ok" },
  recusado: { rotulo: "Recusado", tom: "perigo" },
  executado: { rotulo: "Executado", tom: "accent" },
};

export const CATEGORIAS_EQUIPAMENTO = {
  ferramenta: "Ferramenta",
  instrumento: "Instrumento de medição",
  epi: "EPI",
  escada: "Escada / acesso",
  outro: "Outro",
} as const;

export const STATUS_EQUIPAMENTO: Record<string, { rotulo: string; tom: Tom }> = {
  ok: { rotulo: "Em uso", tom: "ok" },
  manutencao: { rotulo: "Manutenção", tom: "aviso" },
  emprestado: { rotulo: "Emprestado", tom: "info" },
  perdido: { rotulo: "Perdido", tom: "perigo" },
};
