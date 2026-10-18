import { Bot, Cable, ChevronRight, PlugZap, Sun, Wrench } from "lucide-react";
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
      <Cabecalho
        titulo="Serviços"
        ajuda={
          <>
            <p>Cada serviço tem passo a passo, materiais, ferramentas, normas, cuidados de segurança, tempo e o que falar para vender.</p>
            <p>O checklist de entrega do guia vira o checklist da OS quando você cria uma OS a partir dele.</p>
          </>
        }
      />

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {[
          { href: "/diagnostico", r: "Diagnóstico IA", i: Bot },
          { href: "/servicos/modulos/padrao-entrada", r: "Padrão de entrada", i: PlugZap },
          { href: "/servicos/modulos/comandos", r: "Comandos", i: Cable },
          { href: "/servicos/modulos/solar", r: "Solar", i: Sun },
        ].map((m) => (
          <Link key={m.href} href={m.href} className="card flex shrink-0 items-center gap-2 px-3 py-2 text-sm font-medium transition hover:border-accent">
            <m.i className="size-4 text-accent" /> {m.r}
          </Link>
        ))}
      </div>

      <form className="mb-3">
        {cat && <input type="hidden" name="c" value={cat} />}
        <input name="q" defaultValue={busca} placeholder="Buscar serviço" className="input" />
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
              <Link href={`/servicos/${g.chave}`} className="card flex h-full items-center gap-3 px-4 py-3 transition hover:border-accent">
                <Wrench className="size-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{g.nome}</p>
                  <p className="truncate text-xs text-muted">
                    {g.categoria} · {g.tempoHoras[0]}–{g.tempoHoras[1]} h
                  </p>
                </div>
                {g.exigeResponsavel && <Badge tom="aviso">RT</Badge>}
                <ChevronRight className="size-4 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
