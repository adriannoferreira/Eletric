/**
 * Catálogo inicial com preços de REFERÊNCIA (mão de obra de autônomo, sem material).
 * Os valores variam muito por região — o eletricista deve ajustar à sua realidade.
 */
export const CATALOGO_INICIAL: {
  tipo: "servico" | "material";
  categoria: string;
  nome: string;
  unidade: string;
  preco: number;
}[] = [
  { tipo: "servico", categoria: "Visita", nome: "Visita técnica / diagnóstico", unidade: "un", preco: 120 },
  { tipo: "servico", categoria: "Tomadas e interruptores", nome: "Troca de tomada ou interruptor", unidade: "un", preco: 35 },
  { tipo: "servico", categoria: "Tomadas e interruptores", nome: "Ponto novo de tomada (com passagem de fio, sem quebra)", unidade: "un", preco: 90 },
  { tipo: "servico", categoria: "Tomadas e interruptores", nome: "Circuito dedicado para ar-condicionado", unidade: "un", preco: 350 },
  { tipo: "servico", categoria: "Chuveiro", nome: "Instalação de chuveiro elétrico", unidade: "un", preco: 120 },
  { tipo: "servico", categoria: "Chuveiro", nome: "Troca de resistência de chuveiro", unidade: "un", preco: 60 },
  { tipo: "servico", categoria: "Iluminação", nome: "Instalação de luminária / plafon", unidade: "un", preco: 60 },
  { tipo: "servico", categoria: "Iluminação", nome: "Instalação de lustre / pendente", unidade: "un", preco: 100 },
  { tipo: "servico", categoria: "Iluminação", nome: "Instalação de spot embutido", unidade: "un", preco: 40 },
  { tipo: "servico", categoria: "Iluminação", nome: "Instalação de ventilador de teto", unidade: "un", preco: 150 },
  { tipo: "servico", categoria: "Iluminação", nome: "Instalação de sensor de presença", unidade: "un", preco: 70 },
  { tipo: "servico", categoria: "Quadro e proteção", nome: "Troca de disjuntor", unidade: "un", preco: 60 },
  { tipo: "servico", categoria: "Quadro e proteção", nome: "Instalação de DR", unidade: "un", preco: 120 },
  { tipo: "servico", categoria: "Quadro e proteção", nome: "Instalação de DPS", unidade: "un", preco: 100 },
  { tipo: "servico", categoria: "Quadro e proteção", nome: "Troca de quadro de distribuição (até 12 circuitos)", unidade: "un", preco: 600 },
  { tipo: "servico", categoria: "Quadro e proteção", nome: "Aterramento (haste + conexões)", unidade: "un", preco: 250 },
  { tipo: "servico", categoria: "Infraestrutura", nome: "Passagem de cabo", unidade: "m", preco: 8 },
  { tipo: "servico", categoria: "Infraestrutura", nome: "Passagem de eletroduto aparente", unidade: "m", preco: 15 },
  { tipo: "servico", categoria: "Laudos", nome: "Inspeção da instalação com relatório", unidade: "un", preco: 300 },
  { tipo: "material", categoria: "Cabos", nome: "Cabo flexível 1,5 mm² 750 V", unidade: "m", preco: 2.4 },
  { tipo: "material", categoria: "Cabos", nome: "Cabo flexível 2,5 mm² 750 V", unidade: "m", preco: 3.5 },
  { tipo: "material", categoria: "Cabos", nome: "Cabo flexível 4 mm² 750 V", unidade: "m", preco: 5.5 },
  { tipo: "material", categoria: "Cabos", nome: "Cabo flexível 6 mm² 750 V", unidade: "m", preco: 8.5 },
  { tipo: "material", categoria: "Cabos", nome: "Cabo flexível 10 mm² 750 V", unidade: "m", preco: 14 },
  { tipo: "material", categoria: "Proteção", nome: "Disjuntor DIN 1P curva C", unidade: "un", preco: 18 },
  { tipo: "material", categoria: "Proteção", nome: "Disjuntor DIN 2P curva C", unidade: "un", preco: 60 },
  { tipo: "material", categoria: "Proteção", nome: "DR 2P 40 A 30 mA", unidade: "un", preco: 180 },
  { tipo: "material", categoria: "Proteção", nome: "DPS classe II 275 V 20 kA", unidade: "un", preco: 45 },
  { tipo: "material", categoria: "Proteção", nome: "Quadro de distribuição de embutir 12 módulos DIN", unidade: "un", preco: 90 },
  { tipo: "material", categoria: "Acabamento", nome: "Tomada 2P+T 10 A com placa", unidade: "un", preco: 18 },
  { tipo: "material", categoria: "Acabamento", nome: "Tomada 2P+T 20 A com placa", unidade: "un", preco: 22 },
  { tipo: "material", categoria: "Acabamento", nome: "Interruptor simples com placa", unidade: "un", preco: 15 },
  { tipo: "material", categoria: "Infraestrutura", nome: "Eletroduto corrugado 3/4\"", unidade: "m", preco: 2.5 },
  { tipo: "material", categoria: "Infraestrutura", nome: "Caixa 4x2 de embutir", unidade: "un", preco: 3 },
  { tipo: "material", categoria: "Infraestrutura", nome: "Haste de aterramento 5/8\" x 2,4 m", unidade: "un", preco: 60 },
];
