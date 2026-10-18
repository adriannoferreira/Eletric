/**
 * Memorial descritivo da instalação no formato pedido pela Equatorial.
 *
 * O que a Equatorial PA exige (com citação):
 * - UC individual atendida em baixa tensão NÃO apresenta projeto à Equatorial (NT.00001 rev. 09, item 5.2).
 *   O memorial serve então ao cliente, à ART/TRT e ao arquivo técnico do eletricista.
 * - Com micro/minigeração (GD) o memorial é obrigatório e deve seguir a NT.00020 rev. 06, item 5.13.2 f
 *   (e o modelo do Anexo III); documentos assinados e digitalizados pelo responsável técnico,
 *   até 5 MB, desenhos em CAD/PDF nos formatos A0 a A4 (item 5.13.1).
 * - Recarga de VE acima de 7,4 kW em UC individual exige projeto (NT.00042 rev. 04, item 5.2.3).
 */
import type { ResultadoDemanda } from "./demanda";
import { ROTULO_LIGACAO, type ResultadoCategoria } from "./fornecimento";
import { NORMAS, ref } from "./normas";
import { ROTULO_MONTAGEM, type Montagem } from "./padrao";

export const EXIGENCIAS_DOCUMENTOS = [
  { texto: "UC individual em baixa tensão: não é apresentado projeto à Equatorial.", ref: ref("NT.00001", "item 5.2") },
  { texto: "Com geração distribuída: apresentar projeto conforme a NT.00020 (ou NT.00009 para geração própria).", ref: ref("NT.00001", "itens 5.2 e 5.3") },
  { texto: "GD — memorial técnico descritivo com: identificação da UC; dados do ponto de conexão (tensão, condutores e disjuntor de entrada); fotos do local da medição/inversor; cargas, carga instalada e demanda (ligação nova ou aumento de carga); dimensionamentos (gerador, inversor, proteções CC/CA, DPS, disjuntores, condutores, DSV); aterramento e equipotencialização; funções de proteção; características do gerador/inversor; detalhes de montagem do padrão de entrada e do inversor; planta de situação georreferenciada.", ref: ref("NT.00020", "item 5.13.2 f") },
  { texto: "GD — diagrama unifilar com gerador, inversor, quadro de distribuição, cargas, proteções (CA e CC, DPS, aterramento), disjuntor geral (polos e corrente), medidor e cabos (V, A, W/kW, mm²); e diagrama de blocos.", ref: ref("NT.00020", "item 5.13.2 d, e") },
  { texto: "GD — documento de responsabilidade técnica (ART/TRT) de projeto e execução, com registro e nome do responsável, local e atividades.", ref: ref("NT.00020", "item 5.13.2 c") },
  { texto: "Arquivos assinados e digitalizados pelo responsável técnico, até 5 MB cada; desenhos em CAD (AutoCAD 2007) ou PDF, formatos A0 a A4; arquivos nomeados pelo documento.", ref: ref("NT.00020", "item 5.13.1") },
  { texto: "Recarga de veículo elétrico acima de 7,4 kW em UC individual: apresentar projeto elétrico.", ref: ref("NT.00042", "item 5.2.3") },
];

export interface CircuitoMemorial {
  numero: number;
  descricao: string;
  potenciaW: number;
  tensaoV: number;
  secaoMm2: number | null;
  disjuntor: string;
  dr: string;
  fase: string;
}

export interface QuadroMemorial {
  nome: string;
  circuitos: CircuitoMemorial[];
  dps?: string;
  drs?: string[];
  disjuntorGeral?: string;
}

export interface DadosMemorial {
  obra: { titulo: string; endereco: string; cidade?: string };
  cliente: { nome: string; documento?: string };
  responsavel: { nome: string; registro?: string; telefone?: string; email?: string; art?: string };
  categoria: ResultadoCategoria;
  demanda: ResultadoDemanda;
  montagem?: Montagem;
  quadros: QuadroMemorial[];
  esquemaAterramento?: string;
  temGeracao?: boolean;
  temRecargaVE?: boolean;
  data?: Date;
}

export interface SecaoMemorial {
  id: string;
  titulo: string;
  /** Conteúdo em Markdown. Seções da IA trazem só o marcador. */
  markdown: string;
  /** Presente quando o texto deve ser redigido pela IA. */
  paraIA?: { marcador: string; instrucao: string };
}

