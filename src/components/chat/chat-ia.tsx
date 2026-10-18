"use client";

import { ArrowUp, Bot, History, Loader2, MessageSquarePlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { lerStream, TextoIA } from "@/components/texto-ia";
import type { Assistente } from "@/lib/ia/prompts";
import { criarConversa } from "./actions";
import { Historico, type ItemHistorico } from "./historico";

type Msg = { papel: "user" | "assistant"; conteudo: string };

export function ChatIA({
  assistente,
  basePath,
  conversaId,
  iniciais,
  titulo,
  subtitulo,
  sugestoes,
  configurada,
  historico,
}: {
  assistente: Assistente;
  basePath: string;
  conversaId?: number;
  iniciais: Msg[];
  titulo: string;
  subtitulo: string;
  sugestoes: string[];
  configurada: boolean;
  historico: ItemHistorico[];
}) {
  const [id, setId] = useState(conversaId);
  const [msgs, setMsgs] = useState<Msg[]>(iniciais);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [verHistorico, setVerHistorico] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  async function enviar(pergunta: string) {
    const q = pergunta.trim();
    if (!q || enviando) return;
    setTexto("");
    setEnviando(true);
    setMsgs((m) => [...m, { papel: "user", conteudo: q }, { papel: "assistant", conteudo: "" }]);

    try {
      let cid = id;
      if (!cid) {
        cid = await criarConversa(assistente);
        setId(cid);
        window.history.replaceState(null, "", `${basePath}/${cid}`);
      }
      const res = await fetch("/api/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversaId: cid, mensagem: q }),
      });
      await lerStream(res, (acc) =>
        setMsgs((m) => [...m.slice(0, -1), { papel: "assistant", conteudo: acc }]),
      );
    } catch {
      setMsgs((m) => [
        ...m.slice(0, -1),
        { papel: "assistant", conteudo: "⚠️ Sem conexão. Verifique a internet e tente de novo." },
      ]);
    } finally {
      setEnviando(false);
      areaRef.current?.focus();
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col md:min-h-[calc(100dvh-4rem)]">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent text-accent-fg">
            <Bot className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{titulo}</h1>
            <p className="text-sm text-muted">{subtitulo}</p>
          </div>
        </div>
        <div className="flex gap-1 lg:hidden">
          <button onClick={() => setVerHistorico(true)} className="btn btn-ghost p-2" aria-label="Histórico">
            <History className="size-5" />
          </button>
          <Link href={basePath} className="btn btn-ghost p-2" aria-label="Nova conversa">
            <MessageSquarePlus className="size-5" />
          </Link>
        </div>
      </header>

      {!configurada && (
        <div className="mb-4 rounded-xl bg-warn-soft p-3 text-sm text-warn">
          A IA ainda não está ligada: falta a chave <code>ANTHROPIC_API_KEY</code> no arquivo{" "}
          <code>.env.local</code>. Veja o passo a passo no README.
        </div>
      )}

      <div className="flex-1 space-y-4">
        {msgs.length === 0 && (
          <div className="space-y-3 pt-4">
            <p className="text-sm text-muted">Sugestões para começar:</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {sugestoes.map((s) => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="card p-3 text-left text-sm transition hover:border-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) =>
          m.papel === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[15px] text-accent-fg">
                {m.conteudo}
              </div>
            </div>
          ) : (
            <div key={i} className="card px-4 py-3">
              {m.conteudo ? (
                <TextoIA>{m.conteudo}</TextoIA>
              ) : (
                <span className="flex items-center gap-2 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin" /> Pensando…
                </span>
              )}
            </div>
          ),
        )}
        <div ref={fimRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mt-4 flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-lg md:bottom-4"
      >
        <textarea
          ref={areaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 768px)").matches) {
              e.preventDefault();
              enviar(texto);
            }
          }}
          rows={1}
          placeholder="Pergunte algo…"
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-base outline-none field-sizing-content"
        />
        <button
          className="btn btn-primary size-11 shrink-0 rounded-xl p-0"
          disabled={enviando || !texto.trim()}
          aria-label="Enviar"
        >
          {enviando ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
        </button>
      </form>

      {verHistorico && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setVerHistorico(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute inset-y-0 right-0 w-80 max-w-[85%] overflow-y-auto border-l border-border bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold">Histórico</span>
              <button onClick={() => setVerHistorico(false)} className="btn btn-ghost p-2" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
            <Historico
              itens={historico}
              basePath={basePath}
              atual={id}
              aoEscolher={() => setVerHistorico(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
