/**
 * Motor de dimensionamento segundo a ABNT NBR 5410:2004 (versão corrigida 2008).
 * Funções puras — sem acesso a banco ou UI — para poderem ser testadas e
 * reaproveitadas pelo construtor de quadros e pelas calculadoras.
 */
import {
  capacidadeTabela36,
  CORRENTES_NOMINAIS,
  fatorAgrupamento,
  fatorTemperatura,
  type Metodo,
  QUEDA_MAX_TERMINAL,
  reservaMinima,
  RHO_COBRE_70,
  SECAO_MINIMA,
  SECOES,
} from "./tabelas";
import { modulosOcupados, peca, type Peca } from "./pecas";
import {
  type Alimentacao,
  type Circuito,
  type Componente,
  type Fase,
  fasesDisponiveis,
  type Ligacao,
  LOCAIS,
  type QuadroDados,
  type TipoCircuito,
} from "./tipos";

export type Nivel = "erro" | "aviso" | "ok" | "info";

export interface Alerta {
  nivel: Nivel;
  mensagem: string;
  referencia?: string;
}

// ---------------------------------------------------------------------------
// Grandezas básicas
// ---------------------------------------------------------------------------

/** Tensão aplicada ao circuito conforme a ligação. */
export function tensaoDoCircuito(ligacao: Ligacao, a: Pick<Alimentacao, "tensaoFN" | "tensaoFF">) {
  return ligacao === "FN" ? a.tensaoFN : a.tensaoFF;
}

/** Nº de condutores carregados (Tabela 46): F-N e F-F = 2; trifásico equilibrado = 3. */
export function condutoresCarregados(ligacao: Ligacao): 2 | 3 {
  return ligacao === "3F" ? 3 : 2;
}

/** Corrente de projeto Ib (A). Monofásico: P/(V·FP). Trifásico: P/(√3·V·FP), V = tensão de linha. */
export function correnteProjeto(potenciaW: number, tensaoV: number, fatorPotencia: number, ligacao: Ligacao) {
  if (potenciaW <= 0 || tensaoV <= 0) return 0;
  const fp = fatorPotencia > 0 ? fatorPotencia : 1;
  const k = ligacao === "3F" ? Math.sqrt(3) : 1;
  return potenciaW / (k * tensaoV * fp);
}

/** Potência (W) a partir da corrente — inverso de `correnteProjeto`. */
export function potenciaDaCorrente(correnteA: number, tensaoV: number, fatorPotencia: number, ligacao: Ligacao) {
  const k = ligacao === "3F" ? Math.sqrt(3) : 1;
  return correnteA * k * tensaoV * (fatorPotencia > 0 ? fatorPotencia : 1);
}

/** Capacidade de condução corrigida Iz = I(Tabela 36) × FCT (Tabela 40) × FCA (Tabela 42). */
export function capacidadeCorrigida(
  secao: number,
  metodo: Metodo,
  carregados: 2 | 3,
  temperaturaC = 30,
  agrupados = 1,
) {
  const base = capacidadeTabela36(secao, metodo, carregados);
  if (base === undefined) return 0;
  return base * fatorTemperatura(temperaturaC, metodo) * fatorAgrupamento(agrupados);
}

/**
 * Queda de tensão percentual (método simplificado, só resistência).
 * Monofásico (F-N ou F-F): ΔV = 2·ρ·L·I / S.  Trifásico: ΔV = √3·ρ·L·I / S.
 * ρ do cobre a 70 °C. Desprezar a reatância e o cos φ é conservador para
 * seções até ~35 mm² (típicas de instalações prediais).
 */
export function quedaTensaoPct(
  correnteA: number,
  comprimentoM: number,
  secaoMm2: number,
  tensaoV: number,
  ligacao: Ligacao,
) {
  if (secaoMm2 <= 0 || tensaoV <= 0) return 0;
  const k = ligacao === "3F" ? Math.sqrt(3) : 2;
  const dv = (k * RHO_COBRE_70 * comprimentoM * correnteA) / secaoMm2;
  return (dv / tensaoV) * 100;
}

