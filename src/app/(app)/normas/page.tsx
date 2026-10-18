import { BookOpen, Calculator, ChevronRight, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { Cabecalho } from "@/components/ui";
import { AVISO_REVISAO, buscarNasNormas, NORMAS, PAGINA_NORMAS_PA, TEMAS } from "@/lib/normas/equatorial-pa";

export const metadata = { title: "Normas Equatorial (PA)" };

export default async function NormasPage({ searchParams }: PageProps<"/normas">) {
  const { q } = await searchParams;
  const termo = typeof q === "string" ? q : "";
  const achados = buscarNasNormas(termo);

  return (
    <>
      <Cabecalho titulo="Normas Equatorial (PA)" subtitulo="Regras de instalação em baixa tensão no Pará" voltar="/" />
      <p className="mb-4 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
        <strong>NT.00001 rev. 09 – 2025.</strong> {AVISO_REVISAO}
      </p>

      <Link href="/normas/calculadora" className="card mb-4 flex items-center gap-3 p-4 transition hover:border-accent">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg"><Calculator className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Calculadora do padrão de entrada</span>
          <span className="text-sm text-muted">Categoria, disjuntor, cabos, aterramento, materiais e orçamento</span>
        </span>
        <ChevronRight className="size-5 text-muted" />
      </Link>

      <form className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={termo} placeholder="Buscar: haste, altura, motor, 30 m…" className="input pl-10" />
      </form>

      {termo ? (
        <section className="mb-6 space-y-2">
          <p className="text-sm text-muted">{achados.length} resultado(s) para “{termo}”</p>
          {achados.map(({ tema, item }, i) => (
            <Link key={i} href={`/normas/${tema.slug}`} className="card block p-3 text-sm hover:border-accent">
              <span className="text-xs font-semibold text-muted">{tema.titulo}</span>
              <p>{item.texto}</p>
              <p className="mt-1 text-xs text-muted">{item.ref}</p>
            </Link>
          ))}
        </section>
      ) : (
        <ul className="mb-6 grid gap-2 md:grid-cols-2">
          {TEMAS.map((t) => (
            <li key={t.slug}>
              <Link href={`/normas/${t.slug}`} className="card flex h-full items-start gap-3 p-4 transition hover:border-accent">
                <BookOpen className="mt-0.5 size-5 shrink-0 text-accent" />
                <span className="min-w-0">
                  <span className="block font-semibold">{t.titulo}</span>
                  <span className="text-sm text-muted">{t.resumo}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="card p-4">
        <h2 className="mb-2 font-semibold">Normas oficiais</h2>
        <ul className="space-y-2 text-sm">
          {Object.values(NORMAS).map((n) => (
            <li key={n.codigo}>
              <a href={n.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 hover:underline">
                <ExternalLink className="mt-0.5 size-4 shrink-0 text-muted" />
                <span>
                  <strong>{n.codigo}.EQTL rev. {n.revisao}</strong> — {n.titulo} <span className="text-muted">({n.data})</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <a href={PAGINA_NORMAS_PA} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-info underline">
          Página de normas da Equatorial Pará
        </a>
      </section>
    </>
  );
}
