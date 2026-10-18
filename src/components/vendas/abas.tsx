"use client";

import { BarChart3, Bot, Calculator, ListChecks, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/vendas", rotulo: "Painel", icone: BarChart3 },
  { href: "/vendas/followup", rotulo: "Follow-up", icone: MessageCircle },
  { href: "/vendas/precos", rotulo: "Preços", icone: Calculator },
  { href: "/vendas/conteudo", rotulo: "Conteúdo IA", icone: Sparkles },
  { href: "/vendas/consultor", rotulo: "Consultor", icone: Bot },
  { href: "/vendas/plano", rotulo: "Plano 90 dias", icone: ListChecks },
];

export function AbasVendas() {
  const pathname = usePathname();
  return (
    <nav className="no-print -mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      <div className="flex w-max gap-2">
        {ABAS.map((a) => {
          const on =
            a.href === "/vendas" ? pathname === "/vendas" : pathname.startsWith(a.href);
          return (
            <Link
              key={a.href}
              href={a.href}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                on
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-surface text-muted hover:text-fg"
              }`}
            >
              <a.icone className="size-4" />
              {a.rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
