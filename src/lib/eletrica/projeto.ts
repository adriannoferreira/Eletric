/**
 * Gerador de projeto elétrico a partir dos dados da obra.
 *
 * Entrada: ambientes (área/perímetro), cargas específicas e dados da
 * concessionária. Saída: previsão de cargas (NBR 5410 9.5.2), divisão de
 * circuitos (9.5.3), demanda e categoria de atendimento (referência genérica —
 * conferir na norma da concessionária) e um QuadroDados completo, com geral,
 * DPS, DR(s) e disjuntores posicionados, pronto para o construtor.
 */
import { analisarQuadro, correnteProjeto, dimensionar, disjuntorMinimo, tensaoDoCircuito } from "./calculo";
import { concessionaria, LIMITES_CATEGORIA_KVA } from "./concessionarias";
import { ID_EQUATORIAL_PA, type PadraoEquatorial, padraoEquatorial, secaoFaseCliente } from "./equatorial";
import { type Caixa, caixa as caixaPorId, filtrarCaixas, modeloDaCaixa } from "./caixas";
import { ajustarFasesAoPente } from "./ligacoes";
import { modulosOcupados, peca, type Peca } from "./pecas";
import { CORRENTES_NOMINAIS, reservaMinima } from "./tabelas";
import {
  type Alimentacao,
  type Ambiente,
  type Carga,
  type Circuito,
  type Componente,
  type Fase,
  fasesDisponiveis,
  type Ligacao,
  type Local,
  LOCAIS,
  type ModeloQuadro,
  novoCircuito,
  novoId,
  type ProjetoObra,
  type QuadroDados,
  TIPOS_AMBIENTE,
  VERSAO_QUADRO,
} from "./tipos";
import type { Alerta } from "./calculo";

// ---------------------------------------------------------------------------
// Cargas específicas (TUE) — potências típicas de referência
// ---------------------------------------------------------------------------

export type GrupoDemanda = "aquecimento" | "ar" | "motor" | "outros";

export interface PresetCarga {
  id: string;
  nome: string;
  potenciaW: number;
  fatorPotencia: number;
  /** Tensão nominal usual do aparelho. */
  tensaoV: number;
  grupo: GrupoDemanda;
  ambiente?: keyof typeof TIPOS_AMBIENTE;
  nota?: string;
}

/** Potências típicas — confira sempre a placa/manual do aparelho. */
export const PRESETS_CARGA: PresetCarga[] = [
  { id: "chuveiro", nome: "Chuveiro elétrico", potenciaW: 7500, fatorPotencia: 1, tensaoV: 220, grupo: "aquecimento", ambiente: "banheiro" },
  { id: "torneira", nome: "Torneira elétrica", potenciaW: 4500, fatorPotencia: 1, tensaoV: 220, grupo: "aquecimento", ambiente: "cozinha" },
  { id: "ar", nome: "Ar-condicionado", potenciaW: 1400, fatorPotencia: 0.9, tensaoV: 220, grupo: "ar", ambiente: "quarto" },
  { id: "forno", nome: "Forno elétrico de embutir", potenciaW: 3000, fatorPotencia: 1, tensaoV: 220, grupo: "aquecimento", ambiente: "cozinha" },
  { id: "cooktop", nome: "Cooktop de indução", potenciaW: 7000, fatorPotencia: 1, tensaoV: 220, grupo: "aquecimento", ambiente: "cozinha" },
  { id: "microondas", nome: "Micro-ondas", potenciaW: 1500, fatorPotencia: 1, tensaoV: 127, grupo: "outros", ambiente: "cozinha" },
  { id: "lavalouca", nome: "Lava-louças", potenciaW: 1500, fatorPotencia: 1, tensaoV: 127, grupo: "outros", ambiente: "cozinha" },
  { id: "lavaroupa", nome: "Máquina de lavar roupa", potenciaW: 1000, fatorPotencia: 0.85, tensaoV: 127, grupo: "motor", ambiente: "area_servico" },
  { id: "secadora", nome: "Secadora de roupa", potenciaW: 3000, fatorPotencia: 1, tensaoV: 220, grupo: "aquecimento", ambiente: "area_servico" },
  { id: "aquecedor", nome: "Aquecedor de água (boiler)", potenciaW: 2500, fatorPotencia: 1, tensaoV: 220, grupo: "aquecimento" },
  { id: "bomba", nome: "Bomba d'água 1/2 cv", potenciaW: 750, fatorPotencia: 0.8, tensaoV: 220, grupo: "motor", ambiente: "area_externa" },
  { id: "portao", nome: "Portão eletrônico", potenciaW: 400, fatorPotencia: 0.8, tensaoV: 127, grupo: "motor", ambiente: "garagem" },
  {
    id: "ve",
    nome: "Carregador de veículo elétrico 7,4 kW",
    potenciaW: 7400,
    fatorPotencia: 1,
    tensaoV: 220,
    grupo: "outros",
    ambiente: "garagem",
    nota: "Circuito exclusivo com DR adequado ao carregador (tipo A/B conforme fabricante) — conferir NBR 17019 e o manual.",
  },
  { id: "outro", nome: "Outro equipamento", potenciaW: 1000, fatorPotencia: 1, tensaoV: 127, grupo: "outros" },
];

export function presetCarga(id: string) {
  return PRESETS_CARGA.find((p) => p.id === id) ?? PRESETS_CARGA[PRESETS_CARGA.length - 1];
}

