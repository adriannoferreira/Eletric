import { desc, eq } from "drizzle-orm";
import { LayoutGrid, Plus, User } from "lucide-react";
import Link from "next/link";
import { MiniaturaQuadro } from "@/components/quadro/miniatura";
import { Badge, Cabecalho, Vazio } from "@/components/ui";
import { clientes, db, quadros } from "@/db";
import { analisarQuadro } from "@/lib/eletrica/calculo";
import { lerQuadro } from "@/lib/eletrica/tipos";
import { dataCurta } from "@/lib/formato";

export const metadata = { title: "Quadros" };

const STATUS = {
  ok: { tom: "ok", rotulo: "Conforme" },
  info: { tom: "ok", rotulo: "Conforme" },
  aviso: { tom: "aviso", rotulo: "Atenção" },
  erro: { tom: "perigo", rotulo: "Corrigir" },
} as const;

export default async function QuadrosPage() {
  const lista = await db
    .select({ q: quadros, cliente: clientes.nome })
    .from(quadros)
    .leftJoin(clientes, eq(clientes.id, quadros.clienteId))
    .orderBy(desc(quadros.atualizadoEm));

  return (
    <>
      <Cabecalho
        titulo="Quadros"
        subtitulo="Monte o QDC com peças reais e verifique pela NBR 5410"
        acoes={
          <Link href="/quadros/novo" className="btn btn-primary">
            <Plus className="size-4" /> Novo quadro
          </Link>
        }
      />
      {lista.length === 0 ? (
        <Vazio
          icone={LayoutGrid}
          titulo="Nenhum quadro ainda"
          texto="Monte um quadro de distribuição peça por peça: o app dimensiona cabos e disjuntores, verifica DR, DPS e balanceamento de fases."
          acao={<Link href="/quadros/novo" className="btn btn-primary">Montar meu primeiro quadro</Link>}
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
