import { Bot, Cable, ChevronRight, ClipboardList, PlugZap, Sun, Wrench } from "lucide-react";
import Link from "next/link";
import { Badge, Cabecalho } from "@/components/ui";
import { CATEGORIAS_SERVICO, GUIAS } from "@/lib/servicos/guias";

export const metadata = { title: "Serviços" };

const normal = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default async function ServicosPage({ searchParams }: PageProps<"/servicos">) {
  const { q, c } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const cat = CATEGORIAS_SERVICO.find((x) => x === c);
  const lista = GUIAS.filter(
    (g) => (!cat || g.categoria === cat) && (!busca || normal(`${g.nome} ${g.resumo} ${g.categoria}`).includes(normal(busca))),
  );
  const link = (categoria?: string) => {
    const p = new URLSearchParams();
    if (categoria) p.set("c", categoria);
    if (busca) p.set("q", busca);
    const s = p.toString();
    return s ? `/servicos?${s}` : "/servicos";
  };

  return (
    <>
      <Cabecalho titulo="Serviços" subtitulo="Guia prático de cada serviço: passo a passo, materiais, normas e como vender" />

      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/diagnostico", r: "Diagnóstico com IA", d: "Descreva o defeito ou mande foto", i: Bot },
          { href: "/servicos/modulos/padrao-entrada", r: "Padrão de entrada", d: "Equatorial Pará", i: PlugZap },
          { href: "/servicos/modulos/comandos", r: "Bombas e comandos", d: "Diagramas de comando", i: Cable },
          { href: "/servicos/modulos/solar", r: "Energia solar", d: "Visita técnica e manutenção", i: Sun },
        ].map((m) => (
          <Link key={m.href} href={m.href} className="card flex items-center gap-3 p-3.5 transition hover:border-accent">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg"><m.i className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{m.r}</span>
              <span className="block truncate text-xs text-muted">{m.d}</span>
            </span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        ))}
      </div>

      <form className="mb-3">
        {cat && <input type="hidden" name="c" value={cat} />}
        <input name="q" defaultValue={busca} placeholder="Buscar serviço (ex.: chuveiro, bomba, DR)" className="input" />
      </form>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        <Link href={link()} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${!cat ? "border-accent bg-accent-soft" : "border-border text-muted"}`}>Todos</Link>
        {CATEGORIAS_SERVICO.map((x) => (
          <Link key={x} href={link(x)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${cat === x ? "border-accent bg-accent-soft" : "border-border text-muted"}`}>
            {x}
          </Link>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">Nenhum serviço encontrado.</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {lista.map((g) => (
            <li key={g.chave}>
              <Link href={`/servicos/${g.chave}`} className="card flex h-full items-start gap-3 p-4 transition hover:border-accent">
                <Wrench className="mt-0.5 size-5 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{g.nome}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted">{g.resumo}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge>{g.categoria}</Badge>
                    <Badge tom="info">{g.tempoHoras[0]}–{g.tempoHoras[1]} h</Badge>
                    {g.exigeResponsavel && <Badge tom="aviso">Exige RT</Badge>}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 flex items-center gap-2 text-xs text-muted">
        <ClipboardList className="size-4" /> O checklist de entrega de cada guia vira o checklist da OS quando você cria uma OS a partir dele.
      </p>
    </>
  );
}
