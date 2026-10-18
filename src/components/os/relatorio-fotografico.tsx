import Link from "next/link";
import type { Perfil } from "@/db/schema";
import { dataCurta } from "@/lib/formato";
import { CabecalhoDoc } from "./cabecalho-doc";

export type FotoRelatorio = { id: number; etapa: string; legenda: string; criadoEm: Date };
export type GrupoFotos = { titulo: string; sub?: string; fotos: FotoRelatorio[] };

export type Layout = "2" | "4" | "6";
export type Modo = "etapas" | "comparar";

const ETAPAS = [
  { v: "antes", r: "Antes" },
  { v: "durante", r: "Durante a execução" },
  { v: "depois", r: "Depois (serviço concluído)" },
] as const;

/** Altura da foto em cada layout, para caber 2, 4 ou 6 fotos por folha A4. */
const ALTURA: Record<Layout, string> = { "2": "h-[95mm]", "4": "h-[68mm]", "6": "h-[48mm]" };
const COLUNAS: Record<Layout, string> = { "2": "grid-cols-1", "4": "grid-cols-2", "6": "grid-cols-2" };

const hora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Belem",
});

export function lerOpcoes(sp: Record<string, string | string[] | undefined>) {
  const por = (["2", "4", "6"] as const).find((v) => v === sp.por) ?? "4";
  const modo: Modo = sp.modo === "comparar" ? "comparar" : "etapas";
  return { por, modo };
}

/** Relatório fotográfico (A4) de uma OS ou de todas as OS de uma obra/cliente. */
export function RelatorioFotografico({
  perfil,
  numero,
  cliente,
  local,
  servico,
  grupos,
  por,
  modo,
  base,
}: {
  perfil: Perfil | null;
  numero: string;
  cliente: string;
  local: string;
  servico: string;
  grupos: GrupoFotos[];
  por: Layout;
  modo: Modo;
  base: string;
}) {
  const todas = grupos.flatMap((g) => g.fotos);
  const datas = todas.map((f) => f.criadoEm.getTime());
  const periodo = datas.length
    ? `${dataCurta(new Date(Math.min(...datas)))} a ${dataCurta(new Date(Math.max(...datas)))}`
    : "—";
  let n = 0;

  const cartao = (f: FotoRelatorio, rotulo?: string) => {
    n++;
    return (
      <figure key={`${f.id}-${rotulo ?? ""}`} className="break-inside-avoid overflow-hidden rounded-lg border border-gray-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/os/foto/${f.id}`} alt={f.legenda || `Foto ${n}`} className={`w-full bg-gray-100 object-cover ${ALTURA[por]}`} />
        <figcaption className="space-y-0.5 px-2.5 py-1.5 text-xs">
          <p className="font-semibold">
            Foto {n}
            {rotulo ? ` · ${rotulo}` : ""}
          </p>
          {f.legenda && <p>{f.legenda}</p>}
          <p className="text-gray-500">{hora.format(f.criadoEm)}</p>
        </figcaption>
      </figure>
    );
  };

  return (
    <>
      <div className="no-print mx-auto flex max-w-[210mm] flex-wrap items-center gap-2 px-6 pt-4 text-sm">
        <span className="text-gray-600">Fotos por folha:</span>
        {(["2", "4", "6"] as const).map((v) => (
          <Link key={v} href={`${base}?por=${v}&modo=${modo}`} className={`rounded-full border px-3 py-1 ${por === v ? "border-[#f5b301] bg-[#fff4cc]" : "border-gray-300"}`}>
            {v}
          </Link>
        ))}
        <span className="ml-2 text-gray-600">Organizar:</span>
        {(
          [
            ["etapas", "Por etapa"],
            ["comparar", "Antes × Depois"],
          ] as const
        ).map(([v, r]) => (
          <Link key={v} href={`${base}?por=${por}&modo=${v}`} className={`rounded-full border px-3 py-1 ${modo === v ? "border-[#f5b301] bg-[#fff4cc]" : "border-gray-300"}`}>
            {r}
          </Link>
        ))}
      </div>

      <main className="mx-auto max-w-[210mm] space-y-6 p-6 text-sm print:p-0">
        <CabecalhoDoc perfil={perfil} titulo="Relatório fotográfico" numero={numero} data={dataCurta(new Date())} />

        <section className="grid gap-3 sm:grid-cols-2">
          <Info r="Cliente" v={cliente} />
          <Info r="Local" v={local || "—"} />
          <Info r="Serviço / obra" v={servico} />
          <Info r="Período dos registros" v={`${periodo} · ${todas.length} foto(s)`} />
        </section>

        {todas.length === 0 && <p className="rounded-lg bg-gray-100 p-4 text-gray-600">Nenhuma foto registrada ainda.</p>}

        {grupos
          .filter((g) => g.fotos.length)
          .map((g, gi) => (
            <section key={gi} className="space-y-4">
              {grupos.length > 1 && (
                <div className="break-after-avoid border-b border-gray-300 pb-1">
                  <h2 className="text-base font-bold">{g.titulo}</h2>
                  {g.sub && <p className="text-xs text-gray-600">{g.sub}</p>}
                </div>
              )}
              {modo === "comparar" ? (
                <Comparacao fotos={g.fotos} cartao={cartao} />
              ) : (
                ETAPAS.map((et) => {
                  const lista = g.fotos.filter((f) => f.etapa === et.v);
                  if (!lista.length) return null;
                  return (
                    <div key={et.v} className="space-y-2">
                      <h3 className="break-after-avoid text-xs font-bold uppercase tracking-wider text-gray-600">{et.r}</h3>
                      <div className={`grid gap-3 ${COLUNAS[por]}`}>{lista.map((f) => cartao(f))}</div>
                    </div>
                  );
                })
              )}
            </section>
          ))}

        <footer className="break-inside-avoid space-y-8 pt-6">
          <p className="text-xs text-gray-500">
            Registros fotográficos feitos no local durante a execução do serviço. Data e hora conforme o registro no aplicativo.
          </p>
          <div className="grid gap-8 sm:grid-cols-2">
            <Assinatura r={perfil?.nome || perfil?.empresa || "Responsável técnico"} sub={perfil?.registroProfissional || "Responsável pelo serviço"} />
            <Assinatura r={cliente} sub="Cliente (ciente)" />
          </div>
        </footer>
      </main>
    </>
  );
}

