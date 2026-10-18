import { eq } from "drizzle-orm";
import { MessageCircle, PartyPopper } from "lucide-react";
import { Cabecalho, Vazio } from "@/components/ui";
import { db, perfil } from "@/db";
import { CartaoFollowup, type ItemFollowup } from "@/components/vendas/cartao-followup";
import { orcamentosComTotal, origemDaRequisicao } from "@/components/vendas/dados";
import { etapaDoFollowup, mensagemFollowup } from "@/components/vendas/mensagens";
import { dataCurta, diasDesde, reais } from "@/lib/formato";

export const metadata = { title: "Follow-up" };

const DIAS_MINIMOS = 3;

export default async function FollowupPage() {
  const [orcs, [eu], origem] = await Promise.all([
    orcamentosComTotal(),
    db.select().from(perfil).where(eq(perfil.id, 1)),
    origemDaRequisicao(),
  ]);

  const enviados = orcs.filter((o) => o.status === "enviado");
  const itens: ItemFollowup[] = enviados
    .map((o) => {
      const desdeEnvio = diasDesde(o.enviadoEm ?? o.atualizadoEm) ?? 0;
      const semResposta = diasDesde(o.ultimoFollowupEm ?? o.enviadoEm ?? o.atualizadoEm) ?? 0;
      const etapa = etapaDoFollowup(o.followups);
      const link = `${origem}/o/${o.tokenPublico}`;
      return {
        id: o.id,
        titulo: o.titulo,
        clienteNome: o.clienteNome,
        clienteTelefone: o.clienteTelefone,
        total: o.total,
        diasSemResposta: semResposta,
        diasDesdeEnvio: desdeEnvio,
        followups: o.followups,
        etapa,
        link,
        mensagem: mensagemFollowup(etapa, {
          primeiroNome: o.clienteNome.split(" ")[0],
          titulo: o.titulo,
          link,
          meuNome: eu?.nome || eu?.empresa || "",
          diasValidadeRestantes: o.enviadoEm ? o.validadeDias - desdeEnvio : null,
        }),
      };
    })
    .sort((a, b) => b.diasSemResposta - a.diasSemResposta || b.total - a.total);

  const pendentes = itens.filter((i) => i.diasDesdeEnvio >= DIAS_MINIMOS && i.diasSemResposta >= DIAS_MINIMOS);
  const aguardando = enviados.filter((o) => !pendentes.some((p) => p.id === o.id));

  return (
    <>
      <Cabecalho
        titulo="Follow-up"
        subtitulo="Orçamentos enviados há 3 dias ou mais sem resposta. Quem acompanha, fecha mais."
      />

      {pendentes.length === 0 ? (
        <Vazio
          icone={enviados.length > 0 ? PartyPopper : MessageCircle}
          titulo={enviados.length > 0 ? "Nenhum follow-up pendente hoje" : "Nenhum orçamento aguardando resposta"}
          texto={
            enviados.length > 0
              ? "Os orçamentos enviados ainda estão dentro do prazo de espera."
              : "Quando você enviar um orçamento e o cliente não responder em 3 dias, ele aparece aqui com a mensagem pronta."
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            {pendentes.length} {pendentes.length === 1 ? "orçamento" : "orçamentos"} ·{" "}
            <span className="font-semibold text-fg">{reais(pendentes.reduce((a, i) => a + i.total, 0))}</span> em jogo
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {pendentes.map((i) => (
              <CartaoFollowup key={i.id} item={i} />
            ))}
          </div>
        </>
      )}

      {aguardando.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-muted">Aguardando (contato recente)</h2>
          <ul className="card divide-y divide-border">
            {aguardando.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{o.clienteNome}</p>
                  <p className="truncate text-muted">{o.titulo}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold">{reais(o.total)}</p>
                  <p className="text-xs text-muted">último contato {dataCurta(o.ultimoFollowupEm ?? o.enviadoEm)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
