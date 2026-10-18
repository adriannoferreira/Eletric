/**
 * Requisitos do padrão de entrada (NT.00001 rev. 09, itens 6.3.x e notas dos desenhos),
 * caixas (NT.00030 rev. 05) e postes (NT.00045 rev. 01), lista de materiais e checklist de vistoria.
 */
import type { LinhaTabela2, TipoLigacao } from "./fornecimento";
import { ref } from "./normas";

export interface Requisito {
  tema:
    | "Ramal de conexão"
    | "Ponto de conexão e medição"
    | "Montagem e eletroduto"
    | "Aterramento"
    | "Caixas de medição"
    | "Postes"
    | "Proteção"
    | "Motores e solda";
  texto: string;
  ref: string;
}

export const REQUISITOS_PADRAO: Requisito[] = [
  { tema: "Ramal de conexão", texto: "Ramal de conexão aéreo com no máximo 30 m do ponto de ligação até a medição (até 45 m se a UC estiver a até 45 m do fim da rede BT — Nota 16). Acima disso, é preciso extensão de rede.", ref: ref("NT.00001", "item 6.3.2.4") },
  { tema: "Ramal de conexão", texto: "Altura mínima do ramal ao solo: 3,5 m onde só passam pedestres; 5,5 m onde passam veículos; 60 cm de afastamento de cabos de comunicação.", ref: ref("NT.00001", "item 6.3.2.6") },
  { tema: "Ramal de conexão", texto: "Ramal exclusivo por unidade consumidora, sem emendas; sai do poste mais próximo, entra pela frente do terreno, não atravessa terreno de terceiros e fica a pelo menos 1,20 m de janelas, sacadas e telhados.", ref: ref("NT.00001", "itens 6.3.2.1, 6.3.2.2 e 6.3.2.5") },
  { tema: "Ramal de conexão", texto: "Condutores, alças e conexões do ramal são fornecidos e instalados só pela Equatorial. O eletricista deixa a obra civil e o padrão prontos.", ref: ref("NT.00001", "itens 6.3.2.3 e 6.3.3 a") },
  { tema: "Ponto de conexão e medição", texto: "Medição no limite da via pública: no muro (se houver), na parede frontal (prédio sem recuo) ou em poste auxiliar (prédio recuado sem muro). Uma medição por UC.", ref: ref("NT.00001", "itens 6.3.3 e 6.3.7") },
  { tema: "Ponto de conexão e medição", texto: "Altura de fixação da caixa de medição: 1.300 mm (± 100 mm).", ref: ref("NT.00001", "Notas 40, 43, 47 e seguintes dos Desenhos 17 a 29") },
  { tema: "Ponto de conexão e medição", texto: "Medição no muro só com muro de no mínimo 2,10 m de altura; abaixo disso, usar poste auxiliar.", ref: ref("NT.00001", "Notas 39, 42, 62 e 65") },
  { tema: "Ponto de conexão e medição", texto: "Imóvel tombado (IPHAN): caixa no interior, sem descaracterizar a fachada, a no máximo 3 m da via pública.", ref: ref("NT.00001", "item 6.3.7 g") },
  { tema: "Montagem e eletroduto", texto: "Eletroduto de entrada aparente em aço galvanizado a fogo (PVC rígido roscável só com ancoragem auxiliar ou totalmente embutido na fachada), com capacete; diâmetro conforme a TABELA 2.", ref: ref("NT.00001", "item 6.3.3 d, e, f, i") },
  { tema: "Montagem e eletroduto", texto: "Pontalete ou eletroduto de entrada em aço galvanizado deve suportar no mínimo 75 daN. Com eletroduto de PVC, usar parafuso chumbador com olhal para a alça de serviço.", ref: ref("NT.00001", "item 6.3.3 g") },
  { tema: "Montagem e eletroduto", texto: "Eletroduto aparente fixado com no mínimo 3 abraçadeiras tipo D com cunha, parafusos e buchas.", ref: ref("NT.00001", "item 6.3.3 h") },
  { tema: "Montagem e eletroduto", texto: "Junção do eletroduto à caixa com curva, luva, bucha e arruela; eletroduto de entrada fixado na lateral da caixa; saída pela parte inferior ou lateral.", ref: ref("NT.00001", "item 6.3.3 b, i") },
  { tema: "Aterramento", texto: "Neutro aterrado em toda UC, inclusive provisória; a conexão neutro × condutor de aterramento fica na caixa de medição.", ref: ref("NT.00001", "item 6.3.4 a, b") },
  { tema: "Aterramento", texto: "Condutor de aterramento em aço cobreado, sem emendas, curto e retilíneo, sem chave, protegido por eletroduto rígido; seção conforme a TABELA 2.", ref: ref("NT.00001", "item 6.3.4 c, d") },
  { tema: "Aterramento", texto: "Eletroduto do aterramento em PVC rígido pesado roscável: 1/2\" para condutor até 10 mm² e 1\" para 10 a 35 mm².", ref: ref("NT.00001", "item 6.3.4 e") },
  { tema: "Aterramento", texto: "Uma haste de aço cobreado Ø 16 mm (5/8\") × 1.500 mm, com conector tipo cunha protegido contra corrosão, sem solda e acessível à inspeção. Com poste metálico, a haste é dispensada (o poste serve de condutor de terra).", ref: ref("NT.00001", "item 6.3.4 f, g; Desenho 12") },
  { tema: "Caixas de medição", texto: "Caixa homologada pela Equatorial, com nome do fabricante, nº da carta de homologação e logomarca; caixa não homologada é rejeitada na vistoria.", ref: ref("NT.00001", "item 6.3.6 e, j, k") },
  { tema: "Caixas de medição", texto: "Caixa contra entrada de água para instalação ao tempo (IP 54 na NT.00001). A NT.00030 rev. 05 fixa grau mínimo IP43 para as caixas — a exigência de instalação ao tempo da NT.00001 é a mais restritiva.", ref: `${ref("NT.00001", "item 6.3.6 c")}; ${ref("NT.00030", "item 5.2.4")}` },
  { tema: "Caixas de medição", texto: "Caixa de uso exclusivo da medição: proibido instalar outros equipamentos, fazer derivações ou romper lacres. Pode-se usar caixa polifásica mesmo no monofásico, prevendo aumento de carga.", ref: ref("NT.00001", "item 6.3.6 f, g, h, i") },
  { tema: "Caixas de medição", texto: "Trifásico a partir de 100 A: caixa de medição e proteção metálica trifásica (Desenho 6), com visor de vidro de no mínimo 4 mm.", ref: ref("NT.00001", "Desenho 6 e Nota 34") },
  { tema: "Postes", texto: "Poste auxiliar de 5 m (engastamento 1,10 m) quando a edificação fica do mesmo lado da rede; de 7 m (engastamento 1,30 m) do lado oposto.", ref: ref("NT.00001", "item 6.3.3 k") },
  { tema: "Postes", texto: "Poste de aço de seção quadrada só para padrões monofásico e bifásico; uma caixa de medição por poste. Para trifásico, usar poste de concreto (150 daN em 5 m / 200 daN em 7 m) ou de fibra com medição acoplada.", ref: `${ref("NT.00001", "TABELA 9 e Nota 45")}; ${ref("NT.00045", "item 5.1")}` },
  { tema: "Postes", texto: "Engastamento do poste: e = 0,1 × L + 0,6 m.", ref: ref("NT.00045", "item 3.3") },
  { tema: "Proteção", texto: "Disjuntor termomagnético geral em caixa de proteção separada da medição, dimensionado pela TABELA 2. Disjuntor acima do tabelado é notificado e a ligação só ocorre após a troca.", ref: ref("NT.00001", "itens 6.3.8.2, 6.3.8.5 e 6.3.8.6") },
  { tema: "Proteção", texto: "Continuidade do neutro: proibido emenda, chave, disjuntor ou fusível no neutro.", ref: ref("NT.00001", "item 6.3.8.4") },
  { tema: "Proteção", texto: "Recomenda-se disjuntores para os circuitos internos e tomadas 2P+T com o terra ligado ao condutor de proteção, conforme a NBR 5410.", ref: ref("NT.00001", "itens 6.3.8.3 e 6.3.9.3") },
  { tema: "Motores e solda", texto: "Motor trifásico até 5 cv pode partir direto; acima de 5 cv exige dispositivo de redução da corrente de partida (TABELA 7: estrela-triângulo, série-paralelo ou chave compensadora em 220/127 V até 25 cv). Proteção de motor ajustada em 125% da corrente nominal (115% se a elevação de temperatura passar de 40 °C).", ref: ref("NT.00001", "item 6.3.8.8 e TABELA 7") },
  { tema: "Motores e solda", texto: "Solda: proteção no primário de até 200% da corrente nominal (solda a arco) ou 300% (solda a resistência).", ref: ref("NT.00001", "item 6.3.8.9") },
];