/** Menor corrente nominal comercial ≥ Ib. */
export function disjuntorMinimo(ib: number) {
  return CORRENTES_NOMINAIS.find((i) => i >= ib);
}

export function secaoMinima(tipo: TipoCircuito) {
  return SECAO_MINIMA[tipo];
}

// ---------------------------------------------------------------------------
// Dimensionamento de um circuito (independente do quadro)
// ---------------------------------------------------------------------------

export interface EntradaDimensionamento {
  tipo: TipoCircuito;
  potenciaW: number;
  fatorPotencia: number;
  ligacao: Ligacao;
  tensaoV: number;
  comprimentoM: number;
  metodo: Metodo;
  temperaturaC: number;
  circuitosAgrupados: number;
  quedaMaxPct?: number;
  /** Seção já instalada/escolhida — se informada, é verificada em vez de calculada. */
  secaoAdotada?: number | null;
}

export interface Dimensionamento {
  ib: number;
  carregados: 2 | 3;
  fct: number;
  fca: number;
  secaoMinima: number;
  /** Menor seção cujo Iz comporta o disjuntor escolhido (critério de capacidade). */
  secaoCapacidade: number | null;
  /** Menor seção que atende a queda de tensão máxima. */
  secaoQueda: number | null;
  /** Maior entre os três critérios (ou a adotada, se informada). */
  secao: number | null;
  iz: number;
  disjuntor: number | null;
  quedaPct: number;
  alertas: Alerta[];
}

export function dimensionar(e: EntradaDimensionamento): Dimensionamento {
  const alertas: Alerta[] = [];
  const carregados = condutoresCarregados(e.ligacao);
  const ib = correnteProjeto(e.potenciaW, e.tensaoV, e.fatorPotencia, e.ligacao);
  const fct = fatorTemperatura(e.temperaturaC, e.metodo);
  const fca = fatorAgrupamento(e.circuitosAgrupados);
  const quedaMax = e.quedaMaxPct ?? QUEDA_MAX_TERMINAL;
  const minima = secaoMinima(e.tipo);

  if (fct === 0) {
    alertas.push({
      nivel: "erro",
      mensagem: `Temperatura de ${e.temperaturaC} °C acima do limite da tabela para PVC. Use cabo com isolação EPR/XLPE (90 °C).`,
      referencia: "NBR 5410 Tabela 40",
    });
  }

  const disjuntor = disjuntorMinimo(ib) ?? null;
  if (disjuntor === null) {
    alertas.push({
      nivel: "erro",
      mensagem: `Corrente de projeto ${ib.toFixed(1)} A acima do maior disjuntor DIN do catálogo (125 A). Divida o circuito ou use disjuntor em caixa moldada.`,
    });
  }

  // Critério da capacidade de condução coordenado com a proteção: Iz ≥ In (≥ Ib).
  const alvo = disjuntor ?? ib;
  const secaoCapacidade =
    SECOES.find((s) => capacidadeCorrigida(s, e.metodo, carregados, e.temperaturaC, e.circuitosAgrupados) >= alvo) ??
    null;

  const secaoQueda =
    e.comprimentoM > 0
      ? (SECOES.find((s) => quedaTensaoPct(ib, e.comprimentoM, s, e.tensaoV, e.ligacao) <= quedaMax) ?? null)
      : minima;

  let secao: number | null =
    secaoCapacidade === null || secaoQueda === null ? null : Math.max(minima, secaoCapacidade, secaoQueda);

  if (secaoCapacidade === null) {
    alertas.push({
      nivel: "erro",
      mensagem: "Nenhuma seção até 120 mm² atende a corrente com estes fatores de correção.",
      referencia: "NBR 5410 6.2.5",
    });
  }
  if (secaoQueda === null) {
    alertas.push({
      nivel: "erro",
      mensagem: `Mesmo com 120 mm² a queda de tensão passa de ${quedaMax}%. Reduza o comprimento ou eleve a tensão.`,
      referencia: "NBR 5410 6.2.7",
    });
  }

  if (e.secaoAdotada) {
    const s = e.secaoAdotada;
    if (s < minima) {
      alertas.push({
        nivel: "erro",
        mensagem: `Seção adotada ${fmt(s)} mm² abaixo da mínima de ${fmt(minima)} mm² para este tipo de circuito.`,
        referencia: "NBR 5410 6.2.6 / Tabela 47",
      });
    }
    if (secao !== null && s < secao) {
      alertas.push({
        nivel: "erro",
        mensagem: `Seção adotada ${fmt(s)} mm² é menor que a necessária (${fmt(secao)} mm²).`,
        referencia: "NBR 5410 6.2.5 / 6.2.7",
      });
    }
    secao = s;
  }

  const iz = secao ? capacidadeCorrigida(secao, e.metodo, carregados, e.temperaturaC, e.circuitosAgrupados) : 0;
  const quedaPct = secao ? quedaTensaoPct(ib, e.comprimentoM, secao, e.tensaoV, e.ligacao) : 0;

  if (secao && quedaPct > quedaMax) {
    alertas.push({
      nivel: "erro",
      mensagem: `Queda de tensão de ${quedaPct.toFixed(2)}% acima do máximo de ${quedaMax}% para circuito terminal.`,
      referencia: "NBR 5410 6.2.7.2",
    });
  }

  if (e.circuitosAgrupados > 1) {
    alertas.push({
      nivel: "info",
      mensagem: `Fator de agrupamento ${fca.toFixed(2)} aplicado (${e.circuitosAgrupados} circuitos no mesmo eletroduto).`,
      referencia: "NBR 5410 Tabela 42",
    });
  }
  if (e.metodo === "D" && e.circuitosAgrupados > 1) {
    alertas.push({
      nivel: "aviso",
      mensagem:
        "Para cabos enterrados a norma usa fatores próprios de agrupamento (Tabelas 44 e 45); aqui foi usada a Tabela 42 como aproximação — conferir na edição vigente.",
      referencia: "NBR 5410 Tabelas 44/45",
    });
  }

  return {
    ib,
    carregados,
    fct,
    fca,
    secaoMinima: minima,
    secaoCapacidade,
    secaoQueda,
    secao,
    iz,
    disjuntor,
    quedaPct,
    alertas,
  };
}

