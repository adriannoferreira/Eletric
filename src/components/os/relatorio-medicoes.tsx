import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Perfil } from "@/db/schema";
import type { Medicao } from "@/db/schema-servicos";
import { dataCurta } from "@/lib/formato";
import { avaliarMedicao, resumoResultados, tipoMedicao } from "@/lib/servicos/medicoes";
import { CabecalhoDoc } from "./cabecalho-doc";

export type InstrumentoRel = {
  id: number;
  nome: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  proximaVerificacao: string | null;
};

export type GrupoMedicoes = { titulo: string; sub?: string; medicoes: Medicao[]; analise?: string };

const ROTULO: Record<string, { r: string; cls: string }> = {
  ok: { r: "Conforme", cls: "bg-green-100 text-green-800" },
  aviso: { r: "Atenção", cls: "bg-amber-100 text-amber-800" },
  nc: { r: "Não conforme", cls: "bg-red-100 text-red-800" },
};

const hora = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Belem" });

/** Relatório de medições elétricas (A4) de uma OS ou de todas as OS de um cliente. */
export function RelatorioMedicoes({
  perfil,
  numero,
  cliente,
  local,
  servico,
  grupos,
  instrumentos,
}: {
  perfil: Perfil | null;
  numero: string;
  cliente: string;
  local: string;
  servico: string;
  grupos: GrupoMedicoes[];
  instrumentos: InstrumentoRel[];
}) {
  const todas = grupos.flatMap((g) => g.medicoes);
  const resumo = resumoResultados(todas);
  const usados = instrumentos.filter((i) => todas.some((m) => m.instrumentoId === i.id));
  const datas = todas.map((m) => m.criadoEm.getTime());
  const periodo = datas.length ? `${dataCurta(new Date(Math.min(...datas)))} a ${dataCurta(new Date(Math.max(...datas)))}` : "—";
  const conferir = [...new Set(todas.map((m) => tipoMedicao(m.tipo)).filter((t) => t.conferir).map((t) => t.nome))];
  const pendencias = todas.filter((m) => m.resultado !== "ok");
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-[210mm] space-y-6 p-6 text-sm print:p-0">
      <CabecalhoDoc perfil={perfil} titulo="Relatório de medições elétricas" numero={numero} data={dataCurta(new Date())} />

      <section className="grid gap-3 sm:grid-cols-2">
        <Info r="Cliente" v={cliente} />
        <Info r="Local" v={local || "—"} />
        <Info r="Serviço / obra" v={servico} />
        <Info r="Período das medições" v={`${periodo} · ${todas.length} medição(ões)`} />
      </section>

      <section className="grid grid-cols-3 gap-2 text-center">
        <Contador n={resumo.ok} r="Conformes" cls="border-green-300 bg-green-50 text-green-800" />
        <Contador n={resumo.aviso} r="Atenção" cls="border-amber-300 bg-amber-50 text-amber-800" />
        <Contador n={resumo.nc} r="Não conformes" cls="border-red-300 bg-red-50 text-red-800" />
      </section>
      <p className={`rounded-lg px-3 py-2 font-semibold ${ROTULO[resumo.geral].cls}`}>
        Resultado geral:{" "}
        {todas.length === 0
          ? "nenhuma medição registrada"
          : resumo.geral === "ok"
            ? "instalação conforme nos pontos medidos"
            : resumo.geral === "aviso"
              ? "conforme, com pontos de atenção"
              : "há não conformidades que exigem correção"}
      </p>

      {usados.length > 0 && (
        <Sec t="Instrumentos utilizados">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-300 text-left text-gray-600">
                <th className="py-1.5 font-medium">Instrumento</th>
                <th className="py-1.5 font-medium">Nº de série</th>
                <th className="py-1.5 font-medium">Calibração/verificação</th>
              </tr>
            </thead>
            <tbody>
              {usados.map((i) => (
                <tr key={i.id} className="border-b border-gray-200">
                  <td className="py-1.5 pr-2">{[i.nome, i.marca, i.modelo].filter(Boolean).join(" ")}</td>
                  <td className="py-1.5 pr-2">{i.numeroSerie || "—"}</td>
                  <td className="py-1.5">
                    {i.proximaVerificacao ? (
                      <>
                        válida até {dataCurta(i.proximaVerificacao + "T12:00:00")}
                        {i.proximaVerificacao < hoje && <span className="ml-1 font-semibold text-red-700">(vencida)</span>}
                      </>
                    ) : (
                      "não informada"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Sec>
      )}

      {grupos
        .filter((g) => g.medicoes.length)
        .map((g, gi) => (
          <Sec key={gi} t={grupos.length > 1 ? g.titulo : "Medições realizadas"} sub={grupos.length > 1 ? g.sub : undefined}>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-300 text-left text-gray-600">
                  <th className="py-1.5 font-medium">#</th>
                  <th className="py-1.5 font-medium">Ponto</th>
                  <th className="py-1.5 font-medium">Medição</th>
                  <th className="py-1.5 text-right font-medium">Valor</th>
                  <th className="py-1.5 pl-2 font-medium">Critério</th>
                  <th className="py-1.5 text-right font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {g.medicoes.map((m, i) => {
                  const t = tipoMedicao(m.tipo);
                  const av = avaliarMedicao(m.tipo, m.valor, m.parametros, m.limiteMin, m.limiteMax);
                  const r = ROTULO[m.resultado] ?? ROTULO.ok;
                  return (
                    <tr key={m.id} className="break-inside-avoid border-b border-gray-200 align-top">
                      <td className="py-1.5 pr-1 text-gray-500">{i + 1}</td>
                      <td className="py-1.5 pr-2">
                        {m.ponto || "—"}
                        {m.observacao && <p className="text-gray-500">{m.observacao}</p>}
                      </td>
                      <td className="py-1.5 pr-2">
                        {t.nome}
                        <p className="text-gray-500">{hora.format(m.criadoEm)}</p>
                      </td>
                      <td className="whitespace-nowrap py-1.5 text-right font-semibold">
                        {m.valor.toLocaleString("pt-BR")} {m.unidade}
                      </td>
                      <td className="py-1.5 pl-2 text-gray-600">{av.criterio}</td>
                      <td className="py-1.5 text-right">
                        <span className={`whitespace-nowrap rounded px-1.5 py-0.5 font-semibold ${r.cls}`}>{r.r}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Sec>
        ))}

      {pendencias.length > 0 && (
        <Sec t="Pendências">
          <ul className="list-disc space-y-1 pl-5">
            {pendencias.map((m) => (
              <li key={m.id}>
                <strong>{ROTULO[m.resultado]?.r}:</strong> {tipoMedicao(m.tipo).nome} em {m.ponto || "ponto não informado"} —{" "}
                {m.valor.toLocaleString("pt-BR")} {m.unidade}
              </li>
            ))}
          </ul>
        </Sec>
      )}

      {grupos.some((g) => g.analise?.trim()) && (
        <Sec t="Análise e recomendações">
          {grupos
            .filter((g) => g.analise?.trim())
            .map((g, i) => (
              <div key={i} className="space-y-2 [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
                {grupos.length > 1 && <p className="font-semibold">{g.titulo}</p>}
                <Markdown remarkPlugins={[remarkGfm]}>{g.analise!}</Markdown>
              </div>
            ))}
        </Sec>
      )}

      <footer className="break-inside-avoid space-y-6 pt-4 text-xs">
        <div className="space-y-1 text-gray-500">
          <p>
            Critérios usados: faixas de tensão do PRODIST Módulo 8, ABNT NBR 5410 (verificação final), NBR NM 61008 (DR) e valores de
            referência de campo.
          </p>
          {conferir.length > 0 && (
            <p>
              Limites de referência a conferir na edição vigente da norma/fabricante: {conferir.join(", ")}. Os valores refletem as
              condições no momento da medição.
            </p>
          )}
        </div>
        <div className="grid gap-8 pt-6 sm:grid-cols-2">
          <Assinatura r={perfil?.nome || perfil?.empresa || "Responsável técnico"} sub={perfil?.registroProfissional || "Responsável pelas medições"} />
          <Assinatura r={cliente} sub="Cliente (ciente)" />
        </div>
      </footer>
    </main>
  );
}

function Sec({ t, sub, children }: { t: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="border-b border-gray-300 pb-1">
        <h2 className="text-base font-bold">{t}</h2>
        {sub && <p className="text-xs text-gray-600">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Info({ r, v }: { r: string; v: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{r}</p>
      <p className="font-medium">{v}</p>
    </div>
  );
}

function Contador({ n, r, cls }: { n: number; r: string; cls: string }) {
  return (
    <div className={`rounded-lg border p-2 ${cls}`}>
      <p className="text-2xl font-bold">{n}</p>
      <p className="text-xs">{r}</p>
    </div>
  );
}

function Assinatura({ r, sub }: { r: string; sub: string }) {
  return (
    <div className="text-center">
      <div className="mb-1 border-t border-gray-500" />
      <p className="font-semibold">{r}</p>
      <p className="text-gray-500">{sub}</p>
    </div>
  );
}
