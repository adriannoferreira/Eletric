"use client";

import { CalendarClock, Camera, FileText, Loader2, MessageCircle, Plus, Sparkles, Trash2, Wrench, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { gerarOrcamentoPendencias } from "@/app/(app)/quadros/actions";
import { lerStream } from "@/components/texto-ia";
import { Campo } from "@/components/ui";
import { dentroDoLimite } from "@/lib/eletrica/inspecao";
import {
  gerarChecklistManutencao,
  type ItemManutencao,
  manutencaoPadrao,
  novaVisita,
  proximaData,
  resultadoManutencao,
  resumirVisita,
  sugerirPeriodicidade,
  tendencia,
  textoLimiteItem,
} from "@/lib/eletrica/manutencao";
import { type Manutencao, PERIODICIDADES, type Periodicidade, type QuadroDados, type RespostaManutencao, type Visita } from "@/lib/eletrica/tipos";
import { linkWhatsApp } from "@/lib/formato";
import { BotaoOrcamento } from "./dialogo-orcamento";
import { reduzirFoto } from "./painel-inspecao";

const ESTADO = {
  bom: { rotulo: "Bom", cls: "bg-ok-soft text-ok" },
  atencao: { rotulo: "Atenção", cls: "bg-warn-soft text-warn" },
  critico: { rotulo: "Crítico", cls: "bg-danger-soft text-danger" },
} as const;

const dataBR = (d: string) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("pt-BR") : "—");

