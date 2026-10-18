"use client";

import { Camera, ClipboardCheck, FileText, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { lerStream, TextoIA } from "@/components/texto-ia";
import {
  dentroDoLimite,
  descreverInspecao,
  gerarChecklist,
  type ItemInspecao,
  novaInspecao,
  resultadoItem,
  resumirInspecao,
  textoLimite,
} from "@/lib/eletrica/inspecao";
import type { Inspecao, QuadroDados, RespostaInspecao } from "@/lib/eletrica/tipos";

export type Instrumento = { id: number; nome: string; marca: string; modelo: string; numeroSerie: string; proximaVerificacao: string | null };

const chaveFoto = (quadroId: number, inspId: string, itemId: string) => `eletric:foto:${quadroId}:${inspId}:${itemId}`;

/** Lê a foto salva neste aparelho (localStorage). */
export function fotoLocal(quadroId: number, inspId: string, itemId: string) {
  try {
    return localStorage.getItem(chaveFoto(quadroId, inspId, itemId));
  } catch {
    return null;
  }
}

async function reduzirFoto(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = erro;
      i.src = url;
    });
    const escala = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * escala);
    c.height = Math.round(img.height * escala);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.6);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const COR = {
  ok: "border-ok bg-ok-soft",
  nc: "border-danger bg-danger-soft",
  na: "border-border bg-surface-2",
  pendente: "border-border",
} as const;

