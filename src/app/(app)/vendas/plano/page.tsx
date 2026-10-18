import { asc } from "drizzle-orm";
import { ChevronDown } from "lucide-react";
import { Cabecalho } from "@/components/ui";
import { db, tarefasMarketing } from "@/db";
import { ListaTarefas, NovaTarefa } from "@/components/vendas/lista-tarefas";
import { TAREFAS_PADRAO } from "@/components/vendas/plano-padrao";

export const metadata = { title: "Plano de crescimento" };

const FASES = [
  { fase: 30, titulo: "Primeiros 30 dias", subtitulo: "Ser encontrado" },
  { fase: 60, titulo: "Até 60 dias", subtitulo: "Gerar demanda" },
  { fase: 90, titulo: "Até 90 dias", subtitulo: "Parcerias e escala" },
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
  const faseAtual = FASES.find((f) => todas.some((t) => t.fase === f.fase && !t.concluida))?.fase ?? FASES[0].fase;

  return (
    <>
      <Cabecalho titulo="Plano de crescimento" />

      <section className="card mb-4 p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-semibold">Progresso</span>
          <span className="text-sm text-muted">{feitas} de {todas.length} tarefas</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </section>

      <div className="space-y-2">
        {FASES.map((f) => {
          const tarefas = todas.filter((t) => t.fase === f.fase);
          const ok = tarefas.filter((t) => t.concluida).length;
          const aberta = f.fase === faseAtual;
          return (
            <details key={f.fase} open={aberta} className="group card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
                <span className="font-semibold">
                  {f.titulo}
                  <span className="ml-2 text-sm font-normal text-muted">{f.subtitulo}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-muted">
                  {ok}/{tarefas.length} <ChevronDown className="size-4 transition group-open:rotate-180" />
                </span>
              </summary>
              <div className="border-t border-border">
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
            </details>
          );
        })}
        <NovaTarefa />
      </div>
    </>
  );
}
