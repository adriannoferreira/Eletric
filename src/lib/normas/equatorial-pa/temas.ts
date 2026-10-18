/** Conteúdo da página "Normas Equatorial (PA)", organizado por tema, com citação de cada item. */
import { LIGACOES_PA, PREMISSAS_TABELA_2, RESTRICOES, ROTULO_LIGACAO, type TipoLigacao } from "./fornecimento";
import { type CodigoNorma, ref } from "./normas";
import { DOCUMENTOS_LIGACAO, REQUISITOS_PADRAO } from "./padrao";

export interface ItemTema {
  texto: string;
  ref: string;
}

export interface Tema {
  slug: string;
  titulo: string;
  resumo: string;
  normas: CodigoNorma[];
  itens: ItemTema[];
  /** Tema com tabela própria renderizada na página. */
  tabela?: "tabela2" | "tabela3" | "tabela4";
}

const porTema = (t: (typeof REQUISITOS_PADRAO)[number]["tema"]) =>
  REQUISITOS_PADRAO.filter((r) => r.tema === t).map(({ texto, ref }) => ({ texto, ref }));

export const TEMAS: Tema[] = [
  {
    slug: "limites",
    titulo: "Limites de fornecimento",
    resumo: "Tensões e tipos de ligação no Pará (rede 220/127 V) e o que cada um permite.",
    normas: ["NT.00001"],
    itens: [
      { texto: "Baixa tensão em rede aérea quando a carga instalada for de até 75 kW; acima disso, média tensão (NT.00002).", ref: ref("NT.00001", "item 6.2.1") },
      ...(Object.keys(LIGACOES_PA) as TipoLigacao[]).map((t) => ({
        texto: `${ROTULO_LIGACAO[t]} — ${LIGACOES_PA[t].tensao}, ${LIGACOES_PA[t].condutores}. ${LIGACOES_PA[t].descricao} Não pode ter: ${RESTRICOES[t].join("; ")}.`,
        ref: LIGACOES_PA[t].ref,
      })),
      { texto: "Motor ou aparelho trifásico obriga ligação a 4 fios (3 fases + neutro), independentemente da carga.", ref: ref("NT.00001", "Notas 6 e 9") },
      { texto: "Equipamentos acima dos limites do trifásico dependem de estudo específico da Equatorial; com mais de um motor, evitar partidas simultâneas.", ref: ref("NT.00001", "Notas 11 e 14") },
      { texto: "Área rural: transformador exclusivo, monofásico 127 V ou 220 V até 50 kW de carga instalada, padrão conforme NT.00002.", ref: ref("NT.00001", "item 6.2.1.4") },
      { texto: "Bifásico ou trifásico abaixo da carga mínima é possível a pedido do cliente, que paga a diferença do medidor e a adaptação da rede.", ref: ref("NT.00001", "item 6.2.2.1 e Notas 20/21") },
    ],
  },
  {
    slug: "categorias",
    titulo: "Categorias de atendimento (Tabela 2)",
    resumo: "Disjuntor, condutores, eletroduto e aterramento do padrão por faixa de carga instalada (127/220 V).",
    normas: ["NT.00001"],
    tabela: "tabela2",
    itens: PREMISSAS_TABELA_2.map((texto) => ({ texto, ref: ref("NT.00001", "TABELA 2, Notas 22 e 23") })),
  },
  {
    slug: "demanda",
    titulo: "Carga instalada e demanda",
    resumo: "Potências de referência (Tabela 3) e fatores de demanda (Tabelas 4 e 5).",
    normas: ["NT.00001"],
    tabela: "tabela3",
    itens: [
      { texto: "O padrão de entrada é dimensionado pela CARGA INSTALADA (coluna 'Método de cálculo' da Tabela 2).", ref: ref("NT.00001", "TABELA 2") },
      { texto: "Residências: carga mínima de iluminação e tomadas de 30 W/m²; demanda de 100% dos primeiros 10 kW, 35% dos 110 kW seguintes e 25% acima de 120 kW.", ref: ref("NT.00001", "TABELA 5") },
      { texto: "Iluminação: até 6 m², ao menos 1 ponto de 100 VA; acima de 6 m², 100 VA nos primeiros 6 m² + 60 VA a cada 4 m².", ref: ref("NT.00001", "Nota 28") },
      { texto: "Aparelhos de aquecimento e eletrodomésticos: fator de demanda pelo número de aparelhos, separando potência individual até 3,5 kW e acima de 3,5 kW (ex.: 1 aparelho 80%; 2 aparelhos 75% / 65%; 3 aparelhos 70% / 55%).", ref: ref("NT.00001", "TABELA 4") },
      { texto: "Lâmpadas fluorescentes ou LED: considerar 50 W por lâmpada na demanda.", ref: ref("NT.00001", "Nota 30") },
      { texto: "Fator de potência deve ser ≥ 0,92; abaixo disso a Equatorial recomenda correção.", ref: ref("NT.00001", "notas da TABELA 3") },
      { texto: "O roteiro do item 6.4 (Cálculo de Demanda) não aparece no texto da rev. 09 publicada; a demanda calculada no app é estimativa auxiliar.", ref: ref("NT.00001", "sumário, item 6.4") },
    ],
  },
  {
    slug: "padrao-entrada",
    titulo: "Padrão de entrada e ramal",
    resumo: "Ramal de conexão, ponto de conexão, montagem e eletrodutos.",
    normas: ["NT.00001"],
    itens: [...porTema("Ramal de conexão"), ...porTema("Ponto de conexão e medição"), ...porTema("Montagem e eletroduto")],
  },
  {
    slug: "aterramento",
    titulo: "Aterramento e proteção",
    resumo: "Haste, condutor de aço cobreado, disjuntor geral, neutro, motores e solda.",
    normas: ["NT.00001"],
    itens: [
      ...porTema("Aterramento"),
      ...porTema("Proteção"),
      { texto: "Esquemas de aterramento TN e TT conforme a NBR 5410 para a proteção por seccionamento automático.", ref: ref("NT.00001", "item 6.3.8.7") },
      ...porTema("Motores e solda"),
    ],
  },
  {
    slug: "medicao",
    titulo: "Medição e caixas",
    resumo: "Caixas homologadas, grau de proteção, lacres e localização da medição.",
    normas: ["NT.00001", "NT.00030"],
    itens: [
      ...porTema("Caixas de medição"),
      { texto: "Medição em um só ponto por unidade consumidora; os medidores são fornecidos e instalados pela Equatorial e só ela rompe lacres.", ref: ref("NT.00001", "item 6.3.7 a, c, d") },
      { texto: "Caixas classificadas por material (polimérico, metálico ou misto), fixação (aparente, semiembutida, embutida) e local (ao tempo ou abrigada), com separação total entre energia medida e não medida.", ref: ref("NT.00030", "itens 5.2 e 5.3") },
      { texto: "Lista de fabricantes homologados: site da Equatorial, em Fornecedores → Fabricantes Homologados.", ref: ref("NT.00001", "item 6.3.6 j") },
    ],
  },
  {
    slug: "postes",
    titulo: "Postes auxiliares",
    resumo: "Tipos, alturas, esforços e engastamento.",
    normas: ["NT.00001", "NT.00045"],
    itens: [
      ...porTema("Postes"),
      { texto: "Tipos admitidos (Tabela 9): aço seção quadrada (5 m/50 daN, 7 m/70 daN), aço seccionado, fibra (75 daN), aço seção redonda (mono/bi); concreto quadrado, duplo T, concreto e fibra com medição acoplada (150 daN em 5 m / 200 daN em 7 m — mono, bi e tri).", ref: ref("NT.00001", "TABELA 9") },
      { texto: "Poste de aço serve de aterramento: o condutor passa por dentro do poste e é preso no parafuso do furo de aterramento.", ref: `${ref("NT.00001", "Nota 46")}; ${ref("NT.00045", "item 5.1.1")}` },
    ],
  },
  {
    slug: "ligacao",
    titulo: "Ligação nova, aumento de carga e estudos",
    resumo: "Passo a passo do pedido, documentos, casos que exigem estudo e manutenção do padrão.",
    normas: ["NT.00001"],
    itens: [
      { texto: "Sequência: executar o padrão de entrada conforme a norma e depois solicitar o fornecimento na agência ou no site. A Equatorial pode vistoriar e rejeitar.", ref: ref("NT.00001", "item 5.4") },
      { texto: `Informações do pedido: ${DOCUMENTOS_LIGACAO.informacoes.join("; ")}.`, ref: DOCUMENTOS_LIGACAO.ref },
      { texto: `Pessoa física: ${DOCUMENTOS_LIGACAO.pessoaFisica}`, ref: DOCUMENTOS_LIGACAO.ref },
      { texto: `Pessoa jurídica: ${DOCUMENTOS_LIGACAO.pessoaJuridica}`, ref: DOCUMENTOS_LIGACAO.ref },
      { texto: DOCUMENTOS_LIGACAO.contato, ref: DOCUMENTOS_LIGACAO.refContato },
      { texto: "Unidade consumidora individual em baixa tensão não apresenta projeto à Equatorial (exceto com geração própria/GD, que segue a NT.00009 ou NT.00020).", ref: ref("NT.00001", "item 5.2") },
      { texto: "Exigem estudo de rede: trifásico com demanda ≥ 22 kVA ou com máquina de solda, betoneira ou 'entrada de ar' declarados; motor monofásico ≥ 2 cv; bifásico ≥ 3 cv; trifásico ≥ 15 cv; maior motor ou solda a motor acima de 2 cv por fase em 220 V; raios-X e solda a transformador de qualquer potência; ligação provisória de evento acima de 6 kW.", ref: ref("NT.00001", "item 5.5") },
      { texto: "Aumento de carga acima do limite da categoria só com comunicação prévia à Equatorial; sem isso, pode haver suspensão. Pode-se deixar caixa polifásica, eletrodutos e poste dimensionados para carga futura.", ref: ref("NT.00001", "item 5.6") },
      { texto: "Conexão temporária (eventos, obras): apresentar a relação de cargas; trifásico provisório segue o padrão desta norma; a Equatorial pode exigir garantia de até 3 ciclos de faturamento.", ref: ref("NT.00001", "item 5.8") },
      { texto: "Manutenção do padrão (caixa, eletroduto, disjuntor) é do cliente. Desligamento programado: pedir com no mínimo 3 dias úteis informando nome, endereço, conta contrato, data/horário, motivo e telefone.", ref: ref("NT.00001", "item 5.9") },
    ],
  },
  {
    slug: "recarga-ve",
    titulo: "Recarga de veículo elétrico",
    resumo: "O essencial da NT.00042 para carregador residencial.",
    normas: ["NT.00042"],
    itens: [
      { texto: "Comunicar a Equatorial quando o carregador exigir ligação nova, aumento/redução de carga ou mudança de tensão (formulário do Anexo I).", ref: ref("NT.00042", "itens 5.2.1 e 5.2.4") },
      { texto: "Cliente individual com carregador de até 7,4 kW é dispensado de projeto; acima disso, apresentar projeto elétrico.", ref: ref("NT.00042", "item 5.2.3") },
      { texto: "UC individual com estação de recarga deve ter DPS no padrão de entrada; o quadro que alimenta a estação também deve ter DPS.", ref: ref("NT.00042", "itens 6.1.1 e 6.1.3") },
      { texto: "Circuito exclusivo, com disjuntor e DR; proibido ligar a estação direto nos bornes do disjuntor do padrão.", ref: ref("NT.00042", "itens 6.1.2 e 6.1.4") },
      { texto: "Cada ponto de recarga em CA com DR individual de IΔn ≤ 30 mA, no mínimo tipo A (tipo AC proibido). Modo 3 com tomada IEC 62196: DR tipo B, ou tipo A/F com detector de corrente contínua (IEC 62955), salvo se a estação já garantir.", ref: ref("NT.00042", "item 6.6.1") },
      { texto: "Demanda: fator 1 no circuito terminal e no de distribuição, salvo controle de recarga.", ref: ref("NT.00042", "item 6.4") },
      { texto: "Proibido injetar energia na rede a partir do veículo; recarga fica na própria UC (sem medição adicional exclusiva).", ref: ref("NT.00042", "itens 5.2.7 e 6.5.1") },
    ],
  },
  {
    slug: "geracao-solar",
    titulo: "Geração solar (micro GD)",
    resumo: "O essencial da NT.00020 para microgeração residencial.",
    normas: ["NT.00020", "NT.00001"],
    itens: [
      { texto: "Microgeração: potência instalada em CA de até 75 kW, limitada à potência disponibilizada da UC; para gerar mais, pedir aumento da potência disponibilizada.", ref: ref("NT.00020", "itens 3.34 e 6.1.5 a, g") },
      { texto: "Potência disponibilizada (Grupo B) = corrente do disjuntor geral × tensão nominal × fator de fases (1 ou √3) ÷ 1000, em kVA.", ref: ref("NT.00020", "item 6.1.5 e") },
      { texto: "Etapas: orçamento estimado (opcional), solicitação de orçamento de conexão, orçamento de conexão, aprovação, vistoria e aprovação do ponto de conexão.", ref: ref("NT.00020", "item 5.10") },
      { texto: "Documentos: formulário (Anexo I – Grupo B), documentos do titular, ART/TRT de projeto e execução, diagrama unifilar, diagrama de blocos e memorial técnico descritivo, assinados pelo responsável técnico (arquivos de até 5 MB, CAD/PDF).", ref: ref("NT.00020", "itens 5.13.1 e 5.13.2") },
      { texto: "Placa de identificação do inversor a no máximo 1,80 m do piso, para acesso na vistoria (não se aplica a microinversores).", ref: ref("NT.00020", "item 5.13.2 f e Nota 7") },
      { texto: "Planta de situação georreferenciada (Pará: UTM 21, 22 ou 23, ou graus decimais) na ligação nova.", ref: ref("NT.00020", "item 5.13.2 f e Nota 8") },
      { texto: "Projeto e homologação de GD exigem responsável técnico habilitado.", ref: ref("NT.00001", "itens 5.2 e 5.3") },
    ],
  },
];

export function buscarNasNormas(termo: string) {
  const n = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const q = n(termo.trim());
  if (!q) return [];
  return TEMAS.flatMap((t) =>
    t.itens.filter((i) => n(`${i.texto} ${i.ref}`).includes(q)).map((i) => ({ tema: t, item: i })),
  );
}