// ---------------------------------------------------------------------------
// Análise completa do quadro
// ---------------------------------------------------------------------------

export interface ResultadoCircuito {
  circuito: Circuito;
  tensaoV: number;
  dim: Dimensionamento;
  /** Disjuntor do quadro vinculado a este circuito. */
  componente?: Componente;
  pecaDisjuntor?: Peca;
  /** Está protegido por DR (próprio, vinculado ou geral)? */
  temDR: boolean;
  exigeDR: boolean;
  fases: Fase[];
  alertas: Alerta[];
  status: Nivel;
}

export interface AnaliseQuadro {
  circuitos: ResultadoCircuito[];
  /** Corrente somada em cada fase (sem fator de demanda). */
  correntePorFase: Record<Fase, number>;
  desequilibrioPct: number;
  potenciaTotalW: number;
  modulosTotais: number;
  modulosUsados: number;
  modulosLivres: number;
  reservaExigida: number;
  alertas: Alerta[];
  status: Nivel;
}

const ORDEM: Record<Nivel, number> = { erro: 3, aviso: 2, info: 1, ok: 0 };
export function piorNivel(alertas: Alerta[]): Nivel {
  return alertas.reduce<Nivel>(
    (pior, a) => (ORDEM[a.nivel] > ORDEM[pior] && a.nivel !== "info" ? a.nivel : pior),
    "ok",
  );
}

/** DR obrigatório? (NBR 5410 5.1.3.2.2) */
export function exigeDR(c: Pick<Circuito, "local" | "tipo" | "alimentaExterno">) {
  const local = LOCAIS[c.local];
  if (local.molhado) return true;
  const tomada = c.tipo === "tug" || c.tipo === "tue";
  if (tomada && (local.externo || c.alimentaExterno)) return true;
  return false;
}