/** Ar-condicionado: potência elétrica aproximada por capacidade (BTU/h). Conferir a placa. */
export const AR_POR_BTU: Record<number, number> = {
  7500: 800,
  9000: 1000,
  12000: 1400,
  18000: 2000,
  24000: 2700,
  30000: 3300,
};

// ---------------------------------------------------------------------------
// Previsão de cargas por ambiente — NBR 5410 9.5.2
// ---------------------------------------------------------------------------

/** Ambientes cujas tomadas recebem 600 VA (9.5.2.2.2 a). */
const AMBIENTES_600VA = new Set(["banheiro", "cozinha", "copa", "area_servico", "lavanderia"]);
/** Ambientes com circuitos de tomadas exclusivos (9.5.3.2). */
const AMBIENTES_CIRCUITO_PROPRIO = new Set(["cozinha", "copa", "area_servico", "lavanderia"]);

export function perimetroEfetivo(a: Pick<Ambiente, "areaM2" | "perimetroM">) {
  if (a.perimetroM > 0) return a.perimetroM;
  return a.areaM2 > 0 ? Math.round(4 * Math.sqrt(a.areaM2) * 10) / 10 : 0;
}

/** 9.5.2.1.2 — iluminação: 100 VA até 6 m², + 60 VA a cada 4 m² inteiros acima disso. */
export function iluminacaoMinimaVA(areaM2: number) {
  if (areaM2 <= 6) return 100;
  return 100 + 60 * Math.floor((areaM2 - 6) / 4);
}

/** 9.5.2.2.1 — quantidade mínima de pontos de tomada (TUG) do ambiente. */
export function tomadasMinimas(a: Pick<Ambiente, "tipo" | "areaM2" | "perimetroM">) {
  const p = perimetroEfetivo(a);
  switch (a.tipo) {
    case "banheiro":
      return 1; // a) junto ao lavatório
    case "cozinha":
    case "copa":
      return Math.max(2, Math.ceil(p / 3.5)); // b) 1 a cada 3,5 m; ≥ 2 sobre a bancada da pia
    case "area_servico":
    case "lavanderia":
      return Math.max(1, Math.ceil(p / 3.5)); // b)
    case "varanda":
      return 1; // c)
    case "sala":
    case "quarto":
      return Math.max(1, Math.ceil(p / 5)); // d) 1 a cada 5 m ou fração
    case "area_externa":
      return 1; // recomendação (não há mínimo específico)
    default:
      // e) demais cômodos: 1 até 6 m²; acima, 1 a cada 5 m de perímetro ou fração
      return a.areaM2 <= 6 ? 1 : Math.max(1, Math.ceil(p / 5));
  }
}

export interface PrevisaoAmbiente {
  ambiente: Ambiente;
  local: Local;
  luzVA: number;
  luzMinimaVA: number;
  tomadas: number;
  tomadasMinimas: number;
  /** Potência de cada ponto de tomada (VA). */
  vaPorTomada: number[];
  tomadasVA: number;
}

/**
 * Previsão de todos os ambientes. A regra dos 600 VA (9.5.2.2.2 a) usa 3 pontos
 * por ambiente, ou 2 quando o conjunto desses ambientes passa de 6 tomadas.
 */
export function preverAmbientes(ambientes: Ambiente[]): PrevisaoAmbiente[] {
  const base = ambientes.map((a) => {
    const minT = tomadasMinimas(a);
    const minL = iluminacaoMinimaVA(a.areaM2);
    return {
      ambiente: a,
      local: TIPOS_AMBIENTE[a.tipo].local as Local,
      luzMinimaVA: minL,
      luzVA: a.luzVA ?? minL,
      tomadasMinimas: minT,
      tomadas: a.tomadas ?? minT,
    };
  });
  const totalMolhadas = base.filter((b) => AMBIENTES_600VA.has(b.ambiente.tipo)).reduce((s, b) => s + b.tomadas, 0);
  const n600 = totalMolhadas > 6 ? 2 : 3;
  return base.map((b) => {
    const va = Array.from({ length: b.tomadas }, (_, i) =>
      AMBIENTES_600VA.has(b.ambiente.tipo) && i < n600 ? 600 : 100,
    );
    return { ...b, vaPorTomada: va, tomadasVA: va.reduce((s, v) => s + v, 0) };
  });
}

// ---------------------------------------------------------------------------
// Divisão em circuitos — NBR 5410 9.5.3
// ---------------------------------------------------------------------------

/** Corrente máxima usada para agrupar pontos num circuito (prática de projeto). */
export const LIMITE_ILUMINACAO_A = 10;
export const LIMITE_TUG_A = 16;
export const MAX_TOMADAS_POR_CIRCUITO = 10;

/** Prioridade do local para a verificação de DR quando o circuito atende vários ambientes. */
function localMaisExigente(locais: Local[]): Local {
  if (locais.length === 1) return locais[0];
  const molhado = locais.find((l) => LOCAIS[l].molhado);
  if (molhado) return molhado;
  const externo = locais.find((l) => LOCAIS[l].externo);
  if (externo) return externo;
  return "varios";
}

/** Tensões da rede a partir do texto "127/220" ou "220/380". */
export function tensoesDaRede(t: "127/220" | "220/380") {
  const [fn, ff] = t.split("/").map(Number);
  return { tensaoFN: fn, tensaoFF: ff };
}

