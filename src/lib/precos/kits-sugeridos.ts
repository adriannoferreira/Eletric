/**
 * Kits residenciais típicos. Quantidades por unidade do kit, pensadas para obra
 * residencial comum (pé-direito ~2,8 m, até ~8 m do quadro). Tudo é editável.
 * Horas = tempo de eletricista e ajudante por unidade.
 */
type Mat = { nome: string; unidade: string; qtd: number };
export type KitSugerido = {
  chave: string;
  nome: string;
  categoria: string;
  unidade: string;
  descricao: string;
  servico: { nome: string; unidade: string; horasEletricista: number; horasAjudante: number };
  materiais: Mat[];
};

const CABO15 = "Cabo flexível 1,5 mm² 750 V";
const CABO25 = "Cabo flexível 2,5 mm² 750 V";
const CABO4 = "Cabo flexível 4 mm² 750 V";
const CABO6 = "Cabo flexível 6 mm² 750 V";
const CABO10 = "Cabo flexível 10 mm² 750 V";
const ELETRODUTO = 'Eletroduto corrugado 3/4"';
const CAIXA42 = "Caixa 4x2 de embutir";
const CONECTOR = "Conector de emenda tipo alavanca";
const ILHOS = "Terminal tubular (ilhós) para cabo";

export const KITS_SUGERIDOS: KitSugerido[] = [
  {
    chave: "tomada-10a-embutida",
    nome: "Ponto de tomada 10 A embutido",
    categoria: "Tomadas",
    unidade: "un",
    descricao: "Ponto novo com caixa, eletroduto e 3 condutores 2,5 mm² (F, N, PE).",
    servico: { nome: "Ponto novo de tomada (com passagem de fio, sem quebra)", unidade: "un", horasEletricista: 0.6, horasAjudante: 0.3 },
    materiais: [
      { nome: CAIXA42, unidade: "un", qtd: 1 },
      { nome: "Tomada 2P+T 10 A com placa", unidade: "un", qtd: 1 },
      { nome: CABO25, unidade: "m", qtd: 9 },
      { nome: ELETRODUTO, unidade: "m", qtd: 3 },
      { nome: CONECTOR, unidade: "un", qtd: 3 },
    ],
  },
  {
    chave: "tomada-20a-embutida",
    nome: "Ponto de tomada 20 A embutido",
    categoria: "Tomadas",
    unidade: "un",
    descricao: "Para eletrodomésticos de maior potência (micro-ondas, forno, lava-louças).",
    servico: { nome: "Ponto de tomada 20 A embutido", unidade: "un", horasEletricista: 0.7, horasAjudante: 0.3 },
    materiais: [
      { nome: CAIXA42, unidade: "un", qtd: 1 },
      { nome: "Tomada 2P+T 20 A com placa", unidade: "un", qtd: 1 },
      { nome: CABO25, unidade: "m", qtd: 9 },
      { nome: ELETRODUTO, unidade: "m", qtd: 3 },
      { nome: CONECTOR, unidade: "un", qtd: 3 },
    ],
  },
  {
    chave: "tomada-aparente",
    nome: "Ponto de tomada aparente",
    categoria: "Tomadas",
    unidade: "un",
    descricao: "Instalação sobreposta com caixa de sobrepor e canaleta, sem quebrar parede.",
    servico: { nome: "Ponto de tomada aparente (sobrepor)", unidade: "un", horasEletricista: 0.8, horasAjudante: 0.4 },
    materiais: [
      { nome: "Caixa 4x2 de sobrepor", unidade: "un", qtd: 1 },
      { nome: "Tomada 2P+T 10 A com placa", unidade: "un", qtd: 1 },
      { nome: CABO25, unidade: "m", qtd: 9 },
      { nome: "Canaleta de sobrepor 20 mm", unidade: "m", qtd: 3 },
      { nome: CONECTOR, unidade: "un", qtd: 3 },
    ],
  },
  {
    chave: "ponto-iluminacao",
    nome: "Ponto de iluminação no teto",
    categoria: "Iluminação",
    unidade: "un",
    descricao: "Caixa octogonal, eletroduto, cabos 1,5 mm² e receptáculo.",
    servico: { nome: "Ponto de iluminação (teto)", unidade: "un", horasEletricista: 0.5, horasAjudante: 0.25 },
    materiais: [
      { nome: "Caixa octogonal 4x4 de embutir", unidade: "un", qtd: 1 },
      { nome: CABO15, unidade: "m", qtd: 7 },
      { nome: ELETRODUTO, unidade: "m", qtd: 3 },
      { nome: "Receptáculo (bocal) E27", unidade: "un", qtd: 1 },
      { nome: CONECTOR, unidade: "un", qtd: 2 },
    ],
  },
  {
    chave: "interruptor-simples",
    nome: "Ponto de interruptor simples",
    categoria: "Iluminação",
    unidade: "un",
    descricao: "Interruptor de uma seção com caixa, eletroduto e retorno.",
    servico: { nome: "Ponto de interruptor simples", unidade: "un", horasEletricista: 0.5, horasAjudante: 0.25 },
    materiais: [
      { nome: CAIXA42, unidade: "un", qtd: 1 },
      { nome: "Interruptor simples com placa", unidade: "un", qtd: 1 },
      { nome: CABO15, unidade: "m", qtd: 5 },
      { nome: ELETRODUTO, unidade: "m", qtd: 2.5 },
    ],
  },
  {
    chave: "interruptor-paralelo",
    nome: "Interruptor paralelo (dois pontos)",
    categoria: "Iluminação",
    unidade: "un",
    descricao: "Par de interruptores three-way (ex.: escada ou corredor).",
    servico: { nome: "Ponto de interruptor paralelo (par)", unidade: "un", horasEletricista: 1, horasAjudante: 0.5 },
    materiais: [
      { nome: CAIXA42, unidade: "un", qtd: 2 },
      { nome: "Interruptor paralelo com placa", unidade: "un", qtd: 2 },
      { nome: CABO15, unidade: "m", qtd: 14 },
      { nome: ELETRODUTO, unidade: "m", qtd: 6 },
    ],
  },
  {
    chave: "chuveiro-circuito",
    nome: "Chuveiro com circuito dedicado",
    categoria: "Chuveiro",
    unidade: "un",
    descricao: "Até 7.500 W em 220 V, ~15 m do quadro: cabo 6 mm² (F, F/N, PE) e disjuntor 2P.",
    servico: { nome: "Circuito dedicado para chuveiro (com instalação)", unidade: "un", horasEletricista: 2.5, horasAjudante: 1.5 },
    materiais: [
      { nome: CABO6, unidade: "m", qtd: 48 },
      { nome: ELETRODUTO, unidade: "m", qtd: 15 },
      { nome: "Disjuntor DIN 2P curva C", unidade: "un", qtd: 1 },
      { nome: ILHOS, unidade: "un", qtd: 3 },
      { nome: "Conector de porcelana para chuveiro", unidade: "un", qtd: 1 },
    ],
  },
  {
    chave: "ar-condicionado",
    nome: "Ar-condicionado com circuito dedicado",
    categoria: "Climatização",
    unidade: "un",
    descricao: "Split até 12.000 BTU em 220 V, ~15 m do quadro: cabo 2,5 mm², tomada 20 A e disjuntor 2P.",
    servico: { nome: "Circuito dedicado para ar-condicionado", unidade: "un", horasEletricista: 3, horasAjudante: 2 },
    materiais: [
      { nome: CABO25, unidade: "m", qtd: 48 },
      { nome: ELETRODUTO, unidade: "m", qtd: 15 },
      { nome: CAIXA42, unidade: "un", qtd: 1 },
      { nome: "Tomada 2P+T 20 A com placa", unidade: "un", qtd: 1 },
      { nome: "Disjuntor DIN 2P curva C", unidade: "un", qtd: 1 },
      { nome: ILHOS, unidade: "un", qtd: 3 },
    ],
  },
  {
    chave: "instalacao-dr",
    nome: "Instalação de DR no quadro",
    categoria: "Quadro e proteção",
    unidade: "un",
    descricao: "DR 2P 40 A 30 mA com terminais.",
    servico: { nome: "Instalação de DR", unidade: "un", horasEletricista: 1, horasAjudante: 0 },
    materiais: [
      { nome: "DR 2P 40 A 30 mA", unidade: "un", qtd: 1 },
      { nome: ILHOS, unidade: "un", qtd: 4 },
      { nome: CABO6, unidade: "m", qtd: 1 },
    ],
  },
  {
    chave: "instalacao-dps",
    nome: "Instalação de DPS (fase + neutro)",
    categoria: "Quadro e proteção",
    unidade: "un",
    descricao: "Dois DPS classe II ligados à barra de terra com condutor curto.",
    servico: { nome: "Instalação de DPS", unidade: "un", horasEletricista: 0.75, horasAjudante: 0 },
    materiais: [
      { nome: "DPS classe II 275 V 20 kA", unidade: "un", qtd: 2 },
      { nome: CABO4, unidade: "m", qtd: 1.5 },
      { nome: ILHOS, unidade: "un", qtd: 4 },
    ],
  },
  {
    chave: "troca-quadro",
    nome: "Troca de quadro de distribuição (12 módulos)",
    categoria: "Quadro e proteção",
    unidade: "un",
    descricao: "Caixa nova, barramento e reorganização. Disjuntores, DR e DPS à parte.",
    servico: { nome: "Troca de quadro de distribuição (até 12 circuitos)", unidade: "un", horasEletricista: 6, horasAjudante: 4 },
    materiais: [
      { nome: "Quadro de distribuição de embutir 12 módulos DIN", unidade: "un", qtd: 1 },
      { nome: "Barramento pente DIN", unidade: "un", qtd: 1 },
      { nome: ILHOS, unidade: "un", qtd: 30 },
      { nome: "Etiquetas de identificação de circuitos", unidade: "un", qtd: 1 },
    ],
  },
  {
    chave: "aterramento",
    nome: "Aterramento com haste",
    categoria: "Quadro e proteção",
    unidade: "un",
    descricao: "Haste cobreada, conector, caixa de inspeção e condutor de 10 mm² até o quadro.",
    servico: { nome: "Aterramento (haste + conexões)", unidade: "un", horasEletricista: 2, horasAjudante: 2 },
    materiais: [
      { nome: 'Haste de aterramento 5/8" x 2,4 m', unidade: "un", qtd: 1 },
      { nome: "Conector para haste de aterramento", unidade: "un", qtd: 1 },
      { nome: "Caixa de inspeção de aterramento", unidade: "un", qtd: 1 },
      { nome: CABO10, unidade: "m", qtd: 10 },
    ],
  },
  {
    chave: "luminaria",
    nome: "Instalação de luminária",
    categoria: "Iluminação",
    unidade: "un",
    descricao: "Luminária/plafon fornecido pelo cliente, em ponto existente.",
    servico: { nome: "Instalação de luminária / plafon", unidade: "un", horasEletricista: 0.5, horasAjudante: 0 },
    materiais: [{ nome: CONECTOR, unidade: "un", qtd: 2 }],
  },
  {
    chave: "ventilador-teto",
    nome: "Instalação de ventilador de teto",
    categoria: "Iluminação",
    unidade: "un",
    descricao: "Ventilador fornecido pelo cliente, com controle de parede em ponto existente.",
    servico: { nome: "Instalação de ventilador de teto", unidade: "un", horasEletricista: 1.5, horasAjudante: 0.5 },
    materiais: [
      { nome: CONECTOR, unidade: "un", qtd: 4 },
      { nome: CABO15, unidade: "m", qtd: 3 },
    ],
  },
  {
    chave: "sensor-presenca",
    nome: "Sensor de presença",
    categoria: "Iluminação",
    unidade: "un",
    descricao: "Sensor de teto em ponto de iluminação existente.",
    servico: { nome: "Instalação de sensor de presença", unidade: "un", horasEletricista: 0.5, horasAjudante: 0 },
    materiais: [
      { nome: "Sensor de presença de teto", unidade: "un", qtd: 1 },
      { nome: CONECTOR, unidade: "un", qtd: 3 },
    ],
  },
  {
    chave: "circuito-por-metro",
    nome: "Passagem de circuito (por metro)",
    categoria: "Infraestrutura",
    unidade: "m",
    descricao: "Circuito de 2,5 mm² (F, N, PE) em eletroduto, por metro de trajeto.",
    servico: { nome: "Passagem de cabo", unidade: "m", horasEletricista: 0.08, horasAjudante: 0.08 },
    materiais: [
      { nome: CABO25, unidade: "m", qtd: 3.3 },
      { nome: ELETRODUTO, unidade: "m", qtd: 1.05 },
    ],
  },
];