function motivoDR(c: Pick<Circuito, "local" | "tipo" | "alimentaExterno">) {
  const local = LOCAIS[c.local];
  if (c.local === "banheiro") return "local com banheira ou chuveiro (alínea a)";
  if (local.molhado) return `${local.nome.toLowerCase()} — área molhada/sujeita a lavagem (alínea d)`;
  if (local.externo) return "tomada em área externa (alínea b)";
  return "tomada interna que pode alimentar equipamento no exterior (alínea c)";
}

export function analisarQuadro(q: QuadroDados): AnaliseQuadro {
  const a = q.alimentacao;
  const disponiveis = fasesDisponiveis(a);
  const componentes = q.componentes.map((c) => ({ c, p: peca(c.pecaId) }));
  const drGeral = componentes.find((x) => x.p?.tipo === "dr" && x.c.geral);
  const drs = new Map(componentes.filter((x) => x.p?.tipo === "dr").map((x) => [x.c.id, x]));

  const resultados: ResultadoCircuito[] = q.circuitos.map((circ) => {
    const alertas: Alerta[] = [];
    const tensaoV = tensaoDoCircuito(circ.ligacao, a);
    const dim = dimensionar({
      tipo: circ.tipo,
      potenciaW: circ.potenciaW,
      fatorPotencia: circ.fatorPotencia,
      ligacao: circ.ligacao,
      tensaoV,
      comprimentoM: circ.comprimentoM,
      metodo: circ.metodo,
      temperaturaC: circ.temperaturaC,
      circuitosAgrupados: circ.circuitosAgrupados,
      secaoAdotada: circ.secaoAdotada,
    });
    alertas.push(...dim.alertas);

    // Ligação compatível com a alimentação
    if (circ.ligacao === "FF" && disponiveis.length < 2) {
      alertas.push({ nivel: "erro", mensagem: "Circuito fase-fase em fornecimento monofásico." });
    }
    if (circ.ligacao === "3F" && disponiveis.length < 3) {
      alertas.push({ nivel: "erro", mensagem: "Circuito trifásico exige fornecimento trifásico." });
    }

    // Disjuntor vinculado
    const vinc = componentes.find((x) => x.c.circuitoId === circ.id && x.p?.tipo === "disjuntor");
    const pecaDj = vinc?.p;
    let fases: Fase[] = vinc?.c.fases.length ? vinc.c.fases : [];
    if (!vinc || !pecaDj) {
      alertas.push({ nivel: "erro", mensagem: "Circuito sem disjuntor no quadro. Toque numa posição livre e vincule um disjuntor." });
    } else {
      const polosEsperados = circ.ligacao === "FN" ? 1 : circ.ligacao === "FF" ? 2 : 3;
      if (pecaDj.polos !== polosEsperados) {
        alertas.push({
          nivel: "erro",
          mensagem: `Ligação ${circ.ligacao === "FN" ? "fase-neutro" : circ.ligacao === "FF" ? "fase-fase" : "trifásica"} pede disjuntor ${polosEsperados}P, mas o instalado é ${pecaDj.polos}P.`,
        });
      }
      const In = pecaDj.correnteNominal ?? 0;
      if (In < dim.ib) {
        alertas.push({
          nivel: "erro",
          mensagem: `Disjuntor ${pecaDj.rotulo} (${In} A) menor que a corrente de projeto ${dim.ib.toFixed(1)} A — vai desarmar.`,
          referencia: "NBR 5410 5.3.4.1 (Ib ≤ In)",
        });
      }
      if (dim.iz > 0 && In > dim.iz) {
        alertas.push({
          nivel: "erro",
          mensagem: `Disjuntor ${pecaDj.rotulo} (${In} A) maior que a capacidade do cabo ${fmt(dim.secao ?? 0)} mm² (Iz = ${dim.iz.toFixed(1)} A) — o cabo não fica protegido.`,
          referencia: "NBR 5410 5.3.4.1 (In ≤ Iz)",
        });
      }
      if (circ.tipo === "tue" && pecaDj.curva === "B" && circ.fatorPotencia < 0.95) {
        alertas.push({
          nivel: "aviso",
          mensagem: "Carga com motor/compressor (FP < 0,95) em curva B pode desarmar na partida. Considere curva C.",
        });
      }
      if (fases.length !== pecaDj.polos) {
        alertas.push({ nivel: "aviso", mensagem: "Defina em quais fases o disjuntor está ligado (balanceamento)." });
      }
      if (fases.some((f) => !disponiveis.includes(f))) {
        alertas.push({ nivel: "erro", mensagem: `Disjuntor ligado em fase inexistente neste fornecimento (${a.tipo}).` });
        fases = fases.filter((f) => disponiveis.includes(f));
      }
    }

    // DR
    const precisaDR = exigeDR(circ);
    const drProprio = circ.drId ? drs.get(circ.drId) : undefined;
    const temDR = Boolean(drProprio || drGeral);
    if (precisaDR && !temDR) {
      alertas.push({
        nivel: "erro",
        mensagem: `DR de 30 mA obrigatório: ${motivoDR(circ)}.`,
        referencia: "NBR 5410 5.1.3.2.2",
      });
    }
    if (precisaDR && circ.local === "banheiro" && circ.tipo === "iluminacao" && !temDR) {
      alertas.push({
        nivel: "info",
        mensagem: "A norma admite excluir do DR a iluminação instalada a 2,5 m ou mais de altura no banheiro — conferir nota da edição vigente.",
        referencia: "NBR 5410 5.1.3.2.2 (nota)",
      });
    }
    if (drProprio?.p && pecaDj?.correnteNominal && (drProprio.p.correnteNominal ?? 0) < pecaDj.correnteNominal) {
      alertas.push({
        nivel: "aviso",
        mensagem: `DR de ${drProprio.p.correnteNominal} A protegendo disjuntor de ${pecaDj.correnteNominal} A. A corrente nominal do DR deve ser ≥ à do disjuntor associado.`,
        referencia: "Coordenação DR × disjuntor (catálogo do fabricante)",
      });
    }

    // Circuito independente para equipamentos > 10 A
    if (circ.tipo === "tug" && dim.ib > 10 && circ.quantidadePontos <= 1) {
      alertas.push({
        nivel: "aviso",
        mensagem: `Ponto com ${dim.ib.toFixed(1)} A (> 10 A): classifique como TUE em circuito independente.`,
        referencia: "NBR 5410 9.5.3.1",
      });
    }
    if (circ.tipo === "tue" && circ.quantidadePontos > 1) {
      alertas.push({
        nivel: "aviso",
        mensagem: "Equipamento acima de 10 A deve ter circuito exclusivo — evite vários pontos de uso específico no mesmo circuito.",
        referencia: "NBR 5410 9.5.3.1",
      });
    }
    if (circ.potenciaW <= 0) {
      alertas.push({ nivel: "aviso", mensagem: "Informe a potência do circuito." });
    }

    return {
      circuito: circ,
      tensaoV,
      dim,
      componente: vinc?.c,
      pecaDisjuntor: pecaDj,
      temDR,
      exigeDR: precisaDR,
      fases,
      alertas,
      status: piorNivel(alertas),
    };
  });

  // Corrente por fase
  const correntePorFase: Record<Fase, number> = { R: 0, S: 0, T: 0 };
  for (const r of resultados) for (const f of r.fases) correntePorFase[f] += r.dim.ib;
  const valores = disponiveis.map((f) => correntePorFase[f]);
  const max = Math.max(0, ...valores);
  const min = Math.min(...valores);
  const desequilibrioPct = disponiveis.length > 1 && max > 0 ? ((max - min) / max) * 100 : 0;

  const potenciaTotalW = q.circuitos.reduce((s, c) => s + c.potenciaW, 0);

  // Ocupação do trilho
  const modulosTotais = q.modelo.fileiras * q.modelo.modulosPorFileira;
  const modulosUsados = componentes.reduce((s, x) => s + (x.p ? modulosOcupados(x.p) : 0), 0);
  const modulosLivres = Math.max(0, modulosTotais - modulosUsados);
  const reservaExigida = reservaMinima(q.circuitos.length);

  const alertas: Alerta[] = [];
  const geral = componentes.find((x) => x.c.geral && (x.p?.tipo === "disjuntor" || x.p?.tipo === "seccionadora"));
  if (!geral) {
    alertas.push({
      nivel: "aviso",
      mensagem: "Sem disjuntor geral marcado no quadro. Adicione um e marque como \"geral\" para permitir seccionar tudo.",
      referencia: "NBR 5410 5.6 (seccionamento)",
    });
  } else if (geral.p?.correnteNominal) {
    const maiorFase = max;
    if (maiorFase > geral.p.correnteNominal) {
      alertas.push({
        nivel: "aviso",
        mensagem: `Soma das correntes na fase mais carregada (${maiorFase.toFixed(1)} A) passa do geral (${geral.p.correnteNominal} A). Normal se houver fator de demanda — confira o cálculo de demanda e o padrão da concessionária.`,
      });
    }
  }

  const temDPS = componentes.some((x) => x.p?.tipo === "dps");
  if (!temDPS) {
    alertas.push({
      nivel: "aviso",
      mensagem: "Nenhum DPS no quadro. É exigido quando a entrada é por linha aérea ou há SPDA, e recomendado em toda instalação residencial.",
      referencia: "NBR 5410 5.4.2.1 / 6.3.5 (conferir na edição vigente)",
    });
  } else {
    const dpsList = componentes.filter((x) => x.p?.tipo === "dps");
    const ucMin = 1.1 * a.tensaoFN;
    for (const d of dpsList) {
      if (d.p?.ucV && d.p.ucV < ucMin) {
        alertas.push({
          nivel: "erro",
          mensagem: `DPS com Uc ${d.p.ucV} V abaixo do mínimo ≈ ${Math.ceil(ucMin)} V (1,1 × ${a.tensaoFN} V) — vai queimar em operação normal.`,
          referencia: "NBR 5410 6.3.5.2 — Uc mínimo (conferir na edição vigente)",
        });
        break;
      }
    }
    const esperados = disponiveis.length + (a.esquema === "TN-C-S" ? 0 : 1);
    if (dpsList.length < esperados) {
      alertas.push({
        nivel: "aviso",
        mensagem: `Há ${dpsList.length} DPS; para ${a.tipo} em ${a.esquema} o usual é ${esperados} (um por fase${a.esquema === "TN-C-S" ? "" : " + um entre neutro e terra"}).`,
        referencia: "NBR 5410 6.3.5",
      });
    }
  }

  const precisam = resultados.filter((r) => r.exigeDR && !r.temDR).length;
  if (precisam > 0) {
    alertas.push({
      nivel: "erro",
      mensagem: `${precisam} circuito(s) exigem DR e estão sem proteção diferencial.`,
      referencia: "NBR 5410 5.1.3.2.2",
    });
  }

  if (q.circuitos.length > 0 && modulosLivres < reservaExigida) {
    alertas.push({
      nivel: "aviso",
      mensagem: `Espaço reserva insuficiente: ${modulosLivres} módulo(s) livre(s), a norma pede ${reservaExigida} para ${q.circuitos.length} circuito(s).`,
      referencia: "NBR 5410 6.5.4.7 / Tabela 59",
    });
  }

  if (disponiveis.length > 1 && max > 0 && desequilibrioPct > 20) {
    alertas.push({
      nivel: "aviso",
      mensagem: `Fases desequilibradas (${desequilibrioPct.toFixed(0)}%). Redistribua circuitos entre as fases — boa prática e exigência comum das concessionárias.`,
    });
  }

  const orfaos = componentes.filter((x) => x.p?.tipo === "disjuntor" && !x.c.geral && !x.c.circuitoId);
  if (orfaos.length > 0) {
    alertas.push({ nivel: "info", mensagem: `${orfaos.length} disjuntor(es) sem circuito vinculado.` });
  }
  if (componentes.some((x) => !x.p)) {
    alertas.push({ nivel: "aviso", mensagem: "Há peças desconhecidas no quadro (catálogo mudou?)." });
  }

  const todos = [...alertas, ...resultados.flatMap((r) => r.alertas)];
  return {
    circuitos: resultados,
    correntePorFase,
    desequilibrioPct,
    potenciaTotalW,
    modulosTotais,
    modulosUsados,
    modulosLivres,
    reservaExigida,
    alertas,
    status: piorNivel(todos),
  };
}

