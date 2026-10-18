"use client";

import { Boxes, Package, RefreshCw, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/catalogo", rotulo: "Itens", icone: Package },
  { href: "/catalogo/kits", rotulo: "Kits", icone: Boxes },
  { href: "/catalogo/cotacoes", rotulo: "Cotações", icone: Store },
  { href: "/catalogo/precos", rotulo: "Atualizar preços", icone: RefreshCw },
];

export function AbasCatalogo({ pendentes }: { pendentes: number }) {
  const pathname = usePathname();
  return (
    <nav className="no-print -mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      <div className="flex w-max gap-2">
        {ABAS.map((a) => {
          const on = a.href === "/catalogo" ? pathname === "/catalogo" : pathname.startsWith(a.href);
          return (
            <Link
              key={a.href}
              href={a.href}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                on ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-muted hover:text-fg"
              }`}
            >
              <a.icone className="size-4" />
              {a.rotulo}
              {a.href === "/catalogo/precos" && pendentes > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
                  {pendentes}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
