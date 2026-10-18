import { asc } from "drizzle-orm";
import { Cabecalho } from "@/components/ui";
import { db, tarefasMarketing } from "@/db";
import { ListaTarefas, NovaTarefa } from "@/components/vendas/lista-tarefas";
import { TAREFAS_PADRAO } from "@/components/vendas/plano-padrao";

export const metadata = { title: "Plano de crescimento" };

const FASES = [
  { fase: 30, titulo: "Primeiros 30 dias", subtitulo: "Base profissional: ser encontrado e passar confiança" },
  { fase: 60, titulo: "Até 60 dias", subtitulo: "Gerar demanda constante" },
  { fase: 90, titulo: "Até 90 dias", subtitulo: "Parcerias, recorrência e escala" },
] as const;

export default async function PlanoPage() {
  // Garante que as tarefas sugeridas existam (idempotente pela chave única).
  await db
    .insert(tarefasMarketing)
    .values(TAREFAS_PADRAO.map((t, i) => ({ ...t, ordem: i })))
    .onConflictDoNothing({ target: tarefasMarketing.chave });

  const todas = await db
    .select()
    .from(tarefasMarketing)
    .orderBy(asc(tarefasMarketing.fase), asc(tarefasMarketing.ordem), asc(tarefasMarketing.id));

  const feitas = todas.filter((t) => t.concluida).length;
  const progresso = todas.length ? Math.round((feitas / todas.length) * 100) : 0;

  return (
    <>
      <Cabecalho titulo="Plano de crescimento" subtitulo="Passo a passo para sair do zero e ter agenda cheia" />

      <section className="card mb-5 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-semibold">Seu progresso</span>
          <span className="text-sm text-muted">{feitas} de {todas.length} tarefas</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </section>

      <div className="space-y-5">
        {FASES.map((f) => {
          const tarefas = todas.filter((t) => t.fase === f.fase);
          const ok = tarefas.filter((t) => t.concluida).length;
          return (
            <section key={f.fase}>
              <div className="mb-2 flex items-end justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{f.titulo}</h2>
                  <p className="text-sm text-muted">{f.subtitulo}</p>
                </div>
                <span className="shrink-0 text-sm font-medium text-muted">{ok}/{tarefas.length}</span>
              </div>
              <div className="card">
                <ListaTarefas
                  tarefas={tarefas.map((t) => ({
                    id: t.id,
                    titulo: t.titulo,
                    descricao: t.descricao,
                    concluida: t.concluida,
                    propria: t.chave === null,
                  }))}
                />
              </div>
            </section>
          );
        })}
        <NovaTarefa />
      </div>
    </>
  );
}