// ---------------------------------------------------------------------------
// Lista de materiais
// ---------------------------------------------------------------------------

export interface ItemMaterial {
  descricao: string;
  quantidade: number;
  unidade: string;
}

/** Seção do condutor de proteção (Tabela 58): igual à fase até 16 mm²; 16 até 35; S/2 acima. */
export function secaoProtecao(secaoFase: number) {
  if (secaoFase <= 16) return secaoFase;
  if (secaoFase <= 35) return 16;
  return SECOES.find((s) => s >= secaoFase / 2) ?? secaoFase / 2;
}

/**
 * Gera a lista de materiais do quadro: peças, acessórios e cabos (por seção),
 * com 10% de folga nos cabos. Condutores por ligação: F-N = fase + neutro + PE;
 * F-F = 2 fases + PE; trifásico = 3 fases + neutro + PE.
 */
export function listaMateriais(q: QuadroDados, analise = analisarQuadro(q)): ItemMaterial[] {
  const itens: ItemMaterial[] = [];
  const contagem = new Map<string, number>();
  for (const c of q.componentes) contagem.set(c.pecaId, (contagem.get(c.pecaId) ?? 0) + 1);
  for (const [id, n] of contagem) {
    const p = peca(id);
    if (p) itens.push({ descricao: p.nome, quantidade: n, unidade: "un" });
  }

  const totalMod = q.modelo.fileiras * q.modelo.modulosPorFileira;
  itens.push({
    descricao: `Quadro de distribuição de ${q.modelo.instalacao} — ${totalMod} módulos DIN`,
    quantidade: 1,
    unidade: "un",
  });
  itens.push({ descricao: "Barramento pente (por fileira)", quantidade: q.modelo.fileiras, unidade: "un" });
  itens.push({ descricao: "Barra de neutro isolada (azul)", quantidade: 1, unidade: "un" });
  itens.push({ descricao: "Barra de terra/PE (verde)", quantidade: 1, unidade: "un" });
  if (analise.modulosLivres > 0) {
    itens.push({ descricao: "Tampa cega (módulo livre)", quantidade: analise.modulosLivres, unidade: "un" });
  }

  const cabos = new Map<string, number>();
  const somar = (secao: number, cor: string, metros: number) => {
    const chave = `Cabo flexível ${fmt(secao)} mm² 750 V — ${cor}`;
    cabos.set(chave, (cabos.get(chave) ?? 0) + metros);
  };
  for (const r of analise.circuitos) {
    const s = r.dim.secao;
    const L = r.circuito.comprimentoM;
    if (!s || L <= 0) continue;
    const fases = r.circuito.ligacao === "FN" ? 1 : r.circuito.ligacao === "FF" ? 2 : 3;
    somar(s, "fase (preto/vermelho/branco)", fases * L);
    if (r.circuito.ligacao !== "FF") somar(s, "neutro (azul claro)", L);
    somar(secaoProtecao(s), "proteção PE (verde-amarelo)", L);
  }
  for (const [descricao, m] of [...cabos].sort()) {
    itens.push({ descricao, quantidade: Math.ceil(m * 1.1), unidade: "m" });
  }
  return itens;
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}

export { fasesDisponiveis };
