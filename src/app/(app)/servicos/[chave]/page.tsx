import { and, eq, gt, ilike, inArray, or } from "drizzle-orm";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  ClipboardCheck,
  Clock,
  HardHat,
  Lightbulb,
  ListOrdered,
  Megaphone,
  Package,
  Plus,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PerguntarIA } from "@/components/servicos/perguntar-ia";
import { Badge, Cabecalho } from "@/components/ui";
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
      <Cabecalho titulo={g.nome} subtitulo={g.resumo} voltar="/servicos" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge>{g.categoria}</Badge>
        <Badge tom="info"><Clock className="mr-1 size-3" />{g.tempoHoras[0]}–{g.tempoHoras[1]} h de serviço</Badge>
      </div>

      {g.exigeResponsavel && (
        <div className="mb-4 flex gap-3 rounded-2xl bg-warn-soft p-4 text-sm text-warn">
          <ShieldAlert className="size-5 shrink-0" />
          <p><strong>Exige responsável técnico.</strong> {g.exigeResponsavel}</p>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-2">
        <Link href={`/os/nova?guia=${g.chave}`} className="btn btn-primary"><Plus className="size-4" /> Criar OS</Link>
        <a href="#ia" className="btn btn-secondary"><Bot className="size-4" /> Perguntar à IA</a>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloco t="Quando oferecer" i={Lightbulb} itens={g.quandoOferecer} />
        <Bloco t="Passo a passo" i={ListOrdered} itens={g.passos} numerado />
        <section className="card p-4">
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><Package className="size-4 text-accent" /> Materiais típicos</h2>
          {g.materiais.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">{g.materiais.map((m) => <li key={m}>{m}</li>)}</ul>
          ) : (
            <p className="text-sm text-muted">Conforme o que for encontrado.</p>
          )}
          {kitsDb.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {kitsDb.map((k) => (
                <Link key={k.id} href="/catalogo" className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium">Kit: {k.nome}</Link>
              ))}
            </div>
          )}
          {g.kits?.length && kitsDb.length === 0 ? (
            <p className="mt-2 text-xs text-muted">Carregue os kits sugeridos no Catálogo para ligar este serviço aos materiais com preço.</p>
          ) : null}
        </section>
        <Bloco t="Ferramentas e EPIs" i={Wrench} itens={g.ferramentas} />
        <Bloco t="Normas aplicáveis" i={BookOpen} itens={g.normas.length ? g.normas : ["—"]} />
        <Bloco t="Segurança (NR-10)" i={HardHat} itens={g.seguranca.length ? g.seguranca : ["Seguir procedimentos da NR-10"]} />
        <Bloco t="Checklist de entrega (vai para a OS)" i={ClipboardCheck} itens={g.checklistEntrega} />
        <Bloco t="Como vender / o que falar" i={Megaphone} itens={g.argumentosVenda} />
      </div>

      {g.conferir?.length ? (
        <div className="mt-4 flex gap-3 rounded-2xl bg-info-soft p-4 text-sm text-info">
          <AlertTriangle className="size-5 shrink-0" />
          <div>
            <p className="font-semibold">Conferir na norma vigente</p>
            <ul className="list-disc pl-5">{g.conferir.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        </div>
      ) : null}

      <section className="card mt-4 p-4">
        <h2 className="mb-2 font-semibold">Seus preços no catálogo</h2>
        {servicosCat.length ? (
          <ul className="divide-y divide-border text-sm">
            {servicosCat.map((s) => (
              <li key={s.nome} className="flex justify-between gap-3 py-2"><span>{s.nome}</span><span className="font-semibold">{reais(s.preco)}/{s.unidade}</span></li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nenhum serviço parecido com preço no seu <Link href="/catalogo" className="text-info underline">catálogo</Link>.</p>
        )}
      </section>

      <section id="ia" className="card mt-4 scroll-mt-4 p-4">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Bot className="size-4 text-accent" /> Perguntar à IA sobre este serviço</h2>
        <PerguntarIA
          contexto={contexto}
          sugestoes={["Quais erros mais comuns neste serviço?", "Como calcular o material?", "Como explicar o preço ao cliente?"]}
        />
      </section>
    </>
  );
}

function Bloco({ t, i: I, itens, numerado }: { t: string; i: React.ComponentType<{ className?: string }>; itens: string[]; numerado?: boolean }) {
  const L = numerado ? "ol" : "ul";
  return (
    <section className="card p-4">
      <h2 className="mb-2 flex items-center gap-2 font-semibold"><I className="size-4 text-accent" /> {t}</h2>
      <L className={`${numerado ? "list-decimal" : "list-disc"} space-y-1 pl-5 text-sm`}>
        {itens.map((x) => <li key={x}>{x}</li>)}
      </L>
    </section>
  );
}
