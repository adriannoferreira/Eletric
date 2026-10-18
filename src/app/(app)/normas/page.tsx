import { BookOpen, Calculator, ChevronRight, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { MenuAcoes, Ref } from "@/components/divulgacao";
import { Cabecalho } from "@/components/ui";
import { AVISO_REVISAO, buscarNasNormas, NORMAS, PAGINA_NORMAS_PA, TEMAS } from "@/lib/normas/equatorial-pa";

export const metadata = { title: "Normas Equatorial (PA)" };

export default async function NormasPage({ searchParams }: PageProps<"/normas">) {
  const { q } = await searchParams;
  const termo = typeof q === "string" ? q : "";
  const achados = buscarNasNormas(termo);

  return (
    <>
      <Cabecalho
        titulo="Normas Equatorial"
        subtitulo="Baixa tensão · Pará"
        acoes={
          <MenuAcoes
            acoes={[
              ...Object.values(NORMAS).map((n) => ({
                rotulo: `${n.codigo} rev. ${n.revisao}`,
                icone: <ExternalLink />,
                href: n.url,
                externo: true,
              })),
              { rotulo: "Página da Equatorial", icone: <ExternalLink />, href: PAGINA_NORMAS_PA, externo: true },
            ]}
          />
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Ref norma="NT.00001" item="rev. 09 – 2025" href={NORMAS["NT.00001"].url}>
          <p>{AVISO_REVISAO}</p>
        </Ref>
      </div>

      <Link href="/normas/calculadora" className="btn btn-primary mb-4 w-full sm:w-auto">
        <Calculator className="size-4" /> Calcular padrão de entrada
      </Link>

      <form className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={termo} placeholder="Buscar na norma" className="input pl-10" />
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
              <Link href={`/normas/${t.slug}`} className="card flex h-full items-center gap-3 px-4 py-3 transition hover:border-accent">
                <BookOpen className="size-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate font-medium">{t.titulo}</span>
                <ChevronRight className="size-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}

    </>
  );
}
