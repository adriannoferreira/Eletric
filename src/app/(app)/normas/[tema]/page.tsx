import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { Tabela2, Tabela3 } from "@/components/normas/tabelas";
import { MenuAcoes, Ref } from "@/components/divulgacao";
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
      <Cabecalho
        titulo={t.titulo}
        voltar="/normas"
        ajuda={
          <>
            <p>{t.resumo}</p>
            <p>{AVISO_REVISAO}</p>
          </>
        }
        acoes={
          <MenuAcoes
            acoes={t.normas.map((c) => ({
              rotulo: `Abrir ${c} rev. ${NORMAS[c].revisao}`,
              icone: <ExternalLink />,
              href: NORMAS[c].url,
              externo: true,
            }))}
          />
        }
      />
      <ul className="card mb-4 divide-y divide-border">
        {t.itens.map((i) => (
          <li key={i.texto} className="flex items-start gap-2 px-4 py-3 text-sm">
            <p className="min-w-0 flex-1">{i.texto}</p>
            <Ref norma="Ref.">
              <p>{i.ref}</p>
            </Ref>
          </li>
        ))}
      </ul>
      {t.tabela === "tabela2" && <Tabela2 />}
      {t.tabela === "tabela3" && <Tabela3 />}
    </>
  );
}
