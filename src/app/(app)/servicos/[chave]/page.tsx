import { and, eq, gt, ilike, inArray, or } from "drizzle-orm";
import { BookOpen, Bot, ClipboardCheck, HardHat, ListOrdered, Megaphone, Package, Plus, ShieldAlert, Tag, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PerguntarIA } from "@/components/servicos/perguntar-ia";
import { Ajuda, Conferir, Detalhes, MenuAcoes, Ref } from "@/components/divulgacao";
import { Cabecalho } from "@/components/ui";
import { catalogo, db, kits } from "@/db";
import { reais } from "@/lib/formato";
import { guiaPorChave } from "@/lib/servicos/guias";

export default async function GuiaPage({ params }: PageProps<"/servicos/[chave]">) {
  const g = guiaPorChave((await params).chave);
  if (!g) notFound();

  const [kitsDb, servicosCat] = await Promise.all([
    g.kits?.length ? db.select({ id: kits.id, nome: kits.nome, chave: kits.chave }).from(kits).where(inArray(kits.chave, g.kits)) : Promise.resolve([]),
    g.palavrasCatalogo?.length
      ? db
          .select({ nome: catalogo.nome, preco: catalogo.preco, unidade: catalogo.unidade })
          .from(catalogo)
          .where(and(eq(catalogo.tipo, "servico"), gt(catalogo.preco, 0), or(...g.palavrasCatalogo.map((p) => ilike(catalogo.nome, `%${p}%`)))))
      : Promise.resolve([]),
  ]);

  const contexto = [
    `Serviço: ${g.nome} (${g.categoria}). ${g.resumo}`,
    `Passo a passo de referência:\n- ${g.passos.join("\n- ")}`,
    `Normas citadas: ${g.normas.join("; ") || "—"}`,
    "Região: Belém/Ananindeua/Salinópolis (PA), concessionária Equatorial Pará.",
  ].join("\n\n");

  return (
    <>
      <Cabecalho
        titulo={g.nome}
        subtitulo={`${g.categoria} · ${g.tempoHoras[0]}–${g.tempoHoras[1]} h`}
        voltar="/servicos"
        ajuda={<p>{g.resumo}</p>}
        acoes={
          <MenuAcoes
            acoes={[
              { rotulo: "Perguntar à IA", icone: <Bot />, href: "#ia" },
              { rotulo: "Kits no catálogo", icone: <Package />, href: "/catalogo/kits" },
            ]}
          />
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {g.exigeResponsavel && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-warn">
            <ShieldAlert className="size-4" /> Exige responsável técnico
            <Ajuda titulo="Responsável técnico">{g.exigeResponsavel}</Ajuda>
          </span>
        )}
        {g.normas.slice(0, 3).map((n) => (
          <Ref key={n} norma={n} />
        ))}
        {g.conferir?.length ? <Conferir itens={g.conferir} /> : null}
      </div>

      {g.seguranca[0] && (
        <p className="mb-4 flex items-start gap-2 text-sm">
          <HardHat className="mt-0.5 size-4 shrink-0 text-warn" /> {g.seguranca[0]}
        </p>
      )}

      <Link href={`/os/nova?guia=${g.chave}`} className="btn btn-primary mb-4 w-full sm:w-auto">
        <Plus className="size-4" /> Criar OS
      </Link>

      <div className="space-y-2">
        <Detalhes titulo={<Titulo i={ListOrdered} t="Passo a passo" />} aberto>
          <Lista itens={g.passos} numerado />
        </Detalhes>
        <Detalhes titulo={<Titulo i={Package} t="Materiais" />}>
          {g.materiais.length ? <Lista itens={g.materiais} /> : <p className="text-sm text-muted">Conforme o que for encontrado.</p>}
          {kitsDb.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {kitsDb.map((k) => (
                <Link key={k.id} href="/catalogo/kits" className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium">
                  Kit: {k.nome}
                </Link>
              ))}
            </div>
          )}
        </Detalhes>
        <Detalhes titulo={<Titulo i={Wrench} t="Ferramentas e EPIs" />}>
          <Lista itens={g.ferramentas} />
        </Detalhes>
        <Detalhes titulo={<Titulo i={HardHat} t="Segurança (NR-10)" />}>
          <Lista itens={g.seguranca.length ? g.seguranca : ["Seguir procedimentos da NR-10"]} />
        </Detalhes>
        <Detalhes titulo={<Titulo i={ClipboardCheck} t="Checklist de entrega" />}>
          <Lista itens={g.checklistEntrega} />
        </Detalhes>
        <Detalhes titulo={<Titulo i={Megaphone} t="Como vender" />}>
          <Lista itens={g.argumentosVenda} />
          <p className="mb-1 mt-3 text-sm font-semibold">Quando oferecer</p>
          <Lista itens={g.quandoOferecer} />
        </Detalhes>
        <Detalhes titulo={<Titulo i={BookOpen} t="Normas" />}>
          <Lista itens={g.normas.length ? g.normas : ["—"]} />
        </Detalhes>
        <Detalhes titulo={<Titulo i={Tag} t="Seus preços" />}>
          {servicosCat.length ? (
            <ul className="divide-y divide-border text-sm">
              {servicosCat.map((s) => (
                <li key={s.nome} className="flex justify-between gap-3 py-2">
                  <span>{s.nome}</span>
                  <span className="font-semibold">
                    {reais(s.preco)}/{s.unidade}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Sem preço no <Link href="/catalogo" className="text-info underline">catálogo</Link>.
            </p>
          )}
        </Detalhes>
        <div id="ia" className="scroll-mt-4">
          <Detalhes titulo={<Titulo i={Bot} t="Perguntar à IA" />}>
            <PerguntarIA
              contexto={contexto}
              sugestoes={["Quais erros mais comuns neste serviço?", "Como calcular o material?", "Como explicar o preço ao cliente?"]}
            />
          </Detalhes>
        </div>
      </div>
    </>
  );
}

function Titulo({ t, i: I }: { t: string; i: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="flex items-center gap-2">
      <I className="size-4 text-accent" /> {t}
    </span>
  );
}

function Lista({ itens, numerado }: { itens: string[]; numerado?: boolean }) {
  const L = numerado ? "ol" : "ul";
  return (
    <L className={`${numerado ? "list-decimal" : "list-disc"} space-y-1 pl-5 text-sm`}>
      {itens.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </L>
  );
}
