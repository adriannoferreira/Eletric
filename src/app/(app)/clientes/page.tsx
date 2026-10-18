import { desc, ilike, or } from "drizzle-orm";
import { MapPin, Phone, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { Badge, Cabecalho, Vazio } from "@/components/ui";
import { clientes, db } from "@/db";
import { TIPOS_CLIENTE } from "@/lib/opcoes";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const { q } = await searchParams;
  const busca = typeof q === "string" ? q.trim() : "";
  const lista = await db
    .select()
    .from(clientes)
    .where(
      busca
        ? or(
            ilike(clientes.nome, `%${busca}%`),
            ilike(clientes.telefone, `%${busca}%`),
            ilike(clientes.bairro, `%${busca}%`),
          )
        : undefined,
    )
    .orderBy(desc(clientes.atualizadoEm))
    .limit(200);

  return (
    <>
      <Cabecalho
        titulo="Clientes"
        subtitulo={`${lista.length} ${lista.length === 1 ? "cliente" : "clientes"}`}
        acoes={
          <Link href="/clientes/novo" className="btn btn-primary">
            <Plus className="size-4" /> Novo
          </Link>
        }
      />
      <form className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={busca} placeholder="Buscar por nome, telefone ou bairro" className="input pl-10" />
      </form>
      {lista.length === 0 ? (
        <Vazio
          icone={Users}
          titulo={busca ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
          texto={busca ? undefined : "Cadastre seu primeiro cliente para começar a fazer orçamentos."}
          acao={!busca && <Link href="/clientes/novo" className="btn btn-primary">Cadastrar cliente</Link>}
        />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {lista.map((c) => (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="card flex items-center gap-3 p-3.5 transition hover:border-accent">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft font-bold">
                  {c.nome.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.nome}</p>
                  <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
                    {c.telefone && (
                      <span className="flex items-center gap-1"><Phone className="size-3.5" />{c.telefone}</span>
                    )}
                    {(c.bairro || c.cidade) && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="size-3.5" />{[c.bairro, c.cidade].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </p>
                </div>
                <Badge>{TIPOS_CLIENTE[c.tipo as keyof typeof TIPOS_CLIENTE] ?? c.tipo}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
