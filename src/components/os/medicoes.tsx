"use client";

import { ChevronDown, FileText, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { adicionarMedicao, excluirMedicao, salvarAnaliseMedicoes } from "@/app/(app)/os/actions";
import { Ajuda, Conferir } from "@/components/divulgacao";
import { lerStream, TextoIA } from "@/components/texto-ia";
import { Badge, type Tom } from "@/components/ui";
import type { Medicao } from "@/db/schema-servicos";
import { avaliarMedicao, resumoResultados, TIPOS_MEDICAO, tipoMedicao } from "@/lib/servicos/medicoes";

export type Instrumento = { id: number; nome: string; marca: string; modelo: string; proximaVerificacao: string | null };

export const TOM_RESULTADO: Record<string, { tom: Tom; rotulo: string }> = {
  ok: { tom: "ok", rotulo: "Conforme" },
  aviso: { tom: "aviso", rotulo: "Atenção" },
  nc: { tom: "perigo", rotulo: "Não conforme" },
};

/** Aceita "1,5" e "1.5". */
const lerNumero = (s: string) => {
  const n = Number(s.trim().replace(/\s/g, "").replace(",", "."));
  return s.trim() && Number.isFinite(n) ? n : null;
};

export function Medicoes({
  osId,
  titulo,
  medicoes,
  instrumentos,
  analise,
}: {
  osId: number;
  titulo: string;
  medicoes: Medicao[];
  instrumentos: Instrumento[];
  analise: string;
}) {
  const [tipo, setTipo] = useState("tensao_fn");
  const [ponto, setPonto] = useState("");
  const [valor, setValor] = useState("");
  const [params, setParams] = useState<Record<string, number>>({});
  const [instrumentoId, setInstrumentoId] = useState<number | null>(instrumentos[0]?.id ?? null);
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [texto, setTexto] = useState(analise);
  const [analisando, setAnalisando] = useState(false);

  const t = tipoMedicao(tipo);
  const numero = lerNumero(valor);
  const previa = useMemo(() => (numero == null ? null : avaliarMedicao(tipo, numero, params)), [tipo, numero, params]);
  const resumo = resumoResultados(medicoes);

  function adicionar() {
    if (numero == null) return setErro("Informe o valor medido.");
    setErro(null);
    iniciar(async () => {
      const e = await adicionarMedicao(osId, {
        tipo,
        ponto,
        valor: numero,
        unidade: t.unidade,
        parametros: Object.fromEntries(t.parametros.map((p) => [p.chave, params[p.chave] ?? p.padrao])),
        instrumentoId,
        observacao: obs,
      });
      if (e) setErro(e);
      else {
        setValor("");
        setObs("");
      }
    });
  }

  async function analisarComIA() {
    setAnalisando(true);
    setTexto("");
    const linhas = medicoes.map((m) => {
      const tm = tipoMedicao(m.tipo);
      const av = avaliarMedicao(m.tipo, m.valor, m.parametros, m.limiteMin, m.limiteMax);
      return `- ${m.ponto || "—"} | ${tm.nome}: ${m.valor} ${m.unidade} | critério ${av.criterio} | ${TOM_RESULTADO[m.resultado]?.rotulo ?? m.resultado}${m.observacao ? ` | obs: ${m.observacao}` : ""}`;
    });
    const pedido = `Redija a seção "Análise e recomendações" de um relatório de medições elétricas do serviço "${titulo}". Medições:\n${linhas.join("\n")}\n\nPara cada não conformidade ou ponto de atenção: provável causa, risco e correção recomendada, em ordem de prioridade. Termine com uma conclusão geral de 2 a 3 frases. Texto técnico e direto, em Markdown, sem repetir a tabela inteira. Se algum limite usado for apenas de referência, diga que deve ser conferido na norma vigente.`;
    try {
      const res = await fetch("/api/ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistente: "eletrica", esforco: "medium", pedido }),
      });
      let final = "";
      await lerStream(res, (acc) => {
        final = acc;
        setTexto(acc);
      });
      if (res.ok && final.trim()) await salvarAnaliseMedicoes(osId, final);
    } catch {
      setTexto("⚠️ Sem conexão. Tente de novo.");
    } finally {
      setAnalisando(false);
    }
  }

  return (
    <div className="space-y-4">
      {medicoes.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge tom="ok">{resumo.ok} conforme(s)</Badge>
            {resumo.aviso > 0 && <Badge tom="aviso">{resumo.aviso} atenção</Badge>}
            {resumo.nc > 0 && <Badge tom="perigo">{resumo.nc} não conforme(s)</Badge>}
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {medicoes.map((m) => {
              const tm = tipoMedicao(m.tipo);
              const r = TOM_RESULTADO[m.resultado] ?? TOM_RESULTADO.ok;
              return (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{tm.nome}</p>
                    <p className="truncate text-xs text-muted">{m.ponto || "—"}{m.observacao ? ` · ${m.observacao}` : ""}</p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {m.valor.toLocaleString("pt-BR")} {m.unidade}
                  </span>
                  <Badge tom={r.tom}>{r.rotulo}</Badge>
                  <button
                    onClick={() => confirm("Excluir esta medição?") && iniciar(() => excluirMedicao(osId, m.id))}
                    className="btn btn-ghost p-1.5 text-muted hover:text-danger"
                    aria-label="Excluir medição"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <details open={medicoes.length === 0} className="group space-y-3 rounded-xl bg-surface-2 p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <Plus className="size-4" /> Nova medição
          </span>
          <ChevronDown className="size-4 text-muted transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setParams({});
            }}
            className="input"
          >
            {[...new Set(TIPOS_MEDICAO.map((x) => x.grupo))].map((g) => (
              <optgroup key={g} label={g}>
                {TIPOS_MEDICAO.filter((x) => x.grupo === g).map((x) => (
                  <option key={x.chave} value={x.chave}>
                    {x.nome}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <input value={ponto} onChange={(e) => setPonto(e.target.value)} placeholder="Onde (ex.: Circuito 3)" className="input" />
          {t.parametros.map((p) => (
            <label key={p.chave} className="flex items-center gap-2 text-sm">
              <span className="shrink-0 text-muted">{p.rotulo}</span>
              {p.opcoes ? (
                <select
                  value={params[p.chave] ?? p.padrao}
                  onChange={(e) => setParams({ ...params, [p.chave]: Number(e.target.value) })}
                  className="input py-2"
                >
                  {p.opcoes.map((o) => (
                    <option key={o} value={o}>
                      {o} {p.unidade}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  inputMode="decimal"
                  defaultValue={p.padrao}
                  onChange={(e) => setParams({ ...params, [p.chave]: lerNumero(e.target.value) ?? p.padrao })}
                  className="input py-2"
                />
              )}
            </label>
          ))}
          <div className="flex items-center gap-2">
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              inputMode="decimal"
              placeholder="Valor medido"
              className="input text-lg font-semibold"
            />
            <span className="w-10 shrink-0 text-sm text-muted">{t.unidade}</span>
          </div>
          {instrumentos.length > 0 && (
            <select value={instrumentoId ?? ""} onChange={(e) => setInstrumentoId(Number(e.target.value) || null)} className="input">
              <option value="">Instrumento não informado</option>
              {instrumentos.map((i) => (
                <option key={i.id} value={i.id}>
                  {[i.nome, i.marca, i.modelo].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          )}
          <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação (opcional)" className="input sm:col-span-2" />
        </div>
        {previa && (
          <p className="flex items-center gap-2 text-sm">
            <Badge tom={TOM_RESULTADO[previa.resultado].tom}>{TOM_RESULTADO[previa.resultado].rotulo}</Badge>
            <span className="text-muted">{previa.criterio}</span>
            {t.conferir && <Conferir itens={[`${t.nome}: ${t.referencia}. Conferir na edição vigente da norma/fabricante.`]} />}
          </p>
        )}
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button onClick={adicionar} disabled={pendente} className="btn btn-primary w-full sm:w-auto">
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Registrar medição
        </button>
        {instrumentos.length === 0 && (
          <Ajuda titulo="Instrumentos no relatório">
            <p>Cadastre multímetro, alicate, megômetro e terrômetro em Equipamentos (categoria “Instrumento de medição”) para aparecerem no relatório.</p>
          </Ajuda>
        )}
        </div>
      </details>

      {medicoes.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={analisarComIA} disabled={analisando} className="btn btn-secondary">
              {analisando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {texto ? "Refazer análise com IA" : "Analisar com IA"}
            </button>
            <a href={`/os/${osId}/medicoes`} target="_blank" className="btn btn-secondary">
              <FileText className="size-4" /> Relatório de medições
            </a>
          </div>
          {texto && (
            <div className="rounded-xl border border-border p-3">
              <TextoIA>{texto}</TextoIA>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
