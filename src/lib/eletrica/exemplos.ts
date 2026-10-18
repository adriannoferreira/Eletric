/**
 * Modelos de quadro prontos (exemplos), gerados pelo próprio motor a partir de
 * obras típicas. O usuário escolhe carregar — nada é inserido automaticamente.
 */
import { gerarQuadro, presetCarga } from "./projeto";
import type { Ambiente, Carga, Obra, ProjetoObra, QuadroDados } from "./tipos";

let n = 0;
const amb = (nome: string, tipo: Ambiente["tipo"], areaM2: number, perimetroM: number, distanciaM: number): Ambiente => ({
  id: `ex_a${++n}`,
  nome,
  tipo,
  areaM2,
  perimetroM,
  distanciaM,
  luzVA: null,
  tomadas: null,
});

const carga = (tipo: string, ambienteId: string | null, extra: Partial<Carga> = {}): Carga => {
  const p = presetCarga(tipo);
  return {
    id: `ex_t${++n}`,
    nome: p.nome,
    tipo,
    potenciaW: p.potenciaW,
    fatorPotencia: p.fatorPotencia,
    tensaoV: p.tensaoV,
    trifasico: false,
    quantidade: 1,
    ambienteId,
    ...extra,
  };
};

const obra = (o: Partial<Obra>): Obra => ({
  tipoImovel: "casa",
  concessionaria: "outra",
  tensoes: "127/220",
  esquema: "TN-C-S",
  fornecimentoExistente: "desconhecido",
  disjuntorExistenteA: null,
  entradaAerea: true,
  metodo: "B1",
  agrupamento: 1,
  drEmTodos: true,
  observacoes: "",
  ...o,
});

function apartamento(): ProjetoObra {
  const sala = amb("Sala", "sala", 16, 16, 6);
  const quarto = amb("Quarto", "quarto", 10, 13, 8);
  const cozinha = amb("Cozinha", "cozinha", 6, 10, 5);
  const banho = amb("Banheiro", "banheiro", 3, 7, 7);
  const servico = amb("Área de serviço", "area_servico", 3, 7, 5);
  return {
    obra: obra({ tipoImovel: "apartamento", tensoes: "127/220", observacoes: "Apartamento pequeno, chuveiro 127 V." }),
    ambientes: [sala, quarto, cozinha, banho, servico],
    cargas: [
      carga("chuveiro", banho.id, { nome: "Chuveiro 127 V", potenciaW: 5400, tensaoV: 127 }),
      carga("microondas", cozinha.id),
    ],
  };
}

function casaMedia(): ProjetoObra {
  const sala = amb("Sala", "sala", 20, 18, 6);
  const q1 = amb("Suíte", "quarto", 14, 15, 10);
  const q2 = amb("Quarto 2", "quarto", 10, 13, 9);
  const b1 = amb("Banheiro suíte", "banheiro", 4, 8, 11);
  const b2 = amb("Banheiro social", "banheiro", 3.5, 7.5, 8);
  const coz = amb("Cozinha", "cozinha", 10, 13, 5);
  const serv = amb("Área de serviço", "area_servico", 5, 9, 4);
  const var_ = amb("Varanda", "varanda", 6, 10, 7);
  return {
    obra: obra({ tipoImovel: "casa", tensoes: "127/220", observacoes: "Casa térrea, 2 chuveiros e 2 ar-condicionado." }),
    ambientes: [sala, q1, q2, b1, b2, coz, serv, var_],
    cargas: [
      carga("chuveiro", b1.id),
      carga("chuveiro", b2.id),
      carga("ar", q1.id, { nome: "Ar-condicionado 12 000 BTU" }),
      carga("ar", q2.id, { nome: "Ar-condicionado 9 000 BTU", potenciaW: 1000 }),
      carga("microondas", coz.id),
      carga("lavaroupa", serv.id),
    ],
  };
}

