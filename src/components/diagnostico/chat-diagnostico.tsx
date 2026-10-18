"use client";

import { ArrowUp, Camera, ClipboardList, FilePlus2, History, Loader2, Plus, Stethoscope, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { criarDiagnostico, excluirDiagnostico } from "@/app/(app)/diagnostico/actions";
import { Sk } from "@/components/skeleton";
import { lerStream, TextoIA } from "@/components/texto-ia";
import { reduzirImagem } from "@/lib/servicos/imagem";

type Msg = { papel: "user" | "assistant"; conteudo: string; fotos?: string[] };
export type ItemDiag = { id: number; titulo: string; quando: string };

const SINTOMAS = [
  "Disjuntor desarma ao ligar um aparelho",
  "DR desarma sozinho ou em dia de chuva",
  "Choque no chuveiro, torneira ou eletrodoméstico",
  "Tomada ou fio esquentando / cheiro de queimado",
  "Lâmpadas piscando ou tensão baixa",
  "Parte da casa sem energia",
  "Chuveiro não esquenta ou queima resistência",
  "Aparelhos queimaram depois de raio/queda de energia",
  "Bomba d'água ou motor não liga / desarma",
  "Conta de luz alta sem motivo aparente",
];

export function ChatDiagnostico({
  conversaId,
  iniciais,
  historico,
  configurada,
}: {
  conversaId?: number;
  iniciais: Msg[];
  historico: ItemDiag[];
  configurada: boolean;
}) {
  const [id, setId] = useState(conversaId);
  const [msgs, setMsgs] = useState<Msg[]>(iniciais);
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [preparando, setPreparando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [verHistorico, setVerHistorico] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  async function anexar(lista: FileList | null) {
    if (!lista?.length) return;
    setPreparando(true);
    setErro(null);
    try {
      const novas: string[] = [];
      for (const f of Array.from(lista).slice(0, 4 - fotos.length)) novas.push(await reduzirImagem(f, 1280, 0.75));
      setFotos((x) => [...x, ...novas].slice(0, 4));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler a foto.");
    } finally {
      setPreparando(false);
    }
  }

  async function enviar(pergunta: string) {
    const q = pergunta.trim();
    if (!q || enviando) return;
    const anexos = fotos;
    setTexto("");
    setFotos([]);
    setEnviando(true);
    setErro(null);
    setMsgs((m) => [...m, { papel: "user", conteudo: q, fotos: anexos }, { papel: "assistant", conteudo: "" }]);
    try {
      let cid = id;
      if (!cid) {
        cid = await criarDiagnostico();
        setId(cid);
        window.history.replaceState(null, "", `/diagnostico/${cid}`);
      }
      const res = await fetch("/api/ia/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId: cid, mensagem: q, imagens: anexos }),
      });
      await lerStream(res, (acc) => setMsgs((m) => [...m.slice(0, -1), { papel: "assistant", conteudo: acc }]));
    } catch {
      setMsgs((m) => [...m.slice(0, -1), { papel: "assistant", conteudo: "⚠️ Sem conexão. Verifique a internet e tente de novo." }]);
    } finally {
      setEnviando(false);
    }
  }

  const ultimaResposta = [...msgs].reverse().find((m) => m.papel === "assistant" && m.conteudo)?.conteudo ?? "";
  const tituloOS = msgs.find((m) => m.papel === "user")?.conteudo.slice(0, 80) ?? "Correção de defeito";
  const linkOS = `/os/nova?${new URLSearchParams({
    titulo: `Correção: ${tituloOS}`,
    descricao: ultimaResposta.replace(/[#*_`>]/g, "").slice(0, 1500),
    guia: "diagnostico",
  })}`;

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col md:min-h-[calc(100dvh-4rem)]">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-accent-fg">
            <Stethoscope className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Diagnóstico de defeitos</h1>
            <p className="text-sm text-muted">Descreva o problema e mande fotos — a IA guia os testes</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setVerHistorico(true)} className="btn btn-ghost p-2" aria-label="Histórico">
            <History className="size-5" />
          </button>
          <Link href="/diagnostico" className="btn btn-ghost p-2" aria-label="Novo diagnóstico">
            <Plus className="size-5" />
          </Link>
        </div>
      </header>

      {!configurada && (
        <div className="mb-4 rounded-xl bg-warn-soft p-3 text-sm text-warn">A IA ainda não está configurada (falta ANTHROPIC_API_KEY).</div>
      )}

      <div className="flex-1 space-y-4">
        {msgs.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Qual é o sintoma? Toque para começar ou descreva abaixo:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SINTOMAS.map((s) => (
                <button key={s} onClick={() => setTexto(s + ". ")} className="card p-3 text-left text-sm transition hover:border-accent">
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">Dica: inclua o tipo de imóvel, há quanto tempo acontece, o que mudou recentemente e mande fotos do quadro e do ponto com defeito.</p>
          </div>
        )}
        {msgs.map((m, i) =>
          m.papel === "user" ? (
            <div key={i} className="flex flex-col items-end gap-2">
              {m.fotos && m.fotos.length > 0 && (
                <div className="flex gap-1.5">
                  {m.fotos.map((f, j) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={j} src={f} alt="Foto enviada" className="size-20 rounded-xl object-cover" />
                  ))}
                </div>
              )}
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[15px] text-accent-fg">{m.conteudo}</div>
            </div>
          ) : (
            <div key={i} className="card px-4 py-3">
              {m.conteudo ? (
                <TextoIA>{m.conteudo}</TextoIA>
              ) : (
                <div className="space-y-2">
                  <Sk className="h-4 w-11/12" />
                  <Sk className="h-4 w-4/5" />
                  <Sk className="h-4 w-2/3" />
                </div>
              )}
            </div>
          ),
        )}
        {ultimaResposta && !enviando && (
          <div className="grid grid-cols-2 gap-2">
            <Link href={linkOS} className="btn btn-primary">
              <ClipboardList className="size-4" /> Criar OS
            </Link>
            <Link href="/orcamentos/novo" className="btn btn-secondary">
              <FilePlus2 className="size-4" /> Orçamento
            </Link>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mt-4 space-y-2 rounded-2xl border border-border bg-surface p-2 shadow-lg md:bottom-4"
      >
        {(fotos.length > 0 || preparando) && (
          <div className="flex gap-1.5 px-1 pt-1">
            {fotos.map((f, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f} alt="Foto anexada" className="size-14 rounded-lg object-cover" />
                <button type="button" onClick={() => setFotos((x) => x.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-black/70 text-white" aria-label="Remover foto">
                  <X className="size-3" />
                </button>
              </div>
            ))}
            {preparando && <Sk className="size-14" />}
          </div>
        )}
        {erro && <p className="px-2 text-sm text-danger">{erro}</p>}
        <div className="flex items-end gap-2">
          <label className={`btn btn-ghost size-11 shrink-0 cursor-pointer p-0 ${fotos.length >= 4 ? "pointer-events-none opacity-40" : ""}`} aria-label="Anexar foto">
            <Camera className="size-5" />
            <input type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(e) => anexar(e.target.files)} />
          </label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={1}
            placeholder={msgs.length ? "Resultado da medição, dúvida…" : "Descreva o defeito…"}
            className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-base outline-none field-sizing-content"
          />
          <button className="btn btn-primary size-11 shrink-0 rounded-xl p-0" disabled={enviando || preparando || !texto.trim()} aria-label="Enviar">
            {enviando ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
          </button>
        </div>
      </form>

      {verHistorico && (
        <div className="fixed inset-0 z-50" onClick={() => setVerHistorico(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-y-0 right-0 w-80 max-w-[85%] overflow-y-auto border-l border-border bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold">Diagnósticos anteriores</span>
              <button onClick={() => setVerHistorico(false)} className="btn btn-ghost p-2" aria-label="Fechar"><X className="size-5" /></button>
            </div>
            {historico.length === 0 && <p className="text-sm text-muted">Nenhum ainda.</p>}
            <ul className="space-y-1">
              {historico.map((h) => (
                <li key={h.id} className="flex items-center gap-1">
                  <Link href={`/diagnostico/${h.id}`} className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-sm ${h.id === id ? "bg-accent-soft" : "hover:bg-surface-2"}`}>
                    <span className="block truncate font-medium">{h.titulo}</span>
                    <span className="text-xs text-muted">{h.quando}</span>
                  </Link>
                  <button onClick={() => confirm("Excluir este diagnóstico?") && excluirDiagnostico(h.id)} className="btn btn-ghost p-2 text-muted hover:text-danger" aria-label="Excluir">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
