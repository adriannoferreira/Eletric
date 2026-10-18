import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { Alerta } from "@/lib/eletrica/calculo";

const ESTILO = {
  erro: { icone: XCircle, cls: "bg-danger-soft text-danger" },
  aviso: { icone: AlertTriangle, cls: "bg-warn-soft text-warn" },
  info: { icone: Info, cls: "bg-info-soft text-info" },
  ok: { icone: CheckCircle2, cls: "bg-ok-soft text-ok" },
} as const;

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
          return (
            <li key={i} className={`flex gap-2 rounded-xl px-3 py-2 text-sm ${e.cls}`}>
              <e.icone className="mt-0.5 size-4 shrink-0" />
              <span className="text-fg">
                {a.mensagem}
                {a.referencia && <span className="ml-1 whitespace-nowrap text-xs text-muted">· {a.referencia}</span>}
              </span>
            </li>
          );
        })}
    </ul>
  );
}