export function PainelInspecao({
  id,
  nome,
  dados,
  responsavelPadrao,
  instrumentos,
  aoSalvar,
}: {
  id: number;
  nome: string;
  dados: QuadroDados;
  responsavelPadrao: string;
  instrumentos: Instrumento[];
  aoSalvar: (inspecoes: Inspecao[]) => void;
}) {
  const itens = useMemo(() => gerarChecklist(dados), [dados]);
  const [lista, setLista] = useState<Inspecao[]>(dados.inspecoes);
  const [atualId, setAtualId] = useState<string | null>(dados.inspecoes.at(-1)?.id ?? null);
  const [salvando, setSalvando] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const atual = lista.find((i) => i.id === atualId) ?? null;

  function mudarLista(nova: Inspecao[]) {
    setLista(nova);
    setSalvando(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      aoSalvar(nova);
      setSalvando(false);
    }, 700);
  }
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const mudarAtual = (patch: Partial<Inspecao>) =>
    atual && mudarLista(lista.map((i) => (i.id === atual.id ? { ...i, ...patch } : i)));

  function responder(itemId: string, patch: Partial<RespostaInspecao>) {
    if (!atual) return;
    const existe = atual.respostas.find((r) => r.itemId === itemId);
    const nova: RespostaInspecao = { itemId, status: null, valor: null, valor2: null, obs: "", ...existe, ...patch };
    mudarAtual({ respostas: existe ? atual.respostas.map((r) => (r.itemId === itemId ? nova : r)) : [...atual.respostas, nova] });
  }

  if (!atual) {
    return (
      <div className="space-y-3 text-center">
        <ClipboardCheck className="mx-auto size-10 text-muted" />
        <p className="text-sm text-muted">
          Checklist de verificação final pela NBR 5410 seção 7 — inspeção visual e ensaios, com itens específicos de cada
          circuito, DR e DPS deste quadro ({itens.length} itens).
        </p>
        <button
          className="btn btn-primary"
          onClick={() => {
            const n = novaInspecao(responsavelPadrao);
            mudarLista([...lista, n]);
            setAtualId(n.id);
          }}
        >
          <Plus className="size-4" /> Iniciar inspeção
        </button>
      </div>
    );
  }

  const resumo = resumirInspecao(itens, atual);
  const respostas = new Map(atual.respostas.map((r) => [r.itemId, r]));
  const grupos = [...new Set(itens.map((i) => `${i.secao}|${i.grupo}`))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={atual.id} onChange={(e) => setAtualId(e.target.value)} className="input w-auto flex-1">
          {[...lista].reverse().map((i) => (
            <option key={i.id} value={i.id}>
              Inspeção de {new Date(i.data).toLocaleDateString("pt-BR")}
            </option>
          ))}
        </select>
        <button
          className="btn btn-secondary"
          onClick={() => {
            const n = novaInspecao(responsavelPadrao);
            n.instrumentos = atual.instrumentos;
            mudarLista([...lista, n]);
            setAtualId(n.id);
          }}
        >
          <Plus className="size-4" /> Nova
        </button>
        <button
          className="btn btn-danger p-2.5"
          aria-label="Excluir inspeção"
          onClick={() => {
            if (!confirm("Excluir esta inspeção do histórico?")) return;
            const nova = lista.filter((i) => i.id !== atual.id);
            mudarLista(nova);
            setAtualId(nova.at(-1)?.id ?? null);
          }}
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl bg-surface-2 p-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="label">Data</span>
          <input
            type="date"
            value={atual.data.slice(0, 10)}
            onChange={(e) => e.target.value && mudarAtual({ data: new Date(e.target.value + "T12:00:00").toISOString() })}
            className="input mt-1"
          />
        </label>
        <label className="text-sm">
          <span className="label">Responsável</span>
          <input value={atual.responsavel} onChange={(e) => mudarAtual({ responsavel: e.target.value })} className="input mt-1" />
        </label>
        <label className="text-sm">
          <span className="label">Tensão de ensaio de isolamento (V cc)</span>
          <input
            inputMode="numeric"
            value={atual.tensaoEnsaioV}
            onChange={(e) => mudarAtual({ tensaoEnsaioV: Number(e.target.value) || 0 })}
            className="input mt-1"
          />
        </label>
        <div className="sm:col-span-3">
          <p className="label mb-1">Instrumentos usados</p>
          {instrumentos.length === 0 ? (
            <p className="text-xs text-muted">
              Cadastre multímetro, megômetro, terrômetro e testador de DR em Equipamentos (categoria “Instrumento de medição”)
              para aparecerem aqui com o nº de série.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {instrumentos.map((ins) => {
                const on = atual.instrumentos.includes(String(ins.id));
                return (
                  <button
                    key={ins.id}
                    onClick={() =>
                      mudarAtual({
                        instrumentos: on ? atual.instrumentos.filter((x) => x !== String(ins.id)) : [...atual.instrumentos, String(ins.id)],
                      })
                    }
                    className={`badge py-1.5 ${on ? "bg-accent text-accent-fg" : "bg-surface"}`}
                  >
                    {ins.nome}
                    {ins.numeroSerie ? ` · nº ${ins.numeroSerie}` : ""}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/95 p-3 text-sm backdrop-blur">
        <span className={`badge ${resumo.resultado === "aprovado" ? "bg-ok-soft text-ok" : resumo.resultado === "pendencias" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>
          {resumo.resultado === "aprovado" ? "Aprovado" : resumo.resultado === "pendencias" ? "Com pendências" : "Em andamento"}
        </span>
        <span>✔ {resumo.ok}</span>
        <span className="text-danger">✖ {resumo.nc}</span>
        <span className="text-muted">N/A {resumo.na}</span>
        <span className="text-muted">faltam {resumo.pendentes}</span>
        <span className="ml-auto text-xs text-muted">{salvando ? "salvando…" : "salvo"}</span>
      </div>

      {grupos.map((g) => {
        const [secao, grupo] = g.split("|");
        const doGrupo = itens.filter((i) => i.secao === secao && i.grupo === grupo);
        return (
          <section key={g}>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              {secao === "visual" ? "Inspeção visual (7.2)" : "Ensaios (7.3)"} · {grupo}
            </h4>
            <ul className="space-y-2">
              {doGrupo.map((it) => (
                <ItemLinha
                  key={it.id}
                  item={it}
                  resposta={respostas.get(it.id)}
                  aoMudar={(p) => responder(it.id, p)}
                  chaveFoto={chaveFoto(id, atual.id, it.id)}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {resumo.desequilibrioPct !== null && (
        <p className="text-sm">
          Desequilíbrio medido entre fases: <b className={resumo.desequilibrioPct > 20 ? "text-warn" : "text-ok"}>{resumo.desequilibrioPct.toFixed(0)}%</b>
        </p>
      )}

      <AnaliseIA nome={nome} itens={itens} inspecao={atual} aoSalvar={(t) => mudarAtual({ analiseIA: t })} />

      <a href={`/quadros/${id}/imprimir?doc=inspecao&insp=${atual.id}&auto=1`} target="_blank" className="btn btn-primary w-full sm:w-auto">
        <FileText className="size-4" /> Relatório de inspeção (PDF)
      </a>
      <p className="text-xs text-muted">
        As medições e respostas ficam salvas no quadro e sincronizam entre celular e notebook. As fotos ficam guardadas só
        neste aparelho (não sincronizam) e aparecem no relatório quando ele é impresso aqui.
      </p>
    </div>
  );
}

function ItemLinha({
  item,
  resposta,
  aoMudar,
  chaveFoto: chave,
}: {
  item: ItemInspecao;
  resposta?: RespostaInspecao;
  aoMudar: (p: Partial<RespostaInspecao>) => void;
  chaveFoto: string;
}) {
  const res = resultadoItem(item, resposta);
  const [obsAberta, setObsAberta] = useState(Boolean(resposta?.obs));
  const [foto, setFoto] = useState<string | null>(null);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- foto fica no localStorage deste aparelho
      setFoto(localStorage.getItem(chave));
    } catch {}
  }, [chave]);
  const m = item.medicao;
  const v1 = m ? dentroDoLimite(resposta?.valor ?? null, m.limite) : null;
  const v2 = m?.segunda ? dentroDoLimite(resposta?.valor2 ?? null, m.segunda.limite) : null;
  const numero = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  return (
    <li className={`rounded-xl border-2 p-3 ${COR[res]}`}>
      <p className="text-sm font-medium">{item.titulo}</p>
      <p className="text-xs text-muted">{item.referencia}</p>
      {m && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="text-xs">
            {m.rotulo} ({m.unidade}) {m.limite && <span className="text-muted">— limite {textoLimite(m.limite, m.unidade)}</span>}
            <input
              inputMode="decimal"
              defaultValue={resposta?.valor ?? ""}
              onChange={(e) => aoMudar({ valor: numero(e.target.value) })}
              className={`input mt-1 px-2.5 py-1.5 ${v1 === false ? "border-danger" : v1 ? "border-ok" : ""}`}
            />
          </label>
          {m.segunda && (
            <label className="text-xs">
              {m.segunda.rotulo} ({m.segunda.unidade}) <span className="text-muted">— {textoLimite(m.segunda.limite, m.segunda.unidade)}</span>
              <input
                inputMode="decimal"
                defaultValue={resposta?.valor2 ?? ""}
                onChange={(e) => aoMudar({ valor2: numero(e.target.value) })}
                className={`input mt-1 px-2.5 py-1.5 ${v2 === false ? "border-danger" : v2 ? "border-ok" : ""}`}
              />
            </label>
          )}
          {m.conferir && <p className="text-xs text-warn sm:col-span-2">⚠ {m.conferir}</p>}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {(["ok", "nc", "na"] as const).map((s) => (
          <button
            key={s}
            onClick={() => aoMudar({ status: resposta?.status === s ? null : s })}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              resposta?.status === s
                ? s === "ok"
                  ? "bg-ok text-white"
                  : s === "nc"
                    ? "bg-danger text-white"
                    : "bg-muted text-white"
                : "bg-surface"
            }`}
          >
            {s === "ok" ? "OK" : s === "nc" ? "Não conforme" : "N/A"}
          </button>
        ))}
        <button onClick={() => setObsAberta((v) => !v)} className="rounded-lg bg-surface px-3 py-1.5 text-xs">
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
                localStorage.setItem(chave, d);
                setFoto(d);
              } catch {
                alert("Sem espaço para guardar a foto neste aparelho.");
              }
            }}
          />
        </label>
        {!resposta?.status && res !== "pendente" && <span className="text-xs text-muted">(pela medição)</span>}
      </div>
      {obsAberta && (
        <textarea
          defaultValue={resposta?.obs}
          onChange={(e) => aoMudar({ obs: e.target.value })}
          rows={2}
          placeholder="Observação / o que corrigir"
          className="input mt-2 text-sm"
        />
      )}
      {foto && (
        <div className="relative mt-2 w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element -- foto local (data URL) */}
          <img src={foto} alt="Foto do item" className="max-h-40 rounded-lg" />
          <button
            onClick={() => {
              try {
                localStorage.removeItem(chave);
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

function AnaliseIA({
  nome,
  itens,
  inspecao,
  aoSalvar,
}: {
  nome: string;
  itens: ItemInspecao[];
  inspecao: Inspecao;
  aoSalvar: (t: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const mostrado = carregando || texto ? texto : (inspecao.analiseIA ?? "");

  async function analisar() {
    setCarregando(true);
    setTexto("");
    let final = "";
    const pedido = `Analise o resultado desta inspeção (verificação final NBR 5410 seção 7) do quadro "${nome}" e recomende as correções.

Tensão de ensaio de isolamento: ${inspecao.tensaoEnsaioV} V cc.
Itens respondidos (OK / NC = não conforme / NA / PENDENTE) e medições:
${descreverInspecao(itens, inspecao) || "(nenhum item respondido ainda)"}

Responda em Markdown, direto para o celular:
1. **Situação geral** (apto / apto com ressalvas / não apto).
2. **Não conformidades em ordem de risco** (alto/médio/baixo), com causa provável e como corrigir, citando o item da norma quando tiver segurança.
3. **Medições suspeitas ou que precisam ser refeitas** (e como medir corretamente).
4. **O que falta verificar**.`;
    try {
      const res = await fetch("/api/ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistente: "eletrica", esforco: "high", pedido }),
      });
      await lerStream(res, (t) => {
        final = t;
        setTexto(t);
      });
      if (res.ok && final.trim()) aoSalvar(final);
    } catch {
      setTexto("⚠️ Sem conexão. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-2">
      <button onClick={analisar} disabled={carregando} className="btn btn-secondary">
        {carregando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Analisar com IA
      </button>
      {(mostrado || carregando) && (
        <div className="card p-4">
          {mostrado ? <TextoIA>{mostrado}</TextoIA> : <span className="text-sm text-muted">Analisando…</span>}
        </div>
      )}
    </div>
  );
}
