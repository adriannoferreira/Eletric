"use client";

import { Check, ChevronDown, Loader2, MessageCircle, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { lerStream } from "@/components/texto-ia";
import { MenuAcoes } from "@/components/divulgacao";
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
  const [, iniciar] = useTransition();
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
            {item.diasSemResposta} {item.diasSemResposta === 1 ? "dia" : "dias"}
          </Badge>
        </div>
      </header>

      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm text-muted hover:text-fg [&::-webkit-details-marker]:hidden">
          {ETAPAS[item.etapa]} · {item.followups ? `${item.followups} contato(s)` : "1º contato"}
          <ChevronDown className="size-4 transition group-open:rotate-180" />
        </summary>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={6}
          className="input mt-2 text-sm leading-relaxed"
          disabled={gerando}
          aria-label="Mensagem de follow-up"
        />
      </details>

      <div className="flex gap-2">
        {item.clienteTelefone ? (
          <a
            href={linkWhatsApp(item.clienteTelefone, texto)}
            target="_blank"
            rel="noreferrer"
            onClick={() => iniciar(() => registrarFollowup(item.id))}
            className="btn btn-whatsapp flex-1"
          >
            {gerando ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />} Enviar no WhatsApp
          </a>
        ) : (
          <p className="flex-1 rounded-xl bg-warn-soft p-2 text-sm text-warn">Cliente sem telefone.</p>
        )}
        <MenuAcoes
          acoes={[
            { rotulo: "Reescrever com IA", icone: <Sparkles />, onClick: gerarComIA },
            { rotulo: "Aprovado", icone: <Check />, onClick: () => iniciar(() => marcarResposta(item.id, "aprovado")) },
            {
              rotulo: "Recusado",
              icone: <X />,
              perigo: true,
              onClick: () => {
                if (confirm("Marcar este orçamento como recusado?")) iniciar(() => marcarResposta(item.id, "recusado"));
              },
            },
          ]}
        />
      </div>
    </article>
  );
}