/** Ligação de uma carga conforme a tensão do aparelho e a rede. */
export function ligacaoDaCarga(c: Pick<Carga, "tensaoV" | "trifasico">, rede: { tensaoFN: number; tensaoFF: number }): {
  ligacao: Ligacao;
  alerta?: string;
} {
  if (c.trifasico) return { ligacao: "3F" };
  if (c.tensaoV === rede.tensaoFN) return { ligacao: "FN" };
  if (c.tensaoV === rede.tensaoFF) return { ligacao: "FF" };
  return {
    ligacao: "FN",
    alerta: `Aparelho de ${c.tensaoV} V não corresponde às tensões da rede (${rede.tensaoFN}/${rede.tensaoFF} V) — ligado em ${rede.tensaoFN} V; confira o aparelho.`,
  };
}

interface Agrupavel {
  /** Ambiente de origem (id do projeto da obra). */
  ambienteId?: string;
  nome: string;
  local: Local;
  va: number;
  pontos: number;
  distancia: number;
}

/** Agrupa itens sequencialmente sem passar do limite de VA/pontos por circuito. */
function agrupar(itens: Agrupavel[], limiteVA: number, maxPontos = Infinity) {
  const grupos: Agrupavel[][] = [];
  let atual: Agrupavel[] = [];
  let va = 0;
  let pontos = 0;
  for (const it of itens) {
    // Item maior que o limite: divide em partes.
    const partes = Math.max(1, Math.ceil(it.va / limiteVA), Math.ceil(it.pontos / maxPontos));
    for (let i = 0; i < partes; i++) {
      const parte: Agrupavel = {
        ...it,
        va: it.va / partes,
        pontos: Math.max(1, Math.round(it.pontos / partes)),
      };
      if (atual.length && (va + parte.va > limiteVA || pontos + parte.pontos > maxPontos)) {
        grupos.push(atual);
        atual = [];
        va = 0;
        pontos = 0;
      }
      atual.push(parte);
      va += parte.va;
      pontos += parte.pontos;
    }
  }
  if (atual.length) grupos.push(atual);
  return grupos;
}

function idsAmbientes(g: Agrupavel[]) {
  return [...new Set(g.map((x) => x.ambienteId).filter((x): x is string => !!x))];
}

function nomeGrupo(prefixo: string, g: Agrupavel[]) {
  const nomes = [...new Set(g.map((x) => x.nome))];
  return `${prefixo} — ${nomes.length > 3 ? `${nomes.slice(0, 3).join(", ")}…` : nomes.join(", ")}`;
}

export interface CircuitoGerado {
  circuito: Circuito;
  grupoDemanda: GrupoDemanda | "iluminacao_tug";
  /** Aparelho trifásico/fase-fase etc. não suportado pela rede. */
  alertas: string[];
}

export function dividirCircuitos(p: ProjetoObra): CircuitoGerado[] {
  const rede = tensoesDaRede(p.obra.tensoes);
  const prev = preverAmbientes(p.ambientes);
  const base: Partial<Circuito> = {
    metodo: p.obra.metodo,
    circuitosAgrupados: p.obra.agrupamento,
    temperaturaC: 30,
  };
  const saida: CircuitoGerado[] = [];
  const v = rede.tensaoFN;

  // Iluminação
  const luz = agrupar(
    prev
      .filter((x) => x.luzVA > 0)
      .map((x) => ({ ambienteId: x.ambiente.id, nome: x.ambiente.nome, local: x.local, va: x.luzVA, pontos: 1, distancia: x.ambiente.distanciaM })),
    LIMITE_ILUMINACAO_A * v,
  );
  luz.forEach((g, i) =>
    saida.push({
      circuito: novoCircuito({
        ...base,
        nome: nomeGrupo(`Iluminação ${luz.length > 1 ? i + 1 : ""}`.trim(), g),
        tipo: "iluminacao",
        local: localMaisExigente(g.map((x) => x.local)),
        potenciaW: Math.round(g.reduce((s, x) => s + x.va, 0)),
        fatorPotencia: 1,
        ligacao: "FN",
        comprimentoM: Math.max(...g.map((x) => x.distancia)),
        quantidadePontos: g.reduce((s, x) => s + x.pontos, 0),
        ambienteIds: idsAmbientes(g),
      }),
      grupoDemanda: "iluminacao_tug",
      alertas: [],
    }),
  );

  // TUG — ambientes com circuito próprio (cozinha, copa, área de serviço, lavanderia)
  const tug = (x: PrevisaoAmbiente): Agrupavel => ({
    ambienteId: x.ambiente.id,
    nome: x.ambiente.nome,
    local: x.local,
    va: x.tomadasVA,
    pontos: x.tomadas,
    distancia: x.ambiente.distanciaM,
  });
  for (const x of prev.filter((x) => x.tomadas > 0 && AMBIENTES_CIRCUITO_PROPRIO.has(x.ambiente.tipo))) {
    const grupos = agrupar([tug(x)], LIMITE_TUG_A * v, MAX_TOMADAS_POR_CIRCUITO);
    grupos.forEach((g, i) =>
      saida.push({
        circuito: novoCircuito({
          ...base,
          nome: `Tomadas ${x.ambiente.nome}${grupos.length > 1 ? ` ${i + 1}` : ""}`,
          tipo: "tug",
          local: x.local,
          potenciaW: Math.round(g.reduce((s, y) => s + y.va, 0)),
          fatorPotencia: 1,
          ligacao: "FN",
          comprimentoM: x.ambiente.distanciaM,
          quantidadePontos: g.reduce((s, y) => s + y.pontos, 0),
          ambienteIds: [x.ambiente.id],
        }),
        grupoDemanda: "iluminacao_tug",
        alertas: [],
      }),
    );
  }

  // TUG — demais ambientes, agrupados
  const gerais = agrupar(
    prev.filter((x) => x.tomadas > 0 && !AMBIENTES_CIRCUITO_PROPRIO.has(x.ambiente.tipo)).map(tug),
    LIMITE_TUG_A * v,
    MAX_TOMADAS_POR_CIRCUITO,
  );
  gerais.forEach((g, i) =>
    saida.push({
      circuito: novoCircuito({
        ...base,
        nome: nomeGrupo(`Tomadas ${gerais.length > 1 ? i + 1 : ""}`.trim(), g),
        tipo: "tug",
        local: localMaisExigente(g.map((x) => x.local)),
        potenciaW: Math.round(g.reduce((s, x) => s + x.va, 0)),
        fatorPotencia: 1,
        ligacao: "FN",
        comprimentoM: Math.max(...g.map((x) => x.distancia)),
        quantidadePontos: g.reduce((s, x) => s + x.pontos, 0),
        ambienteIds: idsAmbientes(g),
      }),
      grupoDemanda: "iluminacao_tug",
      alertas: [],
    }),
  );

  // TUE — um circuito por aparelho (9.5.3.1)
  for (const c of p.cargas) {
    const amb = p.ambientes.find((a) => a.id === c.ambienteId);
    const local: Local = amb ? TIPOS_AMBIENTE[amb.tipo].local : (TIPOS_AMBIENTE[presetCarga(c.tipo).ambiente ?? "outro"].local);
    const { ligacao, alerta } = ligacaoDaCarga(c, rede);
    for (let i = 0; i < c.quantidade; i++) {
      saida.push({
        circuito: novoCircuito({
          ...base,
          nome: `${c.nome}${amb ? ` — ${amb.nome}` : ""}${c.quantidade > 1 ? ` ${i + 1}` : ""}`,
          tipo: "tue",
          local,
          potenciaW: c.potenciaW,
          fatorPotencia: c.fatorPotencia,
          ligacao,
          comprimentoM: amb?.distanciaM ?? 10,
          quantidadePontos: 1,
          ambienteIds: amb ? [amb.id] : [],
        }),
        grupoDemanda: presetCarga(c.tipo).grupo,
        alertas: alerta ? [alerta] : [],
      });
    }
  }
  return saida;
}