export type Montagem = "muro" | "parede" | "poste_aco" | "poste_concreto";

export const ROTULO_MONTAGEM: Record<Montagem, string> = {
  muro: "Caixa no muro (mín. 2,10 m de altura)",
  parede: "Caixa na parede frontal (prédio sem recuo)",
  poste_aco: "Poste auxiliar de aço (mono/bi)",
  poste_concreto: "Poste auxiliar de concreto",
};

export interface MaterialPadrao {
  descricao: string;
  quantidade: number;
  unidade: string;
  ref: string;
  /** Palavras para achar o preço no catálogo. */
  busca: string[];
}

/**
 * Materiais por conta do cliente para montar o padrão (Tabelas 14, 15 e 16 + TABELA 2).
 * Itens do ramal (cabo, alças, conectores) são da concessionária e não entram.
 */
export function materiaisPadrao(
  tipo: TipoLigacao,
  linha: LinhaTabela2,
  montagem: Montagem,
  opcoes: { ladoOposto?: boolean; comprimentoSaidaM?: number } = {},
): MaterialPadrao[] {
  const polos = tipo === "monofasico" ? 1 : tipo === "bifasico" ? 2 : 3;
  const poli = tipo !== "monofasico";
  const posteMetalico = montagem === "poste_aco";
  const saida = opcoes.comprimentoSaidaM ?? 10;
  const tab = tipo === "monofasico" ? (montagem === "poste_aco" || montagem === "poste_concreto" ? "TABELA 15" : "TABELA 14") : "TABELA 16";
  const r = ref("NT.00001", `${tab} e TABELA 2`);
  const [fase, neutro] = linha.condutorCliente.replace(")", "").split("(");
  const metalica = tipo === "trifasico" && linha.disjuntorA >= 100;

  const itens: MaterialPadrao[] = [
    {
      descricao: metalica
        ? "Caixa de medição e proteção metálica trifásica (a partir de 100 A), homologada Equatorial"
        : `Caixa de medição e proteção polimérica ${poli ? "polifásica" : "monofásica"}, homologada Equatorial`,
      quantidade: 1,
      unidade: "un",
      ref: metalica ? ref("NT.00001", "Desenho 6") : ref("NT.00001", poli ? "Desenho 5" : "Desenho 4"),
      busca: ["caixa", "medicao"],
    },
    {
      descricao: `Disjuntor termomagnético ${polos === 1 ? "monopolar" : polos === 2 ? "bipolar" : "tripolar"} ${linha.disjuntorA} A`,
      quantidade: 1,
      unidade: "un",
      ref: ref("NT.00001", "TABELA 2"),
      busca: ["disjuntor", `${polos}p`],
    },
    {
      descricao: `Cabo de cobre isolado 1 kV 90 °C ${fase} mm² (fase)`,
      quantidade: saida * polos,
      unidade: "m",
      ref: ref("NT.00001", "TABELA 2 e Nota 22"),
      busca: ["cabo", `${fase} mm`],
    },
    {
      descricao: `Cabo de cobre isolado 1 kV 90 °C ${neutro} mm² (neutro, azul-claro)`,
      quantidade: saida,
      unidade: "m",
      ref: ref("NT.00001", "TABELA 2 e Nota 22"),
      busca: ["cabo", `${neutro} mm`],
    },
    { descricao: `Condutor de aterramento em aço cobreado ${linha.aterramentoMm2} mm²`, quantidade: 2.5, unidade: "m", ref: r, busca: ["aco", "cobreado"] },
    { descricao: `Eletroduto de PVC rígido roscável ${linha.eletrodutoAterramento} (aterramento)`, quantidade: 1.5, unidade: "m", ref: ref("NT.00001", "item 6.3.4 e"), busca: ["eletroduto", "pvc"] },
    { descricao: `Bucha e arruela para eletroduto PVC ${linha.eletrodutoAterramento}`, quantidade: 1, unidade: "jogo", ref: r, busca: ["bucha", "arruela", "pvc"] },
    { descricao: "Eletroduto de PVC rígido roscável para saída até o quadro", quantidade: saida, unidade: "m", ref: r, busca: ["eletroduto", "pvc", "rigido"] },
    { descricao: "Terminal pré-isolado tipo ilhós", quantidade: poli ? 8 : 4, unidade: "un", ref: r, busca: ["terminal", "ilhos"] },
  ];

  if (!posteMetalico) {
    itens.push(
      { descricao: "Haste de aterramento aço cobreado Ø 16 mm (5/8\") × 1.500 mm", quantidade: 1, unidade: "un", ref: ref("NT.00001", "item 6.3.4 f"), busca: ["haste"] },
      { descricao: "Conector cunha para haste de aterramento", quantidade: 1, unidade: "un", ref: ref("NT.00001", "Desenho 12"), busca: ["conector", "haste"] },
    );
  }

  if (montagem === "muro" || montagem === "parede") {
    itens.push(
      { descricao: `Eletroduto de aço galvanizado ${linha.eletrodutoAco} × 2.400 ou 4.000 mm (entrada)`, quantidade: 1, unidade: "un", ref: ref("NT.00001", "TABELA 2 e Desenho 9"), busca: ["eletroduto", "galvanizado"] },
      { descricao: `Capacete para eletroduto de aço ${linha.eletrodutoAco}`, quantidade: 1, unidade: "un", ref: ref("NT.00001", "Desenho 11"), busca: ["capacete", "eletroduto"] },
      { descricao: `Curva 90°, luva, bucha e arruela para eletroduto ${linha.eletrodutoAco}`, quantidade: 1, unidade: "jogo", ref: r, busca: ["curva", "galvanizado"] },
      { descricao: "Abraçadeira tipo D com cunha, parafusos e buchas", quantidade: 3, unidade: "un", ref: ref("NT.00001", "item 6.3.3 h"), busca: ["abracadeira", "d"] },
    );
  }
  if (montagem === "poste_aco") {
    itens.push({
      descricao: `Poste auxiliar de aço quadrado 70×70 mm × ${opcoes.ladoOposto ? "7.000" : "5.000"} mm com capacete`,
      quantidade: 1,
      unidade: "un",
      ref: ref("NT.00001", "item 6.3.3 k e TABELA 11"),
      busca: ["poste", "aco"],
    });
  }
  if (montagem === "poste_concreto") {
    itens.push({
      descricao: `Poste auxiliar de concreto ${opcoes.ladoOposto ? "7 m / 200 daN" : "5 m / 150 daN"}`,
      quantidade: 1,
      unidade: "un",
      ref: `${ref("NT.00001", "TABELA 9")}; ${ref("NT.00045", "item 5")}`,
      busca: ["poste", "concreto"],
    });
  }
  return itens;
}

