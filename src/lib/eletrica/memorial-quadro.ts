/**
 * Monta os dados do memorial descritivo (formato Equatorial PA — src/lib/normas/equatorial-pa/memorial.ts)
 * a partir do quadro: circuitos já calculados pelo motor, padrão de entrada oficial, cliente e perfil.
 * Todos os números vêm daqui; a IA só redige os trechos marcados (descrição, critérios, considerações).
 */
import type { DadosMemorial, QuadroMemorial } from "../normas/equatorial-pa";
import type { AnaliseQuadro } from "./calculo";
import { peca } from "./pecas";
import type { Demanda } from "./projeto";
import type { QuadroDados } from "./tipos";

export type PessoaMemorial = { nome: string; documento?: string; endereco?: string; bairro?: string; cidade?: string } | null;
export type ResponsavelMemorial = {
  nome: string;
  empresa?: string;
  registroProfissional?: string;
  telefone?: string;
  email?: string;
};

const GERACAO = /solar|fotovolt|inversor|microgera|minigera/i;
const RECARGA_VE = /ve[íi]culo el[ée]tric|carregador.*(carro|ve[íi]culo|ve\b)|wallbox|recarga/i;

/** Há geração própria (solar) entre os circuitos/cargas? Exige o formato da NT.00020. */
export function temGeracao(dados: QuadroDados) {
  return dados.circuitos.some((c) => GERACAO.test(c.nome)) || !!dados.projeto?.cargas.some((c) => GERACAO.test(c.nome));
}

/** Carregador de veículo elétrico acima de 7,4 kW? Exige projeto (NT.00042 item 5.2.3). */
export function temRecargaVEAcima74(dados: QuadroDados) {
  return dados.circuitos.some((c) => RECARGA_VE.test(c.nome) && c.potenciaW > 7400);
}

export function dadosMemorialDoQuadro(args: {
  nome: string;
  dados: QuadroDados;
  analise: AnaliseQuadro;
  demanda: Demanda;
  cliente: PessoaMemorial;
  responsavel: ResponsavelMemorial;
  art?: string;
}): DadosMemorial | null {
  const { nome, dados, analise, demanda, cliente, responsavel } = args;
  const eq = demanda.equatorial;
  if (!eq) return null;

  const drs = dados.componentes.filter((c) => peca(c.pecaId)?.tipo === "dr");
  const rotuloDR = new Map(
    drs.map((c, i) => {
      const p = peca(c.pecaId);
      return [c.id, `${c.etiqueta || `DR ${i + 1}`}${p ? ` (${p.rotulo})` : ""}`];
    }),
  );
  const drGeral = drs.find((c) => c.geral);
  const dps = dados.componentes.filter((c) => peca(c.pecaId)?.tipo === "dps");
  const geral = dados.componentes.find((c) => c.geral && peca(c.pecaId)?.tipo === "disjuntor");
  const pGeral = geral ? peca(geral.pecaId) : undefined;
  const pDps = dps[0] ? peca(dps[0].pecaId) : undefined;

  const quadro: QuadroMemorial = {
    nome,
    disjuntorGeral: pGeral ? `${pGeral.polos}P ${pGeral.rotulo} (${pGeral.correnteNominal} A)` : undefined,
    drs: drs.map((c) => {
      const p = peca(c.pecaId);
      return `${rotuloDR.get(c.id)}${p?.descricao ? ` — ${p.descricao}` : ""}`;
    }),
    dps: pDps ? `${dps.length} × ${pDps.nome}${pDps.ucV ? ` (Uc ${pDps.ucV} V)` : ""}` : undefined,
    circuitos: analise.circuitos.map((r, i) => {
      const drId = r.circuito.drId;
      return {
        numero: i + 1,
        descricao: r.circuito.nome,
        potenciaW: r.circuito.potenciaW,
        tensaoV: r.tensaoV,
        secaoMm2: r.dim.secao ?? null,
        disjuntor: r.pecaDisjuntor ? `${r.pecaDisjuntor.polos}P ${r.pecaDisjuntor.rotulo}` : "—",
        dr: drId ? (rotuloDR.get(drId) ?? "DR") : drGeral ? (rotuloDR.get(drGeral.id) ?? "Geral") : "",
        fase: r.fases.join("+") || "—",
      };
    }),
  };

  const obra = dados.projeto?.obra;
  const endereco = cliente ? [cliente.endereco, cliente.bairro].filter(Boolean).join(", ") : "";
  return {
    obra: {
      titulo: nome,
      endereco: endereco || "",
      cidade: cliente?.cidade || undefined,
    },
    cliente: { nome: cliente?.nome || "—", documento: cliente?.documento || undefined },
    responsavel: {
      nome: responsavel.nome || responsavel.empresa || "Responsável técnico",
      registro: responsavel.registroProfissional || undefined,
      telefone: responsavel.telefone || undefined,
      email: responsavel.email || undefined,
      art: args.art || undefined,
    },
    categoria: eq.categoria,
    demanda: eq.demanda,
    quadros: [quadro],
    esquemaAterramento: `${dados.alimentacao.esquema}${obra?.esquema === "TN-C-S" || dados.alimentacao.esquema === "TN-C-S" ? " — neutro aterrado no padrão de entrada; N e PE separados a partir do QDC" : ""}`,
    temGeracao: temGeracao(dados),
    temRecargaVE: temRecargaVEAcima74(dados),
  };
}
