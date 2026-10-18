"use client";

import { Check, Copy, MessageCircle, Printer, Scale } from "lucide-react";
import { Ajuda, MenuAcoes } from "@/components/divulgacao";
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
  const [aberto, setAberto] = useState<string | null>(null);
  // Na tela, especificação/alternativa/observação ficam atrás de um toque; na impressão aparece tudo.
  const resumido = Boolean(marcar);
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
                    <div
                      className={`min-w-0 flex-1 ${resumido ? "cursor-pointer" : ""}`}
                      onClick={resumido ? () => setAberto(aberto === i.chave ? null : i.chave) : undefined}
                    >
                      <p className={`font-medium ${ok ? "line-through" : ""} ${resumido && aberto !== i.chave ? "truncate" : ""}`}>{i.descricao}</p>
                      {(!resumido || aberto === i.chave) && (
                        <>
                          <p className="text-xs text-muted">{i.especificacao}</p>
                          {i.alternativa && <p className="text-xs text-muted">{i.alternativa}</p>}
                          {i.observacao && <p className="text-xs text-warn">{i.observacao}</p>}
                        </>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <p className="font-semibold">
                        {i.quantidade.toLocaleString("pt-BR")} {i.unidade}
                      </p>
                      {!resumido && i.alternativa && <p className="max-w-36 text-xs text-muted">{i.alternativa}</p>}
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
        {lista.itensSemPreco > 0 && <span className="text-muted"> · {lista.itensSemPreco} sem preço</span>}
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
      <div className="flex items-center gap-2">
        <a href={linkWhatsApp("", texto)} target="_blank" className="btn btn-whatsapp flex-1 sm:flex-none">
          <MessageCircle className="size-4" /> Pedir cotação
        </a>
        <MenuAcoes
          acoes={[
            { rotulo: "Comparar lojas", icone: <Scale className="size-4" />, href: `/catalogo/comparar?quadro=${id}` },
            {
              rotulo: copiado ? "Copiado!" : "Copiar lista",
              icone: <Copy className="size-4" />,
              onClick: async () => {
                await navigator.clipboard.writeText(texto);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              },
            },
            { rotulo: "Imprimir / PDF", icone: <Printer className="size-4" />, href: `/quadros/${id}/imprimir?doc=compras&auto=1`, externo: true },
          ]}
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted">
          <span>
            Comprado: {feitas}/{lista.itens.length}
          </span>
          <Ajuda titulo="Lista de compras" alinhar="direita">
            Quantidades estimadas a partir do quadro (cabos com 10% de folga). Toque num item para ver a especificação. Confira na
            obra: eletrodutos, caixas e retornos dependem do trajeto real. O que você marcar como comprado fica salvo.
          </Ajuda>
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
    </div>
  );
}