// ---------------------------------------------------------------------------
// Demanda e categoria de atendimento (referência genérica)
// ---------------------------------------------------------------------------

/**
 * Fatores de demanda de iluminação + TUG por faixa de carga (kW) — tabela
 * clássica de livros de projeto. Cada concessionária tem a sua: conferir.
 */
const FD_ILUM_TUG: [number, number][] = [
  [1, 0.86], [2, 0.75], [3, 0.66], [4, 0.59], [5, 0.52],
  [6, 0.45], [7, 0.4], [8, 0.35], [9, 0.31], [10, 0.27],
];

/** Fator de demanda de aparelhos (TUE) pelo número de aparelhos — referência genérica. */
const FD_APARELHOS = [1, 1, 1, 0.84, 0.76, 0.7, 0.65, 0.6, 0.57, 0.54, 0.52];

export function fatorIluminacaoTug(kw: number) {
  for (const [lim, f] of FD_ILUM_TUG) if (kw <= lim) return f;
  return 0.24;
}

export function fatorAparelhos(n: number) {
  if (n <= 0) return 0;
  if (n < FD_APARELHOS.length) return FD_APARELHOS[n];
  return 0.5;
}

export type Categoria = "monofasico" | "bifasico" | "trifasico";

export interface Demanda {
  cargaInstaladaW: number;
  iluminacaoTugW: number;
  fdIluminacaoTug: number;
  aparelhosW: number;
  arW: number;
  fdAparelhos: number;
  demandaW: number;
  demandaKVA: number;
  categoria: Categoria;
  motivoCategoria: string;
  correnteA: number;
  disjuntorGeralA: number | null;
  secaoEntradaMm2: number | null;
  alertas: Alerta[];
  /** Disjuntor do padrão de entrada pela norma da concessionária (Equatorial PA: Tabela 2). */
  disjuntorPadraoA: number | null;
  /** Enquadramento oficial quando a concessionária é a Equatorial Pará (NT.00001 rev. 09). */
  equatorial: PadraoEquatorial | null;
}

const FP_DEMANDA = 0.92;

/**
 * Calcula a demanda a partir dos circuitos (gerados ou montados à mão).
 * `grupos` (opcional) indica o grupo de demanda de cada circuito; sem ele,
 * TUEs com FP < 0,95 são tratadas como motor/ar e as demais como aparelhos.
 */
