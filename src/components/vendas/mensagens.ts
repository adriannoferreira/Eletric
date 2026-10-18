/** Modelos de mensagem de follow-up por etapa (0 = 1º lembrete, 1 = 2º, 2+ = encerramento). */
export type DadosMensagem = {
  primeiroNome: string;
  titulo: string;
  link: string;
  meuNome: string;
  diasValidadeRestantes: number | null;
};

export const ETAPAS = ["1º lembrete", "2º contato", "Encerramento"] as const;

export function etapaDoFollowup(followups: number) {
  return Math.min(followups, 2);
}

export function mensagemFollowup(etapa: number, d: DadosMensagem) {
  const assinatura = d.meuNome ? `\n\n${d.meuNome}` : "";
  if (etapa <= 0) {
    return `Oi, ${d.primeiroNome}! Tudo bem? 😊
Passando pra saber se você conseguiu ver o orçamento de *${d.titulo}* que te enviei:
${d.link}

Se ficou alguma dúvida sobre o serviço ou o material, me chama que eu explico.${assinatura}`;
  }
  if (etapa === 1) {
    const validade =
      d.diasValidadeRestantes !== null && d.diasValidadeRestantes > 0
        ? `O orçamento vale por mais ${d.diasValidadeRestantes} ${d.diasValidadeRestantes === 1 ? "dia" : "dias"}, e`
        : "Os preços de material andam mudando, e";
    return `Oi, ${d.primeiroNome}! Estou fechando minha agenda dos próximos dias e lembrei do seu serviço (*${d.titulo}*).
${validade} consigo reservar um horário pra você ainda esta semana.

Quer que eu deixe um dia separado? Se preferir, dá pra ajustar alguma parte do orçamento.
${d.link}${assinatura}`;
  }
  return `Oi, ${d.primeiroNome}, tudo certo?
Como não tive retorno, vou entender que o serviço de *${d.titulo}* não é prioridade agora, e tudo bem!

Fico à disposição sempre que precisar de eletricista. Se puder, me conta só o que pesou na decisão? Isso me ajuda a melhorar. 🙏${assinatura}`;
}
