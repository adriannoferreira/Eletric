import { desc, eq, sql } from "drizzle-orm";
import { FilePlus2, FileText, LayoutGrid, Mail, MapPin, MessageCircle, Pencil, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Cabecalho } from "@/components/ui";
import { clientes, db, orcamentoItens, orcamentos, quadros } from "@/db";
import { dataCurta, linkWhatsApp, reais } from "@/lib/formato";
import { ORIGENS_CLIENTE, STATUS_ORCAMENTO, TIPOS_CLIENTE } from "@/lib/opcoes";
import { ExcluirCliente } from "./excluir";

export default async function ClientePage({ params }: PageProps<"/clientes/[id]">) {
  const id = Number((await params).id);
  const [c] = Number.isInteger(id) ? await db.select().from(clientes).where(eq(clientes.id, id)) : [];
  if (!c) notFound();

  const [orcs, qds] = await Promise.all([
    db
      .select({
        id: orcamentos.id,
        titulo: orcamentos.titulo,
        status: orcamentos.status,
        criadoEm: orcamentos.criadoEm,
        desconto: orcamentos.desconto,
        bruto: sql<number>`coalesce(sum(${orcamentoItens.quantidade} * ${orcamentoItens.precoUnitario}), 0)`.mapWith(Number),
      })
      .from(orcamentos)
      .leftJoin(orcamentoItens, eq(orcamentoItens.orcamentoId, orcamentos.id))
      .where(eq(orcamentos.clienteId, id))
      .groupBy(orcamentos.id)
      .orderBy(desc(orcamentos.criadoEm)),
    db.select({ id: quadros.id, nome: quadros.nome }).from(quadros).where(eq(quadros.clienteId, id)),
  ]);

  const endereco = [c.endereco, c.bairro, c.cidade].filter(Boolean).join(", ");

  return (
    <>
      <Cabecalho
        titulo={c.nome}
        subtitulo={`${TIPOS_CLIENTE[c.tipo as keyof typeof TIPOS_CLIENTE] ?? c.tipo} · veio por ${
          ORIGENS_CLIENTE[c.origem as keyof typeof ORIGENS_CLIENTE] ?? c.origem
        }`}
        voltar="/clientes"
        acoes={
          <Link href={`/clientes/${id}/editar`} className="btn btn-secondary">
            <Pencil className="size-4" /> Editar
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {c.telefone && (
          <a href={linkWhatsApp(c.telefone, `Olá ${c.nome.split(" ")[0]}, tudo bem?`)} target="_blank" className="btn btn-whatsapp">
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        )}
        {c.telefone && (
          <a href={`tel:${c.telefone.replace(/\D/g, "")}`} className="btn btn-secondary">
            <Phone className="size-4" /> Ligar
          </a>
        )}
        {endereco && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`} target="_blank" className="btn btn-secondary">
            <MapPin className="size-4" /> Mapa
          </a>
        )}
        <Link href={`/orcamentos/novo?cliente=${id}`} className="btn btn-primary">
          <FilePlus2 className="size-4" /> Orçamento
        </Link>
      </div>

      <section className="card mb-4 divide-y divide-border">
        {[
          { icone: Phone, valor: c.telefone },
          { icone: Mail, valor: c.email },
          { icone: MapPin, valor: endereco },
        ]
          .filter((l) => l.valor)
          .map((l, i) => (
            <p key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
              <l.icone className="size-4 text-muted" /> {l.valor}
            </p>
          ))}
        {c.documento && <p className="px-4 py-3 text-sm"><span className="text-muted">CPF/CNPJ:</span> {c.documento}</p>}
        {c.observacoes && <p className="whitespace-pre-wrap px-4 py-3 text-sm">{c.observacoes}</p>}
      </section>

      <section className="mb-4">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><FileText className="size-4" /> Orçamentos</h2>
        {orcs.length === 0 ? (
          <p className="card p-4 text-sm text-muted">Nenhum orçamento ainda.</p>
        ) : (
          <ul className="card divide-y divide-border">
            {orcs.map((o) => {
              const st = STATUS_ORCAMENTO[o.status] ?? STATUS_ORCAMENTO.rascunho;
              return (
                <li key={o.id}>
                  <Link href={`/orcamentos/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{o.titulo}</p>
                      <p className="text-xs text-muted">{dataCurta(o.criadoEm)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-semibold">{reais(o.bruto - o.desconto)}</span>
                      <Badge tom={st.tom}>{st.rotulo}</Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {qds.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><LayoutGrid className="size-4" /> Quadros</h2>
          <ul className="card divide-y divide-border">
            {qds.map((q) => (
              <li key={q.id}>
                <Link href={`/quadros/${q.id}`} className="block px-4 py-3 font-medium hover:bg-surface-2">{q.nome}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ExcluirCliente id={id} />
    </>
  );
}