export function calcularDemanda(
  circuitos: Circuito[],
  tensoes: { tensaoFN: number; tensaoFF: number },
  extra: { fornecimentoExistente?: string; disjuntorExistenteA?: number | null; concessionaria?: string | null } = {},
): Demanda {
  const alertas: Alerta[] = [];
  const ilumTug = circuitos.filter((c) => c.tipo !== "tue").reduce((s, c) => s + c.potenciaW, 0);
  const tues = circuitos.filter((c) => c.tipo === "tue");
  const ar = tues.filter((c) => /ar-?condicionado|split/i.test(c.nome));
  const aparelhos = tues.filter((c) => !ar.includes(c));
  const arW = ar.reduce((s, c) => s + c.potenciaW, 0);
  const aparelhosW = aparelhos.reduce((s, c) => s + c.potenciaW, 0);
  const fdIT = ilumTug > 0 ? fatorIluminacaoTug(ilumTug / 1000) : 0;
  const fdAp = fatorAparelhos(aparelhos.length);
  // Ar-condicionado residencial: fator 1 (todos podem funcionar juntos) — referência.
  let demandaW = ilumTug * fdIT + aparelhosW * fdAp + arW;
  let demandaKVA = demandaW / 1000 / FP_DEMANDA;

  // Categoria mínima pelas cargas
  let categoria: Categoria = "monofasico";
  let motivo = "Demanda dentro do limite de referência do monofásico.";
  if (tues.some((c) => c.ligacao === "3F")) {
    categoria = "trifasico";
    motivo = "Há equipamento trifásico.";
  } else if (tues.some((c) => c.ligacao === "FF")) {
    categoria = "bifasico";
    motivo = `Há equipamento em ${tensoes.tensaoFF} V (fase-fase).`;
  }
  if (categoria === "monofasico" && demandaKVA > LIMITES_CATEGORIA_KVA.monofasico) {
    categoria = "bifasico";
    motivo = `Demanda de ${demandaKVA.toFixed(1)} kVA acima da referência de ${LIMITES_CATEGORIA_KVA.monofasico} kVA para monofásico.`;
  }
  if (categoria === "bifasico" && demandaKVA > LIMITES_CATEGORIA_KVA.bifasico) {
    categoria = "trifasico";
    motivo = `Demanda de ${demandaKVA.toFixed(1)} kVA acima da referência de ${LIMITES_CATEGORIA_KVA.bifasico} kVA para bifásico.`;
  }
  const eq = extra.concessionaria === ID_EQUATORIAL_PA ? padraoEquatorial(circuitos) : null;
  if (eq) {
    // Regra oficial da Equatorial PA: tipo de ligação pela carga instalada e pelas restrições de equipamentos.
    const cat = eq.categoria;
    categoria = cat.tipo === "media_tensao" ? "trifasico" : cat.tipo;
    motivo = cat.motivos.join(" ");
    // Demanda estimada pelas Tabelas 4 e 5 da NT.00001 (FP 1 no mono/bi, 0,92 no tri).
    demandaW = eq.demanda.demandaKW * 1000;
    demandaKVA = eq.demanda.demandaKVA;
    for (const b of cat.bloqueios) alertas.push({ nivel: "erro", mensagem: b });
    for (const e of cat.estudos) alertas.push({ nivel: "aviso", mensagem: e });
    for (const a of cat.avisos) alertas.push({ nivel: "aviso", mensagem: a });
  } else if (demandaKVA > LIMITES_CATEGORIA_KVA.trifasico) {
    alertas.push({
      nivel: "erro",
      mensagem: `Demanda de ${demandaKVA.toFixed(1)} kVA acima da referência de ${LIMITES_CATEGORIA_KVA.trifasico} kVA para atendimento em BT — pode exigir subestação/média tensão. Consulte a concessionária.`,
    });
  }

  // Corrente de demanda por fase
  const va = eq ? demandaKVA * 1000 : demandaW / FP_DEMANDA;
  const correnteA =
    categoria === "monofasico"
      ? va / tensoes.tensaoFN
      : categoria === "bifasico"
        ? va / (2 * tensoes.tensaoFN)
        : va / (Math.sqrt(3) * tensoes.tensaoFF);
  const linhaEq = eq?.categoria.linha ?? null;
  const disjuntorPadraoA = linhaEq?.disjuntorA ?? null;
  // Geral do QDC pela corrente de demanda; com a Equatorial, nunca acima do disjuntor do padrão (NT.00001 6.3.8.6).
  const pelaDemanda = disjuntorMinimo(Math.max(correnteA, 1)) ?? null;
  const disjuntorGeralA =
    disjuntorPadraoA != null ? Math.min(pelaDemanda ?? disjuntorPadraoA, disjuntorPadraoA) : pelaDemanda;
  // Seção mínima que comporta o disjuntor geral (critério de capacidade, B1) ou a da Tabela 2 da Equatorial.
  const secaoEntradaMm2 = linhaEq
    ? secaoFaseCliente(linhaEq.condutorCliente)
    : disjuntorGeralA
      ? secaoParaCorrente(disjuntorGeralA, categoria === "trifasico" ? 3 : 2)
      : null;

  if (!disjuntorGeralA && !eq) {
    alertas.push({ nivel: "erro", mensagem: `Corrente de demanda de ${correnteA.toFixed(0)} A acima de 125 A — fora do alcance de disjuntores DIN.` });
  }
  const ordem: Record<string, number> = { monofasico: 1, bifasico: 2, trifasico: 3 };
  if (extra.fornecimentoExistente && extra.fornecimentoExistente !== "desconhecido") {
    if (ordem[extra.fornecimentoExistente] < ordem[categoria]) {
      alertas.push({
        nivel: "aviso",
        mensagem: `O padrão existente é ${extra.fornecimentoExistente}, mas a carga pede ${categoria}. Será preciso pedir aumento de carga/troca de padrão à concessionária.`,
      });
    }
  }
  if (extra.disjuntorExistenteA && disjuntorGeralA && extra.disjuntorExistenteA < disjuntorGeralA) {
    alertas.push({
      nivel: "aviso",
      mensagem: `Disjuntor do padrão existente (${extra.disjuntorExistenteA} A) menor que o estimado pela demanda (${disjuntorGeralA} A). Avalie aumento de carga junto à concessionária.`,
    });
  }
  alertas.push(
    eq
      ? {
          nivel: "info",
          mensagem:
            "Tipo de ligação, disjuntor do padrão e condutor de entrada pela Equatorial Pará — NT.00001 rev. 09, item 6.2 e Tabela 2 (dimensionamento pela carga instalada). A demanda é estimativa auxiliar (Tabelas 4 e 5).",
        }
      : {
          nivel: "info",
          mensagem:
            "Fatores de demanda e limites de categoria são referências genéricas de pré-projeto — conferir na norma da concessionária, que define também o disjuntor e o cabo do padrão.",
        },
  );

  return {
    cargaInstaladaW: ilumTug + aparelhosW + arW,
    iluminacaoTugW: ilumTug,
    fdIluminacaoTug: fdIT,
    aparelhosW,
    arW,
    fdAparelhos: fdAp,
    demandaW,
    demandaKVA,
    categoria,
    motivoCategoria: motivo,
    correnteA,
    disjuntorGeralA,
    secaoEntradaMm2,
    alertas,
    disjuntorPadraoA,
    equatorial: eq,
  };
}

