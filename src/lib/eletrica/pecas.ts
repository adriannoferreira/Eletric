/**
 * Catálogo de peças de quadro de distribuição (padrão DIN 35 mm, 1 módulo = 18 mm).
 * As características seguem o que é comum nas linhas de mercado; larguras,
 * capacidade de interrupção (Icn) e códigos variam por fabricante — CONFERIR
 * SEMPRE O DATASHEET da linha escolhida antes de comprar.
 */

export type TipoPeca = "disjuntor" | "dr" | "dps" | "seccionadora";
export type Curva = "B" | "C";

export interface Peca {
  id: string;
  tipo: TipoPeca;
  nome: string;
  /** Rótulo curto impresso na peça (ex.: "C20"). */
  rotulo: string;
  descricao: string;
  polos: number;
  /** Largura em módulos DIN (pode ser fracionária, ex.: 1,5 por polo). */
  modulos: number;
  correnteNominal?: number;
  curva?: Curva;
  /** DR: sensibilidade IΔn em mA. */
  sensibilidadeMa?: number;
  /** DPS: tensão máxima de operação contínua (Uc) e corrente máxima (Imax). */
  ucV?: number;
  imaxKa?: number;
  norma: string;
}

export const MM_POR_MODULO = 18;

/** Linhas de referência — especificações a conferir no datasheet do fabricante. */
export const REFERENCIAS_FABRICANTES: Record<TipoPeca, string[]> = {
  disjuntor: ["WEG MDW", "Schneider Electric Easy9", "Siemens 5SL", "Steck"],
  dr: ["WEG RDW", "Schneider Electric Easy9 (ID)", "Siemens 5SV", "Steck"],
  dps: ["WEG SPW", "Siemens 5SD7", "Clamper", "Steck"],
  seccionadora: ["Schneider Electric Easy9 (interruptor)", "Siemens 5TL", "WEG"],
};

const CORRENTES_DIN = [6, 10, 16, 20, 25, 32, 40, 50, 63];
const CORRENTES_ALTAS = [70, 80, 100, 125];

function disjuntores(): Peca[] {
  const lista: Peca[] = [];
  for (const polos of [1, 2, 3])
    for (const curva of ["B", "C"] as const) {
      for (const In of CORRENTES_DIN)
        lista.push({
          id: `dj-${polos}p-${curva}${In}`,
          tipo: "disjuntor",
          nome: `Disjuntor ${polos}P ${curva}${In}`,
          rotulo: `${curva}${In}`,
          descricao: `Termomagnético DIN ${polos} polo(s), curva ${curva}, ${In} A, Icn típica 3–6 kA (conferir datasheet)`,
          polos,
          modulos: polos,
          correnteNominal: In,
          curva,
          norma: "NBR NM 60898 / IEC 60898-1",
        });
      // Correntes acima de 63 A: linhas de "alta corrente" com 1,5 módulo por polo.
      if (polos > 1 && curva === "C")
        for (const In of CORRENTES_ALTAS)
          lista.push({
            id: `dj-${polos}p-${curva}${In}`,
            tipo: "disjuntor",
            nome: `Disjuntor ${polos}P ${curva}${In} (alta corrente)`,
            rotulo: `${curva}${In}`,
            descricao: `Termomagnético DIN ${polos}P curva ${curva} ${In} A — usado como geral. Largura típica 1,5 módulo/polo (conferir datasheet)`,
            polos,
            modulos: polos * 1.5,
            correnteNominal: In,
            curva,
            norma: "IEC 60898-1 / IEC 60947-2",
          });
    }
  return lista;
}

