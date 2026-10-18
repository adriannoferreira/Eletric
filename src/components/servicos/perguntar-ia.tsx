"use client";

import { Bot, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { lerStream, TextoIA } from "@/components/texto-ia";
import { Sk } from "@/components/skeleton";

/** Pergunta avulsa à IA especialista com um contexto (ex.: a ficha do serviço). */
export function PerguntarIA({ contexto, sugestoes }: { contexto: string; sugestoes: string[] }) {
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(q: string) {
    if (!q.trim() || carregando) return;
    setPergunta(q);
    setResposta("");
    setCarregando(true);
    try {
      const res = await fetch("/api/ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistente: "eletrica",
          esforco: "medium",
          pedido: `${contexto}\n\nPergunta do eletricista sobre este serviço: ${q.trim()}`,
        }),
      });
      await lerStream(res, setResposta);
    } catch {
      setResposta("⚠️ Sem conexão. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {sugestoes.map((s) => (
          <button key={s} onClick={() => enviar(s)} disabled={carregando} className="rounded-full border border-border px-3 py-1.5 text-left text-sm hover:border-accent">
            {s}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(pergunta);
        }}
        className="flex gap-2"
      >
        <input value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Pergunte sobre este serviço…" className="input" />
        <button className="btn btn-primary shrink-0 px-3" disabled={carregando || !pergunta.trim()} aria-label="Perguntar">
          {carregando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
      {(carregando || resposta) && (
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted"><Bot className="size-4" /> IA especialista</p>
          {resposta ? (
            <TextoIA>{resposta}</TextoIA>
          ) : (
            <div className="space-y-2">
              <Sk className="h-4 w-11/12 bg-surface" />
              <Sk className="h-4 w-4/5 bg-surface" />
              <Sk className="h-4 w-3/5 bg-surface" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