function secaoParaCorrente(correnteA: number, carregados: 2 | 3) {
  const d = dimensionar({
    tipo: "tue",
    potenciaW: correnteA * 100,
    fatorPotencia: 1,
    ligacao: carregados === 3 ? "3F" : "FN",
    tensaoV: carregados === 3 ? 100 * Math.sqrt(3) : 100,
    comprimentoM: 0,
    metodo: "B1",
    temperaturaC: 30,
    circuitosAgrupados: 1,
  });
  return d.secao;
}

// ---------------------------------------------------------------------------
// Montagem do quadro
// ---------------------------------------------------------------------------

/** Atribui fases aos circuitos equilibrando a corrente (maior primeiro). */
export function balancearFases(circuitos: Circuito[], alimentacao: Alimentacao): Map<string, Fase[]> {
  const disp = fasesDisponiveis(alimentacao);
  const carga: Record<Fase, number> = { R: 0, S: 0, T: 0 };
  const res = new Map<string, Fase[]>();
  const ib = (c: Circuito) =>
    correnteProjeto(c.potenciaW, tensaoDoCircuito(c.ligacao, alimentacao), c.fatorPotencia, c.ligacao);
  const ordenados = [...circuitos].sort((a, b) => ib(b) - ib(a));
  for (const c of ordenados) {
    const i = ib(c);
    let fases: Fase[];
    if (c.ligacao === "3F") fases = disp.slice(0, 3);
    else if (c.ligacao === "FF") fases = [...disp].sort((a, b) => carga[a] - carga[b]).slice(0, 2).sort();
    else fases = [[...disp].sort((a, b) => carga[a] - carga[b])[0]];
    for (const f of fases) carga[f] += i;
    res.set(c.id, fases);
  }
  return res;
}

function disjuntorDoCircuito(c: Circuito, alimentacao: Alimentacao): Peca | undefined {
  const d = dimensionar({ ...c, tensaoV: tensaoDoCircuito(c.ligacao, alimentacao) });
  if (!d.disjuntor) return undefined;
  const polos = c.ligacao === "FN" ? 1 : c.ligacao === "FF" ? 2 : 3;
  const curva = c.tipo === "iluminacao" ? "B" : "C";
  return peca(`dj-${polos}p-${curva}${d.disjuntor}`) ?? peca(`dj-${polos}p-C${d.disjuntor}`);
}

const DR_CORRENTES = [25, 40, 63];
const MAX_CIRCUITOS_POR_DR = 6;

interface GrupoDR {
  circuitos: { c: Circuito; In: number; ib: number; fases: Fase[] }[];
}

/**
 * Agrupa circuitos sob DRs: o DR deve ter In ≥ maior disjuntor do grupo e ≥
 * soma das correntes com diversidade de 0,7 (critério de pré-projeto).
 */
function agruparDRs(itens: GrupoDR["circuitos"]): GrupoDR[] {
  const grupos: GrupoDR[] = [];
  const ordenados = [...itens].sort((a, b) => b.In - a.In);
  for (const it of ordenados) {
    const cabe = grupos.find((g) => {
      if (g.circuitos.length >= MAX_CIRCUITOS_POR_DR) return false;
      const lista = [...g.circuitos, it];
      return correnteDR(lista) !== null;
    });
    if (cabe) cabe.circuitos.push(it);
    else grupos.push({ circuitos: [it] });
  }
  return grupos;
}

function correnteDR(lista: GrupoDR["circuitos"]) {
  const maior = Math.max(...lista.map((x) => x.In));
  const soma = 0.7 * lista.reduce((s, x) => s + x.ib, 0);
  return DR_CORRENTES.find((i) => i >= maior && i >= soma) ?? null;
}

/** DR 2P serve F+N de uma fase ou duas fases sem neutro; senão, 4P. */
function polosDR(lista: GrupoDR["circuitos"], mono: boolean) {
  if (mono) return 2;
  const fases = new Set(lista.flatMap((x) => x.fases));
  const comNeutro = lista.some((x) => x.c.ligacao === "FN" || x.c.ligacao === "3F");
  if (comNeutro && fases.size === 1) return 2;
  if (!comNeutro && fases.size <= 2) return 2;
  return 4;
}

export interface ResultadoProjeto {
  dados: QuadroDados;
  demanda: Demanda;
  alertas: Alerta[];
}