export function PainelManutencao({
  id,
  nome,
  dados,
  tecnicoPadrao,
  cliente,
  clienteId,
  clientes,
  aoSalvar,
}: {
  id: number;
  nome: string;
  dados: QuadroDados;
  tecnicoPadrao: string;
  cliente: { nome: string; telefone: string } | null;
  clienteId: number | null;
  clientes: { id: number; nome: string }[];
  aoSalvar: (m: Manutencao) => void;
}) {
  const itens = useMemo(() => gerarChecklistManutencao(dados), [dados]);
  const [m, setM] = useState<Manutencao>(() => dados.manutencao ?? manutencaoPadrao(dados));
  const [visitaId, setVisitaId] = useState<string | null>(m.visitas.at(-1)?.id ?? null);
  const [salvando, setSalvando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salvarRef = useRef(aoSalvar);
  useEffect(() => {
    salvarRef.current = aoSalvar;
  });
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function mudar(nova: Manutencao) {
    setM(nova);
    setSalvando(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      salvarRef.current(nova);
      setSalvando(false);
    }, 700);
  }

  const idx = m.visitas.findIndex((v) => v.id === visitaId);
  const visita = idx >= 0 ? m.visitas[idx] : null;
  const anterior = idx > 0 ? m.visitas[idx - 1] : undefined;
  const mudarVisita = (patch: Partial<Visita>) =>
    visita && mudar({ ...m, visitas: m.visitas.map((v) => (v.id === visita.id ? { ...v, ...patch } : v)) });

  function responder(itemId: string, patch: Partial<RespostaManutencao>) {
    if (!visita) return;
    const existe = visita.respostas.find((r) => r.itemId === itemId);
    const nova: RespostaManutencao = { itemId, status: null, valor: null, obs: "", ...existe, ...patch };
    mudarVisita({ respostas: existe ? visita.respostas.map((r) => (r.itemId === itemId ? nova : r)) : [...visita.respostas, nova] });
  }

  const atrasada = m.proximaVisita && m.proximaVisita < new Date().toISOString().slice(0, 10);
  const resumo = visita ? resumirVisita(itens, visita) : null;
  const tend = visita ? tendencia(itens, visita, anterior) : [];

  return (
    <div className="space-y-4">
      {/* Plano */}
      <section className="grid gap-3 rounded-2xl bg-surface-2 p-3 sm:grid-cols-3">
        <Campo rotulo="Periodicidade" dica={`Sugestão para este imóvel: ${sugerirPeriodicidade(dados.projeto?.obra.tipoImovel)}`}>
          <select
            value={m.periodicidade}
            onChange={(e) => {
              const periodicidade = e.target.value as Periodicidade;
              const base = m.visitas.at(-1)?.data ?? new Date().toISOString();
              mudar({ ...m, periodicidade, proximaVisita: proximaData(base, periodicidade) });
            }}
            className="input"
          >
            {Object.keys(PERIODICIDADES).map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Próxima visita">
          <input type="date" value={m.proximaVisita} onChange={(e) => mudar({ ...m, proximaVisita: e.target.value })} className={`input ${atrasada ? "border-danger" : ""}`} />
        </Campo>
        <div className="flex items-end">
          <button
            className="btn btn-primary w-full"
            onClick={() => {
              const v = novaVisita(m, tecnicoPadrao);
              mudar({ ...m, visitas: [...m.visitas, v], proximaVisita: proximaData(v.data, m.periodicidade) });
              setVisitaId(v.id);
            }}
          >
            <Plus className="size-4" /> Nova visita
          </button>
        </div>
        {atrasada && <p className="text-sm text-danger sm:col-span-3">Manutenção atrasada desde {dataBR(m.proximaVisita)}.</p>}
        <p className="text-xs text-muted sm:col-span-3">
          <CalendarClock className="mr-1 inline size-3.5" />
          A tela Início avisa quando a próxima visita estiver a 7 dias ou atrasada.
        </p>
      </section>

      {!visita ? (
        <p className="card p-6 text-center text-sm text-muted">
          Nenhuma visita registrada. Toque em “Nova visita” para abrir o checklist de manutenção preventiva deste quadro.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <select value={visita.id} onChange={(e) => setVisitaId(e.target.value)} className="input w-auto flex-1">
              {[...m.visitas].reverse().map((v) => (
                <option key={v.id} value={v.id}>
                  Visita nº {v.numero} — {dataBR(v.data)}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={visita.data.slice(0, 10)}
              onChange={(e) => e.target.value && mudarVisita({ data: new Date(e.target.value + "T12:00:00").toISOString() })}
              className="input w-auto"
            />
            <button
              className="btn btn-danger p-2.5"
              aria-label="Excluir visita"
              onClick={() => {
                if (!confirm("Excluir esta visita do histórico?")) return;
                const visitas = m.visitas.filter((v) => v.id !== visita.id);
                mudar({ ...m, visitas });
                setVisitaId(visitas.at(-1)?.id ?? null);
              }}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          <Campo rotulo="Técnico">
            <input value={visita.tecnico} onChange={(e) => mudarVisita({ tecnico: e.target.value })} className="input" />
          </Campo>

          {resumo && (
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/95 p-3 text-sm backdrop-blur">
              <span className={`badge ${ESTADO[resumo.estado].cls}`}>Estado: {ESTADO[resumo.estado].rotulo}</span>
              <span>✔ {resumo.ok}</span>
              <span className="text-info">corrigidos {resumo.corrigidos.length}</span>
              <span className="text-danger">pendentes {resumo.pendencias.length}</span>
              <span className="text-muted">faltam {resumo.semResposta}</span>
              <span className="ml-auto text-xs text-muted">{salvando ? "salvando…" : "salvo"}</span>
            </div>
          )}

          {[...new Set(itens.map((i) => i.grupo))].map((g) => (
            <section key={g}>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{g}</h4>
              <ul className="space-y-2">
                {itens
                  .filter((i) => i.grupo === g)
                  .map((it) => (
                    <LinhaManutencao
                      key={it.id}
                      item={it}
                      resposta={visita.respostas.find((r) => r.itemId === it.id)}
                      anterior={anterior?.respostas.find((r) => r.itemId === it.id)?.valor ?? null}
                      chaveFoto={`eletric:foto:${id}:${visita.id}:${it.id}`}
                      aoMudar={(p) => responder(it.id, p)}
                    />
                  ))}
              </ul>
            </section>
          ))}

          <section>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Itens trocados nesta visita</h4>
            <ul className="space-y-2">
              {visita.trocas.map((t, i) => (
                <li key={i} className="flex gap-2">
                  <input
                    value={t.peca}
                    onChange={(e) => mudarVisita({ trocas: visita.trocas.map((x, j) => (j === i ? { ...x, peca: e.target.value } : x)) })}
                    placeholder="Peça (ex.: Disjuntor 1P C20)"
                    className="input flex-1"
                  />
                  <input
                    inputMode="numeric"
                    value={t.quantidade}
                    onChange={(e) => mudarVisita({ trocas: visita.trocas.map((x, j) => (j === i ? { ...x, quantidade: Number(e.target.value) || 1 } : x)) })}
                    className="input w-20"
                  />
                  <button onClick={() => mudarVisita({ trocas: visita.trocas.filter((_, j) => j !== i) })} className="btn btn-ghost p-2" aria-label="Remover">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={() => mudarVisita({ trocas: [...visita.trocas, { peca: "", quantidade: 1 }] })} className="btn btn-secondary mt-2">
              <Wrench className="size-4" /> Adicionar troca
            </button>
          </section>

          {tend.length > 0 && (
            <section>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Comparação com a visita nº {anterior?.numero}</h4>
              <ul className="divide-y divide-border rounded-xl border border-border text-sm">
                {tend.map((t) => (
                  <li key={t.item.id} className="flex justify-between gap-2 px-3 py-2">
                    <span className="min-w-0 truncate">{t.item.titulo}</span>
                    <span className="shrink-0">
                      {t.anterior ?? "—"} → {t.atual ?? "—"} {t.item.medicao?.unidade}
                      {t.delta !== null && (
                        <b className={t.delta > 0 ? "ml-1 text-warn" : "ml-1 text-ok"}>
                          ({t.delta > 0 ? "+" : ""}
                          {t.delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })})
                        </b>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Recomendacoes nome={nome} itens={itens} visita={visita} aoMudar={(t) => mudarVisita({ recomendacoes: t })} />

          <div className="flex flex-wrap gap-2">
            <a href={`/quadros/${id}/imprimir?doc=manutencao&visita=${visita.id}&auto=1`} target="_blank" className="btn btn-primary">
              <FileText className="size-4" /> Relatório de manutenção (PDF)
            </a>
            {cliente?.telefone && resumo && (
              <a
                href={linkWhatsApp(
                  cliente.telefone,
                  `Olá ${cliente.nome.split(" ")[0]}! Concluí a manutenção preventiva nº ${visita.numero} do quadro "${nome}" em ${dataBR(visita.data)}.\n\nEstado geral: *${ESTADO[resumo.estado].rotulo}*\nItens verificados: ${resumo.ok + resumo.corrigidos.length}\nCorrigidos na visita: ${resumo.corrigidos.length}\nPendências: ${resumo.pendencias.length}${
                    resumo.pendencias.length ? `\n${resumo.pendencias.map((p) => `• ${p.item.titulo}`).join("\n")}` : ""
                  }\n\nPróxima visita: ${dataBR(m.proximaVisita)}.\nVou te enviar o relatório completo em PDF em seguida.`,
                )}
                target="_blank"
                className="btn btn-whatsapp"
              >
                <MessageCircle className="size-4" /> Enviar ao cliente pelo WhatsApp
              </a>
            )}
            {resumo && resumo.pendencias.length > 0 && (
              <BotaoOrcamento
                rotulo="Gerar orçamento das pendências"
                clienteId={clienteId}
                clientes={clientes}
                aviso={salvando ? "A visita ainda está sendo salva — aguarde um instante e tente de novo." : undefined}
                acao={(cid) => gerarOrcamentoPendencias(id, visita.id, cid)}
              />
            )}
          </div>
          <p className="text-xs text-muted">Fotos ficam só neste aparelho (não sincronizam) e saem no relatório quando impresso aqui.</p>
        </>
      )}
    </div>
  );
}

function LinhaManutencao({
  item,
  resposta,
  anterior,
  chaveFoto,
  aoMudar,
}: {
  item: ItemManutencao;
  resposta?: RespostaManutencao;
  anterior: number | null;
  chaveFoto: string;
  aoMudar: (p: Partial<RespostaManutencao>) => void;
}) {
  const res = resultadoManutencao(item, resposta);
  const [foto, setFoto] = useState<string | null>(null);
  const [obs, setObs] = useState(Boolean(resposta?.obs));
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- foto fica no localStorage deste aparelho
      setFoto(localStorage.getItem(chaveFoto));
    } catch {}
  }, [chaveFoto]);
  const dentro = item.medicao ? dentroDoLimite(resposta?.valor ?? null, item.medicao.limite) : null;
  const cor = res === "pendente" ? "border-danger bg-danger-soft" : res === "corrigido" ? "border-info bg-info-soft" : res === "ok" ? "border-ok bg-ok-soft" : "border-border";
  return (
    <li className={`rounded-xl border-2 p-3 ${cor}`}>
      <p className="text-sm font-medium">
        {item.titulo}
        {item.prioridade === "alta" && <span className="ml-1 text-xs text-danger">• prioridade alta</span>}
      </p>
      {item.medicao && (
        <label className="mt-2 block text-xs">
          {item.medicao.rotulo} ({item.medicao.unidade}) — limite {textoLimiteItem(item)}
          {anterior !== null && <span className="text-muted"> · anterior: {anterior}</span>}
          <input
            inputMode="decimal"
            defaultValue={resposta?.valor ?? ""}
            onChange={(e) => aoMudar({ valor: e.target.value.trim() === "" ? null : Number(e.target.value.replace(",", ".")) })}
            className={`input mt-1 px-2.5 py-1.5 ${dentro === false ? "border-danger" : dentro ? "border-ok" : ""}`}
          />
          {item.medicao.conferir && <span className="mt-1 block text-warn">⚠ {item.medicao.conferir}</span>}
        </label>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(["ok", "corrigido", "pendente"] as const).map((s) => (
          <button
            key={s}
            onClick={() => aoMudar({ status: resposta?.status === s ? null : s })}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              resposta?.status === s ? (s === "ok" ? "bg-ok text-white" : s === "corrigido" ? "bg-info text-white" : "bg-danger text-white") : "bg-surface"
            }`}
          >
            {s === "ok" ? "OK" : s === "corrigido" ? "Corrigido na visita" : "Pendente"}
          </button>
        ))}
        <button onClick={() => setObs((v) => !v)} className="rounded-lg bg-surface px-3 py-1.5 text-xs">
          Obs.
        </button>
        <label className="flex cursor-pointer items-center gap-1 rounded-lg bg-surface px-3 py-1.5 text-xs">
          <Camera className="size-3.5" /> Foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const d = await reduzirFoto(f);
              try {
                localStorage.setItem(chaveFoto, d);
                setFoto(d);
              } catch {
                alert("Sem espaço para guardar a foto neste aparelho.");
              }
            }}
          />
        </label>
      </div>
      {obs && (
        <textarea defaultValue={resposta?.obs} onChange={(e) => aoMudar({ obs: e.target.value })} rows={2} placeholder="Observação" className="input mt-2 text-sm" />
      )}
      {foto && (
        <div className="relative mt-2 w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element -- foto local (data URL) */}
          <img src={foto} alt="Foto do item" className="max-h-40 rounded-lg" />
          <button
            onClick={() => {
              try {
                localStorage.removeItem(chaveFoto);
              } catch {}
              setFoto(null);
            }}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
            aria-label="Remover foto"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </li>
  );
}

function Recomendacoes({ nome, itens, visita, aoMudar }: { nome: string; itens: ItemManutencao[]; visita: Visita; aoMudar: (t: string) => void }) {
  const [carregando, setCarregando] = useState(false);
  const [texto, setTexto] = useState(visita.recomendacoes);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- trocar de visita recarrega o texto
    setTexto(visita.recomendacoes);
  }, [visita.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function redigir() {
    setCarregando(true);
    const r = resumirVisita(itens, visita);
    const linhas = [
      ...r.pendencias.map((p) => `- PENDENTE (${p.item.prioridade}): ${p.item.titulo}${p.resposta?.valor !== null && p.resposta?.valor !== undefined ? ` — medido ${p.resposta.valor} ${p.item.medicao?.unidade ?? ""}` : ""}${p.resposta?.obs ? ` — ${p.resposta.obs}` : ""}`),
      ...r.corrigidos.map((p) => `- CORRIGIDO: ${p.item.titulo}${p.resposta?.obs ? ` — ${p.resposta.obs}` : ""}`),
      ...visita.trocas.filter((t) => t.peca).map((t) => `- TROCA: ${t.quantidade}× ${t.peca}`),
    ];
    const pedido = `Redija as recomendações (texto corrido curto, até 8 itens em lista Markdown) de um relatório de manutenção preventiva do quadro "${nome}", para o cliente leigo entender e para o eletricista executar. Estado geral: ${r.estado}. Desequilíbrio entre fases: ${r.desequilibrioPct?.toFixed(0) ?? "não medido"}%.
Achados:
${linhas.join("\n") || "- nenhum problema encontrado"}
Não invente medições. Termine com uma frase sobre a importância da manutenção periódica.`;
    let final = "";
    try {
      const res = await fetch("/api/ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistente: "eletrica", esforco: "medium", pedido }),
      });
      await lerStream(res, (t) => {
        final = t;
        setTexto(t);
      });
      if (res.ok) aoMudar(final);
    } catch {
      setTexto("⚠️ Sem conexão.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Recomendações</h4>
        <button onClick={redigir} disabled={carregando} className="btn btn-secondary py-1.5">
          {carregando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Redigir com IA
        </button>
      </div>
      <textarea
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          aoMudar(e.target.value);
        }}
        rows={5}
        placeholder="Recomendações ao cliente (editável)"
        className="input text-sm"
      />
    </section>
  );
}
