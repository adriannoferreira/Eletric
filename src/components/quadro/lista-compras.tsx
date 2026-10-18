"use client";

import { Check, Copy, MessageCircle, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import { CATEGORIAS_COMPRA, type ListaCompras, montarListaCompras, textoCotacao } from "@/lib/eletrica/compras";
import type { ItemCatalogoSimples } from "@/lib/eletrica/orcamento-quadro";
import type { QuadroDados } from "@/lib/eletrica/tipos";
import { linkWhatsApp, reais } from "@/lib/formato";

/** Tabela da lista de compras (tela e impressão). `marcar` ausente = só leitura. */
export function TabelaCompras({
  lista,
  compradas,
  marcar,
}: {
  lista: ListaCompras;
  compradas: string[];
  marcar?: (chave: string, sim: boolean) => void;
}) {
  const feitas = new Set(compradas);
  return (
    <div className="space-y-4">
      {Object.entries(CATEGORIAS_COMPRA).map(([cat, nome]) => {
        const itens = lista.itens.filter((i) => i.categoria === cat);
        if (!itens.length) return null;
        return (
          <section key={cat} className="break-inside-avoid">
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{nome}</h4>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {itens.map((i) => {
                const ok = feitas.has(i.chave);
                return (
                  <li key={i.chave} className={`flex gap-3 px-3 py-2.5 ${ok ? "opacity-55" : ""}`}>
                    {marcar ? (
                      <button
                        onClick={() => marcar(i.chave, !ok)}
                        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 ${ok ? "border-ok bg-ok text-white" : "border-border"}`}
                        aria-label={ok ? "Desmarcar" : "Marcar como comprado"}
                      >
                        {ok && <Check className="size-4" />}
                      </button>
                    ) : (
                      <span className="mt-0.5 size-4 shrink-0 rounded-sm border-2 border-current" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${ok ? "line-through" : ""}`}>{i.descricao}</p>
                      <p className="text-xs text-muted">{i.especificacao}</p>
                      {i.observacao && <p className="text-xs text-warn">{i.observacao}</p>}
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <p className="font-semibold">
                        {i.quantidade.toLocaleString("pt-BR")} {i.unidade}
                      </p>
                      {i.alternativa && <p className="max-w-36 text-xs text-muted">{i.alternativa}</p>}
                      <p className="text-xs text-muted">{i.total !== null ? reais(i.total) : "sem preço"}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="text-right text-sm">
        Total estimado: <b>{reais(lista.totalEstimado)}</b>
        {lista.itensSemPreco > 0 && <span className="text-muted"> · {lista.itensSemPreco} item(ns) sem preço no catálogo</span>}
      </p>
    </div>
  );
}

export function PainelCompras({
  id,
  nome,
  dados,
  analise,
  catalogo,
  aoMarcar,
}: {
  id: number;
  nome: string;
  dados: QuadroDados;
  analise: AnaliseQuadro;
  catalogo: ItemCatalogoSimples[];
  aoMarcar: (compradas: string[]) => void;
}) {
  const lista = useMemo(() => montarListaCompras(dados, catalogo, analise), [dados, catalogo, analise]);
  const [copiado, setCopiado] = useState(false);
  const texto = textoCotacao(lista, nome);
  const feitas = lista.itens.filter((i) => dados.compras.includes(i.chave)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <a href={linkWhatsApp("", texto)} target="_blank" className="btn btn-whatsapp">
          <MessageCircle className="size-4" /> Enviar pelo WhatsApp
        </a>
        <button
          className="btn btn-secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          }}
        >
          <Copy className="size-4" /> {copiado ? "Copiado!" : "Copiar"}
        </button>
        <a href={`/quadros/${id}/imprimir?doc=compras&auto=1`} target="_blank" className="btn btn-secondary">
          <Printer className="size-4" /> Imprimir/PDF
        </a>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>
            Comprado: {feitas}/{lista.itens.length}
          </span>
          <span>salvo automaticamente — sincroniza celular e notebook</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-ok transition-all" style={{ width: `${(feitas / Math.max(1, lista.itens.length)) * 100}%` }} />
        </div>
      </div>
      <TabelaCompras
        lista={lista}
        compradas={dados.compras}
        marcar={(chave, sim) =>
          aoMarcar(sim ? [...new Set([...dados.compras, chave])] : dados.compras.filter((c) => c !== chave))
        }
      />
      <p className="text-xs text-muted">
        Quantidades estimadas a partir do quadro (cabos com 10% de folga). Confira na obra: eletrodutos, caixas e retornos
        dependem do trajeto real.
      </p>
    </div>
  );
}