/** Gera o quadro completo a partir dos dados da obra. */
export function gerarQuadro(p: ProjetoObra): ResultadoProjeto {
  const rede = tensoesDaRede(p.obra.tensoes);
  const gerados = dividirCircuitos(p);
  const circuitos = gerados.map((g) => g.circuito);
  const demanda = calcularDemanda(circuitos, rede, p.obra);
  const alertas: Alerta[] = gerados.flatMap((g) => g.alertas.map((m) => ({ nivel: "aviso" as const, mensagem: m })));

  const alimentacao: Alimentacao = {
    tipo: demanda.categoria,
    tensaoFN: rede.tensaoFN,
    tensaoFF: demanda.categoria === "monofasico" ? rede.tensaoFN : rede.tensaoFF,
    esquema: p.obra.esquema,
  };
  const fasesCirc = balancearFases(circuitos, alimentacao);
  const disp = fasesDisponiveis(alimentacao);

  // Disjuntores dos circuitos
  const dj = new Map<string, Peca | undefined>(circuitos.map((c) => [c.id, disjuntorDoCircuito(c, alimentacao)]));

  // DRs
  const precisaDR = (c: Circuito) => p.obra.drEmTodos || exigeDRLocal(c);
  const itensDR = circuitos
    .filter(precisaDR)
    .map((c) => ({
      c,
      In: dj.get(c.id)?.correnteNominal ?? 0,
      ib: correnteProjeto(c.potenciaW, tensaoDoCircuito(c.ligacao, alimentacao), c.fatorPotencia, c.ligacao),
      fases: fasesCirc.get(c.id) ?? [],
    }));
  const gruposDR = agruparDRs(itensDR);

  // Lista ordenada de componentes a posicionar
  const fila: Omit<Componente, "fileira" | "posicao">[] = [];
  const geralIn = demanda.disjuntorGeralA ?? 63;
  const polosGeral = Math.max(1, disp.length);
  const geral =
    peca(`dj-${polosGeral}p-C${geralIn}`) ??
    peca(`dj-${polosGeral}p-C${CORRENTES_NOMINAIS.find((i) => i >= geralIn && peca(`dj-${polosGeral}p-C${i}`))}`);
  if (geral) {
    fila.push({ id: novoId("k"), pecaId: geral.id, fases: disp.slice(0, polosGeral), circuitoId: null, geral: true, etiqueta: "Geral" });
  } else {
    alertas.push({ nivel: "erro", mensagem: `Sem disjuntor geral de ${geralIn} A ${polosGeral}P no catálogo.` });
  }

  const uc = rede.tensaoFN <= 127 ? 175 : 275;
  const dpsId = `dps-${uc}-20`;
  for (const f of disp) fila.push({ id: novoId("k"), pecaId: dpsId, fases: [f], circuitoId: null, geral: false, etiqueta: `DPS ${f}` });
  if (p.obra.esquema !== "TN-C-S") {
    fila.push({ id: novoId("k"), pecaId: dpsId, fases: [], circuitoId: null, geral: false, etiqueta: "DPS N-PE" });
  }

  const comDR = new Set<string>();
  const drDoCircuito = new Map<string, string>();
  gruposDR.forEach((g, i) => {
    const In = correnteDR(g.circuitos) ?? 63;
    const polos = polosDR(g.circuitos, alimentacao.tipo === "monofasico");
    const fases = [...new Set(g.circuitos.flatMap((x) => x.fases))].sort() as Fase[];
    const id = novoId("k");
    fila.push({ id, pecaId: `dr-${polos}p-${In}`, fases, circuitoId: null, geral: false, etiqueta: `DR ${i + 1}` });
    for (const x of g.circuitos) {
      comDR.add(x.c.id);
      drDoCircuito.set(x.c.id, id);
      const pj = dj.get(x.c.id);
      if (pj) fila.push({ id: novoId("k"), pecaId: pj.id, fases: x.fases, circuitoId: x.c.id, geral: false, etiqueta: "" });
    }
  });
  for (const c of circuitos.filter((c) => !comDR.has(c.id))) {
    const pj = dj.get(c.id);
    if (pj) fila.push({ id: novoId("k"), pecaId: pj.id, fases: fasesCirc.get(c.id) ?? [], circuitoId: c.id, geral: false, etiqueta: "" });
  }
  for (const c of circuitos) if (!dj.get(c.id)) alertas.push({ nivel: "erro", mensagem: `Sem disjuntor no catálogo para "${c.nome}".` });

  const circuitosFinais = circuitos.map((c) => ({ ...c, drId: drDoCircuito.get(c.id) ?? null }));
  const { modelo, componentes, aviso: avisoCaixa } = posicionar(fila, reservaMinima(circuitos.length), {
    caixaId: p.obra.caixaId,
    instalacao: p.obra.caixaInstalacao,
    material: p.obra.caixaMaterial,
    ip: p.obra.caixaIP,
  });
  if (avisoCaixa) alertas.push({ nivel: "aviso", mensagem: avisoCaixa });

  // Fases dos disjuntores na sequência do pente (montagem real), mantendo o equilíbrio.
  const montado = ajustarFasesAoPente({
    versao: VERSAO_QUADRO,
    alimentacao,
    modelo,
    componentes,
    circuitos: circuitosFinais,
    projeto: p,
    concessionaria: null,
    memorial: null,
    compras: [],
    inspecoes: [],
    laudo: null,
    art: null,
    manutencao: null,
    ligacoes: null,
    pontos: null,
  });
  return {
    dados: {
      versao: VERSAO_QUADRO,
      alimentacao,
      modelo,
      componentes: montado.componentes,
      circuitos: circuitosFinais,
      projeto: p,
      concessionaria: null,
      memorial: null,
      compras: [],
      inspecoes: [],
      laudo: null,
      art: null,
      manutencao: null,
      ligacoes: null,
      pontos: null,
    },
    demanda,
    alertas,
  };
}

