/**
 * Normas técnicas da Equatorial Energia aplicadas no Pará (baixa tensão).
 * Os dados deste módulo foram extraídos dos PDFs oficiais listados abaixo.
 * Sempre conferir se há revisão mais nova no site da Equatorial Pará.
 */

export type CodigoNorma = "NT.00001" | "NT.00030" | "NT.00045" | "NT.00042" | "NT.00020";

export interface NormaEquatorial {
  codigo: CodigoNorma;
  titulo: string;
  revisao: string;
  data: string;
  url: string;
}

export const PAGINA_NORMAS_PA =
  "https://pa.equatorialenergia.com.br/institucional/leis-e-normas-tecnicas/normas-tecnicas/instalacao-de-padrao";

export const NORMAS: Record<CodigoNorma, NormaEquatorial> = {
  "NT.00001": {
    codigo: "NT.00001",
    titulo: "Fornecimento de Energia Elétrica em Baixa Tensão",
    revisao: "09",
    data: "homologada em 22/05/2025 (publicada 29/05/2025)",
    url: "https://pa.equatorialenergia.com.br/wp-content/uploads/2025/12/NT.00001.EQTL-09-Fornecimento-de-Energia-Eletrica-em-Baixa-Tensao.pdf",
  },
  "NT.00030": {
    codigo: "NT.00030",
    titulo: "Padrões Construtivos de Caixas de Medição e Proteção",
    revisao: "05",
    data: "14/10/2026",
    url: "https://pa.equatorialenergia.com.br/wp-content/uploads/2026/10/NT.00030.EQTL-05-Padroes-Construtivos-de-Caixas-de-Medicao-e-Protecao.pdf",
  },
  "NT.00045": {
    codigo: "NT.00045",
    titulo: "Postes para Padrão de Entrada",
    revisao: "01",
    data: "29/03/2023",
    url: "https://pa.equatorialenergia.com.br/wp-content/uploads/migrated_snake_case/normas_tecnicas_de_conexao/nt_00045_eqtl_01_nt_045_eqtl_normas_e_qualidade_postes_para_padrao_de_entrada.pdf",
  },
  "NT.00042": {
    codigo: "NT.00042",
    titulo: "Critérios de Conexão de Estações de Recarga de Veículos Elétricos",
    revisao: "04",
    data: "26/12/2025",
    url: "https://pa.equatorialenergia.com.br/wp-content/uploads/2025/12/NT.00042.EQTL-04-Criterios-de-Conexao-para-Estacoes-de-Recarga-de-Veiculos-Eletricos.pdf",
  },
  "NT.00020": {
    codigo: "NT.00020",
    titulo: "Conexão de Micro e Minigeração Distribuída ao Sistema de Distribuição",
    revisao: "06",
    data: "26/12/2025",
    url: "https://pa.equatorialenergia.com.br/wp-content/uploads/2025/12/NT.00020.EQTL-06-Conexao-de-Micro-e-Minigeracao-Distribuida-ao-Sistema-de-Distribuicao.pdf",
  },
};

/** Referência curta para exibir junto de cada regra (ex.: "NT.00001 rev. 09, item 6.2.1.1"). */
export function ref(codigo: CodigoNorma, item: string) {
  return `${codigo} rev. ${NORMAS[codigo].revisao}, ${item}`;
}

export const AVISO_REVISAO =
  "Baseado na NT.00001 rev. 09 (2025). Confira se há revisão mais nova no site da Equatorial Pará antes de executar.";
