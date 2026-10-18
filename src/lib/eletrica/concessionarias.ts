/**
 * Concessionárias de distribuição e suas normas de fornecimento em baixa tensão.
 *
 * IMPORTANTE: cada concessionária define na própria norma as categorias de
 * atendimento (mono/bi/trifásico), os limites de carga/demanda, o disjuntor e
 * o cabo do padrão de entrada, o nº de hastes de aterramento e os fatores de
 * demanda. Os números usados aqui são REFERÊNCIAS GENÉRICAS para orientar o
 * pré-projeto — sempre conferir na revisão vigente da norma da concessionária.
 */

export type Tensoes = "127/220" | "220/380";

export interface Concessionaria {
  id: string;
  nome: string;
  regiao: string;
  /** Nome/código da norma de fornecimento em BT (conferir a revisão vigente). */
  norma: string;
  /** Tensões secundárias usuais na área de concessão. */
  tensoes: Tensoes[];
  /** `true` quando o código da norma não foi confirmado — mostrar "conferir". */
  normaConferir?: boolean;
}

export const CONCESSIONARIAS: Concessionaria[] = [
  { id: "enel-sp", nome: "Enel SP", regiao: "Grande São Paulo", norma: "LIG BT — Livro de Instruções Gerais (BT)", tensoes: ["127/220"] },
  { id: "enel-rj", nome: "Enel RJ", regiao: "Rio de Janeiro (interior/Niterói)", norma: "Norma de fornecimento em BT da Enel RJ", tensoes: ["127/220"], normaConferir: true },
  { id: "enel-ce", nome: "Enel CE", regiao: "Ceará", norma: "Norma de fornecimento em BT da Enel CE", tensoes: ["220/380"], normaConferir: true },
  { id: "cpfl-paulista", nome: "CPFL Paulista", regiao: "Interior de SP", norma: "GED 13 — Fornecimento em tensão secundária", tensoes: ["127/220"] },
  { id: "cpfl-piratininga", nome: "CPFL Piratininga", regiao: "Baixada Santista / interior de SP", norma: "GED 13 — Fornecimento em tensão secundária", tensoes: ["127/220"] },
  { id: "rge", nome: "RGE (CPFL)", regiao: "Rio Grande do Sul", norma: "GED 13 / RIC BT (conferir)", tensoes: ["220/380", "127/220"], normaConferir: true },
  { id: "cemig", nome: "Cemig", regiao: "Minas Gerais", norma: "ND 5.1 — Fornecimento em tensão secundária (edificações individuais)", tensoes: ["127/220"] },
  { id: "copel", nome: "Copel", regiao: "Paraná", norma: "NTC 901100 — Fornecimento em tensão secundária", tensoes: ["127/220"] },
  { id: "celesc", nome: "Celesc", regiao: "Santa Catarina", norma: "N-321.0001 — Fornecimento em tensão secundária", tensoes: ["220/380"] },
  { id: "light", nome: "Light", regiao: "Rio de Janeiro (capital e Baixada)", norma: "RECON-BT — Regulamentação para fornecimento em BT", tensoes: ["127/220"] },
  { id: "coelba", nome: "Neoenergia Coelba", regiao: "Bahia", norma: "Norma de fornecimento em BT Neoenergia", tensoes: ["220/380"], normaConferir: true },
  { id: "neoenergia-pe", nome: "Neoenergia Pernambuco", regiao: "Pernambuco", norma: "Norma de fornecimento em BT Neoenergia", tensoes: ["220/380"], normaConferir: true },
  { id: "elektro", nome: "Neoenergia Elektro", regiao: "Interior de SP / MS", norma: "Norma de fornecimento em BT Neoenergia", tensoes: ["127/220"], normaConferir: true },
  { id: "equatorial", nome: "Equatorial", regiao: "PA, MA, PI, AL, GO, AP", norma: "Norma de fornecimento em BT Equatorial (varia por estado)", tensoes: ["127/220", "220/380"], normaConferir: true },
  { id: "ceee", nome: "CEEE Equatorial", regiao: "Rio Grande do Sul", norma: "RIC BT — Regulamento de Instalações Consumidoras", tensoes: ["220/380", "127/220"], normaConferir: true },
  { id: "energisa", nome: "Energisa", regiao: "MT, MS, TO, PB, SE, RO, AC, MG, SP…", norma: "NDU 001 — Fornecimento a edificações individuais", tensoes: ["127/220", "220/380"], normaConferir: true },
  { id: "edp-es", nome: "EDP Espírito Santo", regiao: "Espírito Santo", norma: "Norma de fornecimento em BT da EDP", tensoes: ["127/220"], normaConferir: true },
  { id: "outra", nome: "Outra / não sei", regiao: "", norma: "Norma de fornecimento em BT da concessionária local", tensoes: ["127/220", "220/380"], normaConferir: true },
];

export function concessionaria(id: string): Concessionaria {
  return CONCESSIONARIAS.find((c) => c.id === id) ?? CONCESSIONARIAS[CONCESSIONARIAS.length - 1];
}

/**
 * Limites GENÉRICOS de demanda por categoria (kVA), usados só como referência
 * de pré-projeto. Cada concessionária tem limites próprios — conferir.
 */
export const LIMITES_CATEGORIA_KVA = { monofasico: 10, bifasico: 20, trifasico: 75 } as const;

/** Texto padrão sobre aterramento na entrada, mostrado no projeto. */
export function orientacaoAterramento(c: Concessionaria, esquema: "TN-S" | "TN-C-S" | "TT") {
  const base = [
    `Padrão de entrada conforme ${c.norma} (${c.nome}) — a norma da concessionária define o nº de hastes, a seção do condutor de aterramento, a caixa de inspeção e o disjuntor do padrão.`,
  ];
  if (esquema === "TN-C-S") {
    base.push(
      "Esquema TN-C-S (o mais comum nas concessionárias): o neutro da rede chega como PEN e é aterrado no padrão de entrada (haste(s) cobreada(s) + caixa de inspeção). A partir do QDC, neutro (N) e proteção (PE) seguem SEPARADOS e nunca voltam a se juntar (TN-S na instalação).",
    );
  } else if (esquema === "TN-S") {
    base.push("Esquema TN-S: condutores N e PE separados desde a origem; PE ligado ao eletrodo de aterramento da edificação.");
  } else {
    base.push(
      "Esquema TT: massas ligadas a um eletrodo de aterramento próprio, independente do neutro da concessionária. DR é indispensável para a proteção contra choques (seccionamento automático).",
    );
  }
  base.push(
    "Barra de equipotencialização principal (BEP) interligando PE, eletrodo de aterramento, tubulações metálicas e armaduras acessíveis (NBR 5410 6.4.2).",
    "Seção do condutor de proteção conforme a Tabela 58 (igual à fase até 16 mm²).",
  );
  return base;
}