function exigeDRLocal(c: Circuito) {
  const l = LOCAIS[c.local];
  if (l.molhado) return true;
  return (c.tipo === "tug" || c.tipo === "tue") && (l.externo || c.alimentaExterno);
}

export interface PreferenciaCaixa {
  /** Caixa fixa (catálogo DIN). Se não couber, cai na escolha automática com aviso. */
  caixaId?: string | null;
  instalacao?: "embutir" | "sobrepor";
  material?: "pvc" | "metalico";
  ip?: "IP40" | "IP54" | "IP65";
}

/**
 * Escolhe a menor caixa DIN do catálogo (respeitando instalação/material/IP preferidos)
 * em que tudo cabe com a reserva da NBR 5410 6.5.4.7, e posiciona as peças em sequência.
 * Sem caixa no catálogo, monta uma personalizada com trilhos de 24 módulos.
 */
export function posicionar(
  fila: Omit<Componente, "fileira" | "posicao">[],
  reserva: number,
  pref: PreferenciaCaixa = {},
): { modelo: ModeloQuadro; componentes: Componente[]; aviso?: string } {
  const larguras = fila.map((c) => modulosOcupados(peca(c.pecaId)!));
  const tentar = (fileiras: number, porFileira: number) => {
    const comps: Componente[] = [];
    let f = 0;
    let pos = 0;
    for (let i = 0; i < fila.length; i++) {
      const w = larguras[i];
      if (w > porFileira) return null;
      if (pos + w > porFileira) {
        f++;
        pos = 0;
      }
      if (f >= fileiras) return null;
      comps.push({ ...fila[i], fileira: f, posicao: pos });
      pos += w;
    }
    const usados = larguras.reduce((s, w) => s + w, 0);
    if (fileiras * porFileira - usados < reserva) return null;
    return comps;
  };
  let aviso: string | undefined;
  const fixa = caixaPorId(pref.caixaId);
  if (fixa && fixa.padrao === "DIN") {
    const comps = tentar(fixa.fileiras, fixa.modulosPorFileira);
    if (comps) return { modelo: modeloDaCaixa(fixa), componentes: comps };
    aviso = `A caixa escolhida (${fixa.nome}) não comporta as peças com a reserva da NBR 5410 6.5.4.7 — o app escolheu uma maior.`;
  } else if (fixa) {
    aviso = "Caixa NEMA não é usada pelo gerador automático (disjuntores DIN). O app escolheu uma caixa DIN — troque depois no construtor se quiser NEMA.";
  }
  const candidatas = (filtro: PreferenciaCaixa): Caixa[] =>
    filtrarCaixas({ padrao: "DIN", instalacao: filtro.instalacao, material: filtro.material, ip: filtro.ip });
  // Preferência completa → só instalação/material → qualquer DIN.
  for (const filtro of [pref, { instalacao: pref.instalacao, material: pref.material }, {}]) {
    for (const c of candidatas(filtro)) {
      const comps = tentar(c.fileiras, c.modulosPorFileira);
      if (comps) return { modelo: modeloDaCaixa(c), componentes: comps, aviso };
    }
  }
  for (let fileiras = 6; fileiras <= 10; fileiras++) {
    const comps = tentar(fileiras, 24);
    if (comps)
      return {
        modelo: {
          caixaId: null,
          fileiras,
          modulosPorFileira: 24,
          instalacao: "sobrepor",
          padrao: "DIN",
          material: "metalico",
          ip: pref.ip ?? "IP40",
          trilhoAux: 0,
          linha: "metal-7035",
          orientacao: null,
          saidaCabos: "baixo",
        },
        componentes: comps,
        aviso,
      };
  }
  const comps = tentar(10, 36) ?? [];
  return {
    modelo: {
      caixaId: null,
      fileiras: 10,
      modulosPorFileira: 36,
      instalacao: "sobrepor",
      padrao: "DIN",
      material: "metalico",
      ip: "IP40",
      trilhoAux: 0,
      linha: "metal-7035",
      orientacao: null,
      saidaCabos: "baixo",
    },
    componentes: comps,
  };
}

/** Verifica rapidamente se o quadro gerado ficou sem erros no motor. */
export function errosDoQuadro(q: QuadroDados) {
  const a = analisarQuadro(q);
  return [...a.alertas, ...a.circuitos.flatMap((r) => r.alertas)].filter((x) => x.nivel === "erro");
}

/** Projeto vazio para iniciar o assistente. */
export function projetoVazio(): ProjetoObra {
  return {
    obra: {
      tipoImovel: "casa",
      // Região do usuário: Belém/Ananindeua/Salinópolis (PA).
      concessionaria: "equatorial-pa",
      tensoes: "127/220",
      esquema: "TN-C-S",
      fornecimentoExistente: "desconhecido",
      disjuntorExistenteA: null,
      entradaAerea: true,
      metodo: "B1",
      agrupamento: 1,
      drEmTodos: true,
      observacoes: "",
      caixaInstalacao: "embutir",
      caixaMaterial: "pvc",
      caixaIP: "IP40",
      caixaId: null,
    },
    ambientes: [],
    cargas: [],
  };
}

export { concessionaria };
