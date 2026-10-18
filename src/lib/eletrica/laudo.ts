/** Laudo/relatório de inspeção: texto padrão e leitura da redação da IA. */
import type { Laudo, NaoConformidade, QuadroDados } from "./tipos";

export function laudoPadrao(dados: QuadroDados): Laudo {
  return {
    inspecaoId: dados.inspecoes.at(-1)?.id ?? null,
    objetivo:
      "Avaliar as condições de segurança e a conformidade da instalação elétrica de baixa tensão (quadro de distribuição e circuitos terminais) com a ABNT NBR 5410, por meio de inspeção visual e ensaios, e indicar as correções necessárias.",
    analise: "",
    naoConformidades: [],
    conclusao: "ressalvas",
    textoConclusao: "",
    periodicidade:
      "Recomenda-se nova inspeção periódica em até 5 anos, ou antes em caso de reforma, ampliação de carga, mudança de uso ou ocorrência (choque, aquecimento, desligamentos frequentes). Conferir a periodicidade adequada ao tipo de instalação.",
    atualizadoEm: "",
  };
}


/** Lê o texto no formato pedido à IA. Retorna null se não reconhecer. */
export function interpretarRedacao(t: string): Partial<Laudo> | null {
  const sec = (nome: string) => {
    const m = t.match(new RegExp(`###\\s*${nome}\\s*\\n([\\s\\S]*?)(?=\\n###|$)`));
    return m ? m[1].trim() : null;
  };
  const analise = sec("ANALISE");
  const ncs = sec("NAO_CONFORMIDADES");
  const concl = sec("CONCLUSAO");
  if (!analise && !concl) return null;
  const naoConformidades: NaoConformidade[] = (ncs ?? "")
    .split("\n")
    .map((l) => l.match(/^-\s*\[(alto|medio|médio|baixo)\]\s*(.*?)(?:\s*\|\s*(.*))?$/i))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => ({
      risco: (m[1].toLowerCase().replace("é", "e") as NaoConformidade["risco"]),
      descricao: m[2].trim(),
      recomendacao: (m[3] ?? "").trim(),
    }));
  const linhas = (concl ?? "").split("\n");
  const tipo = linhas[0]?.trim().toLowerCase();
  const conclusao = (["conforme", "ressalvas", "nao_conforme"] as const).find((c) => c === tipo);
  return {
    ...(analise ? { analise } : {}),
    ...(naoConformidades.length ? { naoConformidades } : {}),
    ...(conclusao ? { conclusao, textoConclusao: linhas.slice(1).join("\n").trim() } : concl ? { textoConclusao: concl } : {}),
  };
}

