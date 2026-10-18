import { desc, eq } from "drizzle-orm";
import { BookCopy, LayoutGrid, PencilRuler, Wand2 } from "lucide-react";
import Link from "next/link";
import { MiniaturaQuadro } from "@/components/quadro/miniatura";
import { ListaModelos } from "@/components/quadro/modelos";
import { Badge, Cabecalho, Vazio } from "@/components/ui";
import { clientes, db, quadros } from "@/db";
import { analisarQuadro } from "@/lib/eletrica/calculo";
import { EXEMPLOS } from "@/lib/eletrica/exemplos";
import { lerQuadro } from "@/lib/eletrica/tipos";
import { dataCurta } from "@/lib/formato";

export const metadata = { title: "Quadros" };

const STATUS = {
  ok: { tom: "ok", rotulo: "Conforme" },
  info: { tom: "ok", rotulo: "Conforme" },
  aviso: { tom: "aviso", rotulo: "Atenção" },
  erro: { tom: "perigo", rotulo: "Corrigir" },
} as const;

const OPCOES = [
  { href: "/quadros/novo", icone: PencilRuler, titulo: "Do zero" },
  { href: "/quadros/projeto", icone: Wand2, titulo: "Da obra" },
  { href: "/quadros?aba=modelos", icone: BookCopy, titulo: "De modelo" },
];

export default async function QuadrosPage({ searchParams }: PageProps<"/quadros">) {
  const { aba } = await searchParams;
  const verModelos = aba === "modelos";
  const [lista, modelos, listaClientes] = await Promise.all([
    db
      .select({ q: quadros, cliente: clientes.nome })
      .from(quadros)
      .leftJoin(clientes, eq(clientes.id, quadros.clienteId))
      .where(eq(quadros.modelo, false))
      .orderBy(desc(quadros.atualizadoEm)),
    db.select().from(quadros).where(eq(quadros.modelo, true)).orderBy(desc(quadros.atualizadoEm)),
    db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).orderBy(clientes.nome),
  ]);

  return (
    <>
      <Cabecalho
        titulo="Quadros"
        ajuda={
          <ul className="list-disc space-y-1 pl-4">
            <li><b>Do zero:</b> escolha a caixa e coloque as peças uma a uma.</li>
            <li><b>Da obra:</b> informe ambientes e cargas; o app gera circuitos, proteções e o QDC.</li>
            <li><b>De modelo:</b> use um quadro salvo como modelo ou um exemplo pronto.</li>
          </ul>
        }
      />

      <section className="mb-5 grid grid-cols-3 gap-2">
        {OPCOES.map((o) => (
          <Link key={o.href} href={o.href} className="card flex flex-col items-center gap-2 p-3 text-center text-sm font-medium transition hover:border-accent">
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-fg">
              <o.icone className="size-5" />
            </span>
            {o.titulo}
          </Link>
        ))}
      </section>

      <nav className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1">
        <Link href="/quadros" className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold ${verModelos ? "text-muted" : "bg-surface shadow-sm"}`}>
          Meus quadros ({lista.length})
        </Link>
        <Link href="/quadros?aba=modelos" className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold ${verModelos ? "bg-surface shadow-sm" : "text-muted"}`}>
          Modelos ({modelos.length})
        </Link>
      </nav>

      {verModelos ? (
        <ListaModelos
          modelos={modelos.map((m) => ({ id: m.id, nome: m.nome, descricao: m.descricao, dados: lerQuadro(m.dados), atualizadoEm: dataCurta(m.atualizadoEm) }))}
          exemplos={EXEMPLOS.map(({ id, nome, descricao }) => ({ id, nome, descricao }))}
          clientes={listaClientes}
        />
      ) : lista.length === 0 ? (
        <Vazio
          icone={LayoutGrid}
          titulo="Nenhum quadro ainda"
        />
      ) : (
        <ul className="card divide-y divide-border">
          {lista.map(({ q, cliente }) => {
            const dados = lerQuadro(q.dados);
            const a = analisarQuadro(dados);
            const st = STATUS[a.status];
            return (
              <li key={q.id}>
                <Link href={`/quadros/${q.id}`} className="flex items-center gap-3 p-2.5 transition hover:bg-surface-2">
                  <span className="shrink-0 rounded-lg bg-surface-2">
                    <MiniaturaQuadro dados={dados} pequena />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{q.nome}</span>
                    <span className="block truncate text-xs text-muted">
                      {dados.circuitos.length} circ. · {(a.potenciaTotalW / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kW
                      {cliente ? ` · ${cliente}` : ""}
                    </span>
                  </span>
                  <Badge tom={st.tom}>{st.rotulo}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