function drs(): Peca[] {
  const lista: Peca[] = [];
  for (const polos of [2, 4])
    for (const In of [25, 40, 63])
      lista.push({
        id: `dr-${polos}p-${In}`,
        tipo: "dr",
        nome: `DR ${polos}P ${In} A 30 mA`,
        rotulo: `${In}A`,
        descricao: `Interruptor diferencial residual (IDR) ${polos} polos, ${In} A, IΔn 30 mA, tipo AC/A (conferir datasheet). Não protege contra sobrecarga — precisa de disjuntor a montante/jusante.`,
        polos,
        modulos: polos,
        correnteNominal: In,
        sensibilidadeMa: 30,
        norma: "NBR NM 61008 / IEC 61008",
      });
  return lista;
}

function dpss(): Peca[] {
  return [
    [175, 20],
    [275, 20],
    [275, 45],
  ].map(([uc, imax]) => ({
    id: `dps-${uc}-${imax}`,
    tipo: "dps" as const,
    nome: `DPS classe II ${uc} V ${imax} kA`,
    rotulo: `${imax}kA`,
    descricao: `Protetor contra surtos, classe II, Uc ${uc} V, Imax ${imax} kA, 1 módulo por polo. ${
      uc === 175 ? "Usual em redes 127/220 V." : "Usual em redes 220/380 V ou 220 V F-N."
    } (conferir datasheet e a tensão da concessionária)`,
    polos: 1,
    modulos: 1,
    ucV: uc,
    imaxKa: imax,
    norma: "NBR IEC 61643-11 / NBR 5410 6.3.5",
  }));
}

function seccionadoras(): Peca[] {
  const lista: Peca[] = [];
  for (const polos of [2, 3, 4])
    for (const In of [63, 100])
      lista.push({
        id: `sc-${polos}p-${In}`,
        tipo: "seccionadora",
        nome: `Interruptor/seccionadora ${polos}P ${In} A`,
        rotulo: `${In}A`,
        descricao: `Interruptor de manobra (seccionadora) DIN ${polos} polos ${In} A. Não protege contra sobrecorrente.`,
        polos,
        modulos: polos,
        correnteNominal: In,
        norma: "IEC 60947-3",
      });
  return lista;
}

export const PECAS: Peca[] = [...disjuntores(), ...drs(), ...dpss(), ...seccionadoras()];
const POR_ID = new Map(PECAS.map((p) => [p.id, p]));

export function peca(id: string): Peca | undefined {
  return POR_ID.get(id);
}

/** Módulos ocupados no trilho (peças fracionárias ocupam o módulo inteiro). */
export function modulosOcupados(p: Peca) {
  return Math.ceil(p.modulos);
}

export const NOME_TIPO_PECA: Record<TipoPeca, string> = {
  disjuntor: "Disjuntores",
  dr: "DR (diferencial residual)",
  dps: "DPS (surtos)",
  seccionadora: "Seccionadoras",
};

/** Modelos de caixa de quadro comuns no mercado (conferir dimensões com o fabricante). */
export const MODELOS_QUADRO = [
  { id: "6", nome: "6 módulos DIN", fileiras: 1, modulosPorFileira: 6 },
  { id: "12", nome: "12 módulos DIN", fileiras: 1, modulosPorFileira: 12 },
  { id: "18", nome: "18 módulos DIN", fileiras: 1, modulosPorFileira: 18 },
  { id: "24", nome: "24 módulos DIN (2 × 12)", fileiras: 2, modulosPorFileira: 12 },
  { id: "36", nome: "36 módulos DIN (2 × 18)", fileiras: 2, modulosPorFileira: 18 },
  { id: "48", nome: "48 módulos DIN (4 × 12)", fileiras: 4, modulosPorFileira: 12 },
  { id: "54", nome: "54 módulos DIN (3 × 18)", fileiras: 3, modulosPorFileira: 18 },
] as const;

/** Acessórios internos do quadro (entram na lista de materiais). */
export const ACESSORIOS = {
  pente: "Barramento pente (por fileira)",
  neutro: "Barra de neutro (isolada, azul)",
  terra: "Barra de terra/PE (verde)",
  tampa: "Tampa cega para módulos livres",
} as const;