function casaTrifasica(): ProjetoObra {
  const sala = amb("Sala de estar/jantar", "sala", 32, 24, 8);
  const q1 = amb("Suíte master", "quarto", 18, 17, 14);
  const q2 = amb("Suíte 2", "quarto", 14, 15, 12);
  const q3 = amb("Quarto 3", "quarto", 11, 13.5, 10);
  const b1 = amb("Banheiro master", "banheiro", 6, 10, 15);
  const b2 = amb("Banheiro suíte 2", "banheiro", 4, 8, 13);
  const b3 = amb("Banheiro social", "banheiro", 3.5, 7.5, 9);
  const coz = amb("Cozinha gourmet", "cozinha", 16, 16, 6);
  const serv = amb("Lavanderia", "lavanderia", 6, 10, 5);
  const gar = amb("Garagem", "garagem", 30, 22, 8);
  return {
    obra: obra({ tipoImovel: "sobrado", tensoes: "220/380", observacoes: "Casa grande em rede 220/380 V." }),
    ambientes: [sala, q1, q2, q3, b1, b2, b3, coz, serv, gar],
    cargas: [
      carga("chuveiro", b1.id),
      carga("chuveiro", b2.id),
      carga("chuveiro", b3.id),
      carga("cooktop", coz.id),
      carga("forno", coz.id),
      carga("ar", q1.id, { nome: "Ar-condicionado 18 000 BTU", potenciaW: 2000 }),
      carga("ar", q2.id, { nome: "Ar-condicionado 12 000 BTU" }),
      carga("ar", sala.id, { nome: "Ar-condicionado 24 000 BTU", potenciaW: 2700 }),
      carga("lavaroupa", serv.id, { tensaoV: 220 }),
      carga("portao", gar.id, { tensaoV: 220 }),
    ],
  };
}

function comercio(): ProjetoObra {
  const loja = amb("Salão de vendas", "sala", 40, 26, 6);
  const esc = amb("Escritório", "escritorio", 10, 13, 8);
  const copa = amb("Copa", "copa", 6, 10, 9);
  const wc = amb("Banheiro", "banheiro", 3, 7, 10);
  const dep = amb("Depósito", "outro", 12, 14, 12);
  return {
    obra: obra({ tipoImovel: "comercio", tensoes: "127/220", observacoes: "Pequena loja com ar-condicionado." }),
    ambientes: [loja, esc, copa, wc, dep],
    cargas: [
      carga("ar", loja.id, { nome: "Ar-condicionado 24 000 BTU", potenciaW: 2700 }),
      carga("ar", esc.id, { nome: "Ar-condicionado 9 000 BTU", potenciaW: 1000 }),
      carga("microondas", copa.id),
      carga("outro", loja.id, { nome: "Expositor refrigerado", potenciaW: 800, fatorPotencia: 0.85 }),
    ],
  };
}

export const EXEMPLOS: { id: string; nome: string; descricao: string; projeto: () => ProjetoObra }[] = [
  { id: "apto-mono", nome: "Apartamento pequeno — monofásico 127 V", descricao: "1 quarto, chuveiro 127 V, cozinha e área de serviço.", projeto: apartamento },
  { id: "casa-bi", nome: "Casa média — bifásico 127/220 V", descricao: "2 quartos (1 suíte), 2 chuveiros 220 V e 2 ar-condicionados.", projeto: casaMedia },
  { id: "casa-tri", nome: "Casa grande — trifásico 220/380 V", descricao: "3 suítes, cozinha gourmet com cooktop e forno, 3 ar-condicionados.", projeto: casaTrifasica },
  { id: "comercio", nome: "Pequeno comércio — 127/220 V", descricao: "Salão de vendas, escritório, copa e banheiro, com ar-condicionado.", projeto: comercio },
];

export function quadroExemplo(id: string): { nome: string; descricao: string; dados: QuadroDados } | null {
  const e = EXEMPLOS.find((x) => x.id === id);
  if (!e) return null;
  return { nome: e.nome, descricao: e.descricao, dados: gerarQuadro(e.projeto()).dados };
}