function Comparacao({ fotos, cartao }: { fotos: FotoRelatorio[]; cartao: (f: FotoRelatorio, r?: string) => React.ReactNode }) {
  const antes = fotos.filter((f) => f.etapa === "antes");
  const depois = fotos.filter((f) => f.etapa === "depois");
  const durante = fotos.filter((f) => f.etapa === "durante");
  const pares = Math.max(antes.length, depois.length);
  return (
    <div className="space-y-3">
      {Array.from({ length: pares }, (_, i) => (
        <div key={i} className="grid break-inside-avoid grid-cols-2 gap-3">
          {antes[i] ? cartao(antes[i], "Antes") : <Vazio r="Sem foto de antes" />}
          {depois[i] ? cartao(depois[i], "Depois") : <Vazio r="Sem foto de depois" />}
        </div>
      ))}
      {durante.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Durante a execução</h3>
          <div className="grid grid-cols-2 gap-3">{durante.map((f) => cartao(f, "Durante"))}</div>
        </div>
      )}
    </div>
  );
}

function Vazio({ r }: { r: string }) {
  return <div className="grid min-h-24 place-items-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">{r}</div>;
}

function Info({ r, v }: { r: string; v: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{r}</p>
      <p className="font-medium">{v}</p>
    </div>
  );
}

function Assinatura({ r, sub }: { r: string; sub: string }) {
  return (
    <div className="text-center text-xs">
      <div className="mb-1 border-t border-gray-500" />
      <p className="font-semibold">{r}</p>
      <p className="text-gray-500">{sub}</p>
    </div>
  );
}
