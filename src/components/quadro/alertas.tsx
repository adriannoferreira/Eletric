"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, Info, XCircle } from "lucide-react";
import { Ref } from "@/components/divulgacao";
import type { Alerta } from "@/lib/eletrica/calculo";

const ESTILO = {
  erro: { icone: XCircle, cls: "bg-danger-soft text-danger" },
  aviso: { icone: AlertTriangle, cls: "bg-warn-soft text-warn" },
  info: { icone: Info, cls: "bg-info-soft text-info" },
  ok: { icone: CheckCircle2, cls: "bg-ok-soft text-ok" },
} as const;

/** Separa a mensagem em título curto (1ª frase) e detalhe (o resto). */
export function dividirMensagem(m: string) {
  const limpa = m.replace(/\s*\((?:conferir|confira)[^)]*\)/gi, "").trim();
  const corte = limpa.search(/[.:;](?=\s)|\s[—–]\s/);
  if (corte > 0 && corte < limpa.length - 1) {
    return { titulo: limpa.slice(0, corte).trim(), detalhe: m };
  }
  return { titulo: limpa, detalhe: limpa === m ? "" : m };
}

/** "NBR 5410 5.1.3.2.2" → norma + item, para o selo. */
function partesRef(r: string) {
  const m = /^(.*?)(\s+[\d.]+[a-z)]*.*)?$/i.exec(r.trim());
  return { norma: (m?.[1] || r).trim(), item: m?.[2]?.trim() };
}

export function ListaAlertas({ alertas, vazio = "Tudo certo por aqui." }: { alertas: Alerta[]; vazio?: string }) {
  if (alertas.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
        <CheckCircle2 className="size-4 shrink-0" /> {vazio}
      </p>
    );
  }
  const ordem = { erro: 0, aviso: 1, info: 2, ok: 3 };
  return (
    <ul className="space-y-1.5">
      {[...alertas]
        .sort((a, b) => ordem[a.nivel] - ordem[b.nivel])
        .map((a, i) => {
          const e = ESTILO[a.nivel];
          const { titulo, detalhe } = dividirMensagem(a.mensagem);
          const ref = a.referencia ? partesRef(a.referencia) : null;
          const cabecalho = (
            <>
              <e.icone className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-fg">{titulo}</span>
            </>
          );
          if (!detalhe && !ref) {
            return (
              <li key={i} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${e.cls}`}>
                {cabecalho}
              </li>
            );
          }
          return (
            <li key={i}>
              <details className={`group rounded-xl text-sm ${e.cls}`}>
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2">
                  {cabecalho}
                  <ChevronDown className="size-4 shrink-0 opacity-60 transition group-open:rotate-180" />
                </summary>
                <div className="space-y-1.5 px-3 pb-2.5 pl-9 text-fg">
                  {detalhe && <p>{detalhe}</p>}
                  {ref && <Ref norma={ref.norma} item={ref.item} />}
                </div>
              </details>
            </li>
          );
        })}
    </ul>
  );
}
