/**
 * Ponte entre os circuitos do quadro e as regras oficiais da Equatorial Pará
 * (NT.00001 rev. 09 — src/lib/normas/equatorial-pa). O padrão de entrada é
 * dimensionado pela CARGA INSTALADA (Tabela 2); a demanda é estimativa auxiliar.
 */
import {
  type CargaEquatorial,
  calcularDemandaEquatorial,
  categoriaAtendimento,
  type Equipamento,
  type ResultadoCategoria,
  type ResultadoDemanda,
} from "../normas/equatorial-pa";
import type { Circuito, QuadroDados } from "./tipos";

export const ID_EQUATORIAL_PA = "equatorial-pa";

/**
 * Concessionária efetiva do quadro: a da obra (assistente de projeto) ou a escolhida no
 * quadro montado do zero. Sem informação, assume a Equatorial Pará (área de atuação do usuário).
 */
export function concessionariaDoQuadro(q: Pick<QuadroDados, "projeto" | "concessionaria">) {
  return q.projeto?.obra.concessionaria ?? q.concessionaria ?? ID_EQUATORIAL_PA;
}

const AR = /ar-?condicionado|\bsplit\b|btu/i;
const MOTOR = /motor|bomba|port[aã]o|compressor|betoneira|elevador|exaustor/i;

/** Cargas no formato da calculadora da Equatorial (iluminação/TUG agrupadas, TUE por circuito). */
export function cargasEquatorial(circuitos: Circuito[]): CargaEquatorial[] {
  return circuitos
    .filter((c) => c.potenciaW > 0)
    .map((c) => ({
      descricao: c.nome,
      quantidade: 1,
      potenciaW: c.potenciaW,
      categoria:
        c.tipo !== "tue" ? "iluminacao_tomadas" : AR.test(c.nome) ? "ar_condicionado" : MOTOR.test(c.nome) ? "motor" : "aparelho",
    }));
}

/** Equipamentos individuais (TUE) para as restrições de cada tipo de ligação (6.2.1). */
export function equipamentosEquatorial(circuitos: Circuito[]): Equipamento[] {
  return circuitos
    .filter((c) => c.tipo === "tue" && c.potenciaW > 0)
    .map((c) => {
      const motor = MOTOR.test(c.nome) && !AR.test(c.nome);
      return {
        descricao: c.nome,
        tipo: motor ? "motor" : "aparelho",
        fases: c.ligacao === "3F" ? 3 : c.ligacao === "FF" ? 2 : 1,
        kva: c.potenciaW / 1000 / (c.fatorPotencia || 1),
        cv: motor ? c.potenciaW / 736 : undefined,
      };
    });
}

export interface PadraoEquatorial {
  demanda: ResultadoDemanda;
  categoria: ResultadoCategoria;
}

/** Enquadramento oficial (Equatorial PA) a partir dos circuitos do quadro. */
export function padraoEquatorial(circuitos: Circuito[]): PadraoEquatorial {
  const cargas = cargasEquatorial(circuitos);
  const equipamentos = equipamentosEquatorial(circuitos);
  let demanda = calcularDemandaEquatorial(cargas, 1);
  let categoria = categoriaAtendimento(demanda.cargaInstaladaKW, demanda.demandaKVA, equipamentos);
  // Premissa da Tabela 2 (Nota 23): trifásico com FP 0,92.
  if (categoria.tipo === "trifasico" || categoria.tipo === "media_tensao") {
    demanda = calcularDemandaEquatorial(cargas, 0.92);
    categoria = categoriaAtendimento(demanda.cargaInstaladaKW, demanda.demandaKVA, equipamentos);
  }
  return { demanda, categoria };
}

/** Seção da fase do condutor do cliente na Tabela 2 ("10(10)" → 10). */
export function secaoFaseCliente(condutor: string) {
  const n = Number.parseFloat(condutor);
  return Number.isFinite(n) ? n : null;
}
