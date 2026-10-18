import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { Tabela2, Tabela3 } from "@/components/normas/tabelas";
import { Cabecalho } from "@/components/ui";
import { AVISO_REVISAO, NORMAS, TEMAS } from "@/lib/normas/equatorial-pa";

export function generateStaticParams() {
  return TEMAS.map((t) => ({ tema: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/normas/[tema]">) {
  const { tema } = await params;
  const t = TEMAS.find((x) => x.slug === tema);
  return { title: t ? `${t.titulo} — Equatorial PA` : "Normas" };
}

export default async function TemaPage({ params }: PageProps<"/normas/[tema]">) {
  const { tema } = await params;
  const t = TEMAS.find((x) => x.slug === tema);
  if (!t) notFound();
  return (
    <>
      <Cabecalho titulo={t.titulo} subtitulo={t.resumo} voltar="/normas" />
      <ul className="mb-4 space-y-2">
        {t.itens.map((i) => (
          <li key={i.texto} className="card p-3 text-sm">
            <p>{i.texto}</p>
            <p className="mt-1 text-xs text-muted">{i.ref}</p>
          </li>
        ))}
      </ul>
      {t.tabela === "tabela2" && <Tabela2 />}
      {t.tabela === "tabela3" && <Tabela3 />}
      <div className="mt-4 space-y-1 text-sm">
        {t.normas.map((c) => (
          <a key={c} href={NORMAS[c].url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-info underline">
            <ExternalLink className="size-4" /> Abrir norma oficial {c}.EQTL rev. {NORMAS[c].revisao}
          </a>
        ))}
        <p className="pt-2 text-xs text-muted">{AVISO_REVISAO}</p>
      </div>
    </>
  );
}
