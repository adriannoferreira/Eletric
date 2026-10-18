"use client";

import { Check, Loader2, MessageCircle, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { lerStream } from "@/components/texto-ia";
import { Badge } from "@/components/ui";
import { marcarResposta, registrarFollowup } from "@/app/(app)/vendas/actions";
import { linkWhatsApp, reais } from "@/lib/formato";
import { ETAPAS } from "./mensagens";

export type ItemFollowup = {
  id: number;
  titulo: string;
  clienteNome: string;
  clienteTelefone: string;
  total: number;
  diasSemResposta: number;
  diasDesdeEnvio: number;
  followups: number;
  etapa: number;
  mensagem: string;
  link: string;
};

export function CartaoFollowup({ item }: { item: ItemFollowup }) {
  const [texto, setTexto] = useState(item.mensagem);
  const [gerando, setGerando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const urgente = item.diasSemResposta >= 7;

  async function gerarComIA() {
    setGerando(true);
    const pedido = `Escreva UMA mensagem de follow-up de WhatsApp para um cliente que recebeu meu orçamento e ainda não respondeu.
Dados:
- Cliente: ${item.clienteNome}
- Serviço: ${item.titulo}
- Valor: ${reais(item.total)}
- Dias desde o envio: ${item.diasDesdeEnvio}
- Follow-ups já feitos: ${item.followups} (etapa atual: ${ETAPAS[item.etapa]})
- Link do orçamento (inclua na mensagem): ${item.link}

Regras: tom humano e educado, curta (até 6 linhas), sem pressão exagerada, no máximo 1 emoji, termine com uma pergunta simples. Responda SOMENTE com o texto da mensagem, sem títulos, sem aspas e sem explicações. Pode usar *negrito* do WhatsApp.`;
    try {
      const res = await fetch("/api/ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistente: "vendas", pedido, esforco: "low" }),
      });
      await lerStream(res, (acc) => setTexto(acc));
    } catch {
      setTexto((t) => t + "\n\n⚠️ Sem conexão com a IA.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <article className="card space-y-3 p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/orcamentos/${item.id}`} className="block truncate font-semibold hover:underline">
            {item.clienteNome}
          </Link>
          <p className="truncate text-sm text-muted">{item.titulo}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-bold">{reais(item.total)}</p>
          <Badge tom={urgente ? "perigo" : "aviso"}>
            {item.diasSemResposta} {item.diasSemResposta === 1 ? "dia" : "dias"} sem resposta
          </Badge>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge tom="info">{ETAPAS[item.etapa]}</Badge>
        <span>
          {item.followups === 0 ? "Nenhum follow-up ainda" : `${item.followups} follow-up${item.followups > 1 ? "s" : ""} feito${item.followups > 1 ? "s" : ""}`}
          {" · "}enviado há {item.diasDesdeEnvio} {item.diasDesdeEnvio === 1 ? "dia" : "dias"}
        </span>
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={7}
        className="input text-sm leading-relaxed"
        disabled={gerando}
        aria-label="Mensagem de follow-up"
      />

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {item.clienteTelefone ? (
          <a
            href={linkWhatsApp(item.clienteTelefone, texto)}
            target="_blank"
            rel="noreferrer"
            onClick={() => iniciar(() => registrarFollowup(item.id))}
            className="btn btn-whatsapp col-span-2 sm:col-span-1"
          >
            <MessageCircle className="size-4" /> Abrir no WhatsApp
          </a>
        ) : (
          <p className="col-span-2 rounded-xl bg-warn-soft p-2 text-sm text-warn">
            Cliente sem telefone cadastrado.
          </p>
        )}
        <button onClick={gerarComIA} disabled={gerando} className="btn btn-secondary col-span-2 sm:col-span-1">
          {gerando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {gerando ? "Escrevendo…" : "Gerar com IA"}
        </button>
        <button
          disabled={pendente}
          onClick={() => iniciar(() => marcarResposta(item.id, "aprovado"))}
          className="btn bg-ok-soft text-ok hover:brightness-95"
        >
          <Check className="size-4" /> Aprovado
        </button>
        <button
          disabled={pendente}
          onClick={() => {
            if (confirm("Marcar este orçamento como recusado?")) iniciar(() => marcarResposta(item.id, "recusado"));
          }}
          className="btn btn-danger"
        >
          <X className="size-4" /> Recusado
        </button>
      </div>
    </article>
  );
}