const marcador = (id: string) => `<!-- IA:${id} -->`;
const num = (n: number, casas = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** Monta a base determinística do memorial; as seções com `paraIA` ficam para a IA redigir. */
export function montarMemorialDescritivo(d: DadosMemorial): { secoes: SecaoMemorial[]; markdown: string } {
  const c = d.categoria;
  const l = c.linha;
  const data = (d.data ?? new Date()).toLocaleDateString("pt-BR", { timeZone: "America/Belem" });

  const normas = [
    "ABNT NBR 5410 — Instalações elétricas de baixa tensão",
    "NR-10 — Segurança em instalações e serviços em eletricidade",
    `Equatorial ${NORMAS["NT.00001"].codigo} rev. ${NORMAS["NT.00001"].revisao} — ${NORMAS["NT.00001"].titulo}`,
    `Equatorial ${NORMAS["NT.00030"].codigo} rev. ${NORMAS["NT.00030"].revisao} — ${NORMAS["NT.00030"].titulo}`,
    `Equatorial ${NORMAS["NT.00045"].codigo} rev. ${NORMAS["NT.00045"].revisao} — ${NORMAS["NT.00045"].titulo}`,
  ];
  if (d.temGeracao) normas.push(`Equatorial NT.00020 rev. ${NORMAS["NT.00020"].revisao} — ${NORMAS["NT.00020"].titulo}`);
  if (d.temRecargaVE) normas.push(`Equatorial NT.00042 rev. ${NORMAS["NT.00042"].revisao} — ${NORMAS["NT.00042"].titulo}`);

  const secoes: SecaoMemorial[] = [
    {
      id: "identificacao",
      titulo: "1. Identificação",
      markdown: [
        `- **Obra/serviço:** ${d.obra.titulo}`,
        `- **Endereço:** ${[d.obra.endereco, d.obra.cidade].filter(Boolean).join(" — ") || "—"}`,
        `- **Cliente (titular da UC):** ${d.cliente.nome}${d.cliente.documento ? ` — CPF/CNPJ ${d.cliente.documento}` : ""}`,
        `- **Responsável técnico:** ${d.responsavel.nome}${d.responsavel.registro ? ` — ${d.responsavel.registro}` : ""}`,
        `- **ART/TRT nº:** ${d.responsavel.art || "________________"}`,
        `- **Concessionária:** Equatorial Pará`,
        `- **Data:** ${data}`,
      ].join("\n"),
    },
    {
      id: "descricao-geral",
      titulo: "2. Objetivo e descrição geral",
      markdown: marcador("descricao-geral"),
      paraIA: {
        marcador: marcador("descricao-geral"),
        instrucao: "Descreva em 1 a 2 parágrafos o objetivo do memorial e a instalação (tipo de imóvel, uso, escopo do serviço), sem repetir as tabelas.",
      },
    },
    { id: "normas", titulo: "3. Normas e documentos de referência", markdown: normas.map((n) => `- ${n}`).join("\n") },
    {
      id: "fornecimento",
      titulo: "4. Dados do fornecimento e do ponto de conexão",
      markdown:
        c.tipo === "media_tensao" || !l
          ? `Carga instalada acima de 75 kW: fornecimento em média tensão (NT.00002), fora do escopo deste memorial de baixa tensão. (${ref("NT.00001", "item 6.2.1")})`
          : [
              `- **Tipo de ligação:** ${ROTULO_LIGACAO[c.tipo]} — ${c.condutores}`,
              `- **Tensão de fornecimento:** ${c.tensao}`,
              `- **Disjuntor geral do padrão:** ${l.disjuntorA} A (${ref("NT.00001", "TABELA 2")})`,
              `- **Condutores de entrada do cliente (cobre, 1 kV / 90 °C):** ${l.condutorCliente} mm² — fase(neutro)`,
              `- **Eletroduto de entrada (aço galvanizado):** ${l.eletrodutoAco}`,
              `- **Ramal de conexão:** fornecido e instalado pela Equatorial (${ref("NT.00001", "item 6.3.2.3")})`,
              ...c.motivos.map((m) => `- ${m}`),
              ...(c.estudos.length ? ["", "**Situações que exigem estudo da Equatorial:**", ...c.estudos.map((e) => `- ${e}`)] : []),
            ].join("\n"),
    },
    {
      id: "cargas",
      titulo: "5. Carga instalada e demanda",
      markdown: [
        "| Grupo | Carga (kW) | Fator | Demanda (kW) | Referência |",
        "|---|---:|---|---:|---|",
        ...d.demanda.parcelas.map((p) => `| ${p.grupo} | ${num(p.cargaKW)} | ${p.fator} | ${num(p.demandaKW)} | ${p.ref} |`),
        `| **Total** | **${num(d.demanda.cargaInstaladaKW)}** | | **${num(d.demanda.demandaKW)}** | FP ${num(d.demanda.fatorPotencia)} → ${num(d.demanda.demandaKVA)} kVA |`,
        "",
        "O padrão de entrada foi dimensionado pela carga instalada, conforme o método da TABELA 2 da NT.00001; a demanda é estimativa pelas TABELAS 4 e 5.",
      ].join("\n"),
    },
    {
      id: "padrao",
      titulo: "6. Padrão de entrada e aterramento",
      markdown: l
        ? [
            `- **Montagem:** ${d.montagem ? ROTULO_MONTAGEM[d.montagem] : "conforme Desenhos 17 a 29 da NT.00001"}; caixa a 1,30 m (± 0,10 m) do piso`,
            `- **Caixa:** de medição e proteção ${c.tipo === "monofasico" ? "monofásica" : "polifásica"} homologada pela Equatorial (${ref("NT.00001", "item 6.3.6")})`,
            `- **Aterramento:** neutro aterrado na caixa de medição; condutor de aço cobreado ${l.aterramentoMm2} mm² em eletroduto de PVC ${l.eletrodutoAterramento}; ${
              d.montagem === "poste_aco" ? "poste de aço como eletrodo (haste dispensada)" : "haste de aço cobreado Ø 16 × 1.500 mm com conector cunha"
            } (${ref("NT.00001", "item 6.3.4")})`,
            `- **Esquema de aterramento da instalação:** ${d.esquemaAterramento ?? "conforme NBR 5410 (TN ou TT)"}`,
          ].join("\n")
        : "—",
    },
    ...d.quadros.map((q, i) => ({
      id: `quadro-${i + 1}`,
      titulo: `${7 + i}. Quadro de distribuição — ${q.nome}`,
      markdown: [
        ...[
          q.disjuntorGeral && `- **Disjuntor geral do quadro:** ${q.disjuntorGeral}`,
          q.drs?.length && `- **DR:** ${q.drs.join("; ")}`,
          q.dps && `- **DPS:** ${q.dps}`,
        ].filter(Boolean),
        "",
        "| Nº | Descrição | Potência (W) | Tensão (V) | Seção (mm²) | Disjuntor | DR | Fase |",
        "|---:|---|---:|---:|---:|---|---|---|",
        ...q.circuitos.map(
          (k) => `| ${k.numero} | ${k.descricao} | ${k.potenciaW.toLocaleString("pt-BR")} | ${k.tensaoV} | ${k.secaoMm2 ?? "—"} | ${k.disjuntor} | ${k.dr || "—"} | ${k.fase} |`,
        ),
      ].join("\n"),
    })),
    {
      id: "criterios",
      titulo: `${7 + d.quadros.length}. Critérios adotados`,
      markdown: marcador("criterios"),
      paraIA: {
        marcador: marcador("criterios"),
        instrucao:
          "Explique os critérios de dimensionamento (capacidade de corrente, queda de tensão, seção mínima, coordenação disjuntor × condutor, DR em áreas molhadas, DPS, divisão de circuitos) citando a NBR 5410, sem inventar valores além dos que estão no memorial.",
      },
    },
    {
      id: "consideracoes",
      titulo: `${8 + d.quadros.length}. Considerações finais`,
      markdown: marcador("consideracoes"),
      paraIA: {
        marcador: marcador("consideracoes"),
        instrucao: "Escreva as considerações finais: recomendações de uso e manutenção, segurança (NR-10) e responsabilidade técnica. Curto e objetivo.",
      },
    },
    {
      id: "assinatura",
      titulo: `${9 + d.quadros.length}. Responsabilidade técnica`,
      markdown: [
        "",
        "______________________________________",
        `${d.responsavel.nome}${d.responsavel.registro ? ` — ${d.responsavel.registro}` : ""}`,
        `ART/TRT nº ${d.responsavel.art || "________________"}`,
        [d.responsavel.telefone, d.responsavel.email].filter(Boolean).join(" · "),
      ].join("\n"),
    },
  ];

  const markdown = [`# Memorial descritivo — ${d.obra.titulo}`, ...secoes.map((s) => `## ${s.titulo}\n\n${s.markdown}`)].join("\n\n");
  return { secoes, markdown };
}

/** Substitui os marcadores da IA pelos textos gerados (os que faltarem continuam marcados). */
export function preencherMemorial(markdown: string, textos: Record<string, string>) {
  return markdown.replace(/<!-- IA:([a-z-]+) -->/g, (m, id: string) => textos[id]?.trim() || m);
}
