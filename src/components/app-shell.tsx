"use client";

import { LogOut, Menu, X, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { sair } from "@/app/login/actions";
import { ativo, GRUPOS_NAV, NAV_PRINCIPAL, NAV_SECUNDARIA } from "./nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const maisAtivo = NAV_SECUNDARIA.some((i) => ativo(pathname, i.href));

  return (
    <div className="min-h-dvh md:flex">
      {/* Barra lateral (notebook) */}
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-fg">
            <Zap className="size-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight">Eletric</span>
        </Link>
        <nav className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
          {[{ titulo: "", itens: NAV_PRINCIPAL }, ...GRUPOS_NAV].map((g) => (
            <div key={g.titulo || "principal"} className="mb-2">
              {g.titulo && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted/80">{g.titulo}</p>}
              {g.itens.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    ativo(pathname, item.href) ? "bg-accent-soft text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
                  }`}
                >
                  <item.icone className="size-5" />
                  {item.rotulo}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <form action={sair}>
          <button className="btn btn-ghost w-full justify-start text-muted">
            <LogOut className="size-4" /> Sair
          </button>
        </form>
      </aside>

      <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-8 md:py-8">{children}</div>
      </main>

      {/* Barra inferior (celular) */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-6">
          {NAV_PRINCIPAL.map((item) => {
            const on = ativo(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  on ? "text-fg" : "text-muted"
                }`}
              >
                <span className={`rounded-full px-3 py-1 ${on ? "bg-accent-soft" : ""}`}>
                  <item.icone className="size-5" />
                </span>
                {item.curto ?? item.rotulo}
              </Link>
            );
          })}
          <button
            onClick={() => setMaisAberto(true)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              maisAtivo ? "text-fg" : "text-muted"
            }`}
          >
            <span className={`rounded-full px-3 py-1 ${maisAtivo ? "bg-accent-soft" : ""}`}>
              <Menu className="size-5" />
            </span>
            Mais
          </button>
        </div>
      </nav>

      {maisAberto && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMaisAberto(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="font-semibold">Mais</span>
              <button onClick={() => setMaisAberto(false)} className="btn btn-ghost p-2" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-3">
              {GRUPOS_NAV.map((g) => (
                <div key={g.titulo}>
                  <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.titulo}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {g.itens.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMaisAberto(false)}
                        className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center text-xs font-medium ${
                          ativo(pathname, item.href) ? "bg-accent-soft" : "bg-surface-2"
                        }`}
                      >
                        <item.icone className="size-5 text-accent" />
                        {item.curto ?? item.rotulo}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <form action={sair} className="mt-3">
              <button className="btn btn-ghost w-full text-muted">
                <LogOut className="size-4" /> Sair
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
