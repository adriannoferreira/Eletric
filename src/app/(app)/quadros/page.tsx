import { desc, eq } from "drizzle-orm";
import { BookCopy, LayoutGrid, PencilRuler, User, Wand2 } from "lucide-react";
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
  { href: "/quadros/novo", icone: PencilRuler, titulo: "Montar do zero", texto: "Escolha a caixa e coloque as peças uma a uma no construtor." },
  { href: "/quadros/projeto", icone: Wand2, titulo: "Gerar projeto da obra", texto: "Informe ambientes e cargas: o app gera circuitos, proteções e o QDC." },
  { href: "/quadros?aba=modelos", icone: BookCopy, titulo: "A partir de um modelo", texto: "Use um quadro salvo como modelo ou um dos exemplos prontos." },
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
      <Cabecalho titulo="Quadros" subtitulo="Monte, gere ou reaproveite quadros de distribuição verificados pela NBR 5410" />

      <section className="mb-5 grid gap-2 sm:grid-cols-3">
        {OPCOES.map((o) => (
          <Link key={o.href} href={o.href} className="card flex items-start gap-3 p-4 transition hover:border-accent">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg">
              <o.icone className="size-5" />
            </span>
            <span>
              <span className="block font-semibold">{o.titulo}</span>
              <span className="block text-sm text-muted">{o.texto}</span>
            </span>
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
          texto="Escolha uma das três formas acima para começar."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map(({ q, cliente }) => {
            const dados = lerQuadro(q.dados);
            const a = analisarQuadro(dados);
            const st = STATUS[a.status];
            return (
              <li key={q.id}>
                <Link href={`/quadros/${q.id}`} className="card block overflow-hidden transition hover:border-accent">
                  <div className="bg-surface-2 p-3">
                    <MiniaturaQuadro dados={dados} />
                  </div>
                  <div className="space-y-1.5 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold">{q.nome}</p>
                      <Badge tom={st.tom}>{st.rotulo}</Badge>
                    </div>
                    <p className="text-sm text-muted">
                      {dados.circuitos.length} circuito(s) · {a.modulosUsados}/{a.modulosTotais} módulos ·{" "}
                      {(a.potenciaTotalW / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kW
                      {dados.projeto ? " · projeto da obra" : ""}
                    </p>
                    <p className="flex items-center justify-between text-xs text-muted">
                      <span className="flex items-center gap-1">{cliente && <><User className="size-3" />{cliente}</>}</span>
                      <span>{dataCurta(q.atualizadoEm)}</span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