/** Checklist para conferir antes de pedir a vistoria/ligação. */
export function checklistVistoria(tipo: TipoLigacao, linha: LinhaTabela2, montagem: Montagem): { texto: string; ref: string }[] {
  const itens = [
    { texto: "Caixa de medição homologada pela Equatorial (etiqueta com fabricante, carta de homologação e logomarca)", ref: ref("NT.00001", "item 6.3.6 e, j") },
    { texto: "Caixa fixada a 1,30 m (± 0,10 m) do piso, no limite com a via pública", ref: ref("NT.00001", "notas dos Desenhos 17 a 29") },
    { texto: `Disjuntor geral de ${linha.disjuntorA} A (não pode ser maior que o da TABELA 2)`, ref: ref("NT.00001", "itens 6.3.8.5 e 6.3.8.6") },
    { texto: `Condutores de saída de no mínimo ${linha.condutorCliente} mm² (fase(neutro)), isolação 1 kV / 90 °C`, ref: ref("NT.00001", "TABELA 2 e Nota 22") },
    { texto: "Neutro sem emendas, chaves ou dispositivos; identificação do neutro visível", ref: ref("NT.00001", "itens 6.3.2.5 h e 6.3.8.4") },
    {
      texto:
        montagem === "poste_aco"
          ? "Condutor de aterramento passando por dentro do poste metálico e preso no parafuso do furo de aterramento"
          : `Aterramento: haste Ø 16 × 1.500 mm, conector cunha acessível e condutor de aço cobreado de ${linha.aterramentoMm2} mm² em eletroduto ${linha.eletrodutoAterramento}`,
      ref: ref("NT.00001", montagem === "poste_aco" ? "Nota 46" : "item 6.3.4"),
    },
    { texto: "Neutro ligado ao condutor de aterramento dentro da caixa de medição", ref: ref("NT.00001", "item 6.3.4 b") },
    { texto: "Capacete no eletroduto de entrada; junções com curva, luva, bucha e arruela; sem entrada de água", ref: ref("NT.00001", "item 6.3.3 i") },
    { texto: "Ponto de ancoragem do ramal pronto (pontalete/eletroduto de aço ≥ 75 daN ou parafuso olhal)", ref: ref("NT.00001", "item 6.3.3 g") },
    { texto: "Trajeto do ramal livre: ≤ 30 m, sem atravessar terceiros, alturas de 3,5 m (pedestres) / 5,5 m (veículos)", ref: ref("NT.00001", "itens 6.3.2.4 a 6.3.2.6") },
    { texto: "Número do poste da rede mais próximo anotado para o pedido de ligação", ref: ref("NT.00001", "item 5.4.3.2 c") },
    { texto: "Relação de cargas (potência de cada carga e nº de fases) pronta para a solicitação", ref: ref("NT.00001", "item 5.4.3.2 e, f") },
  ];
  if (montagem === "muro") itens.splice(2, 0, { texto: "Muro com no mínimo 2,10 m de altura", ref: ref("NT.00001", "Nota 39") });
  if (tipo === "trifasico" && montagem === "poste_aco") {
    itens.push({ texto: "ATENÇÃO: poste de aço quadrado não serve para trifásico — trocar por concreto ou fibra", ref: ref("NT.00001", "Nota 45") });
  }
  return itens;
}

/** Documentos para a solicitação de fornecimento (5.4.3). */
export const DOCUMENTOS_LIGACAO = {
  informacoes: [
    "Nome, endereço e telefone do interessado",
    "Endereço do imóvel a ser ligado",
    "Número do poste da rede mais próximo do ponto de conexão (se existir)",
    "Finalidade: provisório, residencial, comercial ou industrial (com o ramo de atividade)",
    "Potência total instalada, discriminando cada carga (lâmpadas, motores, aparelhos, tomadas…)",
    "Número de fases que alimentam cada tipo de carga",
  ],
  pessoaFisica: "CPF e RG (ou outro documento com foto); procuração autenticada se quem solicita não for o titular.",
  pessoaJuridica:
    "Contrato/Estatuto Social, CNPJ e documentos do sócio ou representante (com procuração se não constar no contrato). ME/EPP pode apresentar o cadastro simples da prefeitura.",
  ref: ref("NT.00001", "itens 5.4.3.2 a 5.4.3.4"),
  contato: "Pará: 0800 091 0196 (central de atendimento) ou agências da Equatorial e site.",
  refContato: ref("NT.00001", "item 5.1"),
};
