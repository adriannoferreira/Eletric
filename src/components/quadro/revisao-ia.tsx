"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { lerStream, TextoIA } from "@/components/texto-ia";
import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import { peca } from "@/lib/eletrica/pecas";
import { LOCAIS, type QuadroDados, TIPOS_CIRCUITO } from "@/lib/eletrica/tipos";

/** Monta a descrição do quadro em texto para a IA revisar. */
export function descreverQuadro(nome: string, q: QuadroDados, a: AnaliseQuadro) {
  const al = q.alimentacao;
  const linhas: string[] = [
    `Quadro: ${nome}`,
    `Fornecimento: ${al.tipo}, ${al.tensaoFN} V F-N / ${al.tensaoFF} V F-F, esquema ${al.esquema}.`,
    `Caixa: ${q.modelo.fileiras} fileira(s) × ${q.modelo.modulosPorFileira} módulos (${q.modelo.instalacao}). Ocupados ${a.modulosUsados}/${a.modulosTotais}.`,
    "",
    "Peças no quadro:",
    ...q.componentes.map((c) => {
      const p = peca(c.pecaId);
      const circ = q.circuitos.find((x) => x.id === c.circuitoId);
      return `- ${p?.nome ?? c.pecaId}${c.geral ? " [GERAL]" : ""} fases ${c.fases.join("+") || "?"}${circ ? ` → circuito "${circ.nome}"` : ""}`;
    }),
    "",
    "Circuitos (resultado do cálculo automático do app):",
    ...a.circuitos.map((r, i) => {
      const c = r.circuito;
      return `${i + 1}. ${c.nome} — ${TIPOS_CIRCUITO[c.tipo]}, local: ${LOCAIS[c.local].nome}, ${c.potenciaW} W, FP ${c.fatorPotencia}, ligação ${c.ligacao} ${r.tensaoV} V, ${c.comprimentoM} m, método ${c.metodo}, ${c.circuitosAgrupados} circuito(s) no eletroduto, ${c.temperaturaC} °C, ${c.quantidadePontos} ponto(s). Ib=${r.dim.ib.toFixed(1)} A, seção ${r.dim.secao ?? "?"} mm², Iz=${r.dim.iz.toFixed(1)} A, disjuntor instalado ${r.pecaDisjuntor?.nome ?? "nenhum"} (sugerido ${r.dim.disjuntor ?? "?"} A), queda ${r.dim.quedaPct.toFixed(2)}%, DR: ${r.temDR ? "sim" : "não"}${r.exigeDR ? " (exigido)" : ""}.`;
    }),
    "",
    `Corrente por fase: ${Object.entries(a.correntePorFase).map(([f, v]) => `${f}=${v.toFixed(1)} A`).join(", ")}; desequilíbrio ${a.desequilibrioPct.toFixed(0)}%.`,
    "",
    "Alertas do verificador automático:",
    ...[...a.alertas, ...a.circuitos.flatMap((r) => r.alertas.map((x) => ({ ...x, mensagem: `[${r.circuito.nome}] ${x.mensagem}` })))]
      .filter((x) => x.nivel !== "info")
      .map((x) => `- (${x.nivel}) ${x.mensagem}${x.referencia ? ` [${x.referencia}]` : ""}`),
  ];
  return linhas.join("\n");
}

export function RevisaoIA({ nome, dados, analise }: { nome: string; dados: QuadroDados; analise: AnaliseQuadro }) {
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function revisar() {
    setCarregando(true);
    setTexto("");
    const pedido = `Revise tecnicamente este quadro de distribuição montado no app, segundo a ABNT NBR 5410 na edição vigente (e NR-10 quando couber). O app já fez cálculos automáticos — confira se estão coerentes, mas vá além deles.

${descreverQuadro(nome, dados, analise)}

Responda em Markdown, curto e direto para ler no celular, nesta ordem:
1. **Veredito** (1–2 frases): está apto para instalar ou não.
2. **Erros que precisam ser corrigidos** (com o item da norma quando tiver segurança).
3. **Riscos e melhorias recomendadas** (DR, DPS, seletividade, aterramento, divisão de circuitos, balanceamento, espaço reserva).
4. **Lista de materiais sugerida** do quadro (peças e cabos principais).
5. **Dica para explicar ao cliente** o valor desse quadro bem feito.
Se faltar alguma informação importante, diga qual.`;
    try {
      const res = await fetch("/api/ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistente: "eletrica", esforco: "high", pedido }),
      });
      await lerStream(res, setTexto);
    } catch {
      setTexto("⚠️ Sem conexão. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        A IA especialista lê o quadro inteiro e os cálculos do app e faz uma revisão técnica pela NBR 5410, com
        lista de materiais. Ela é um apoio — a responsabilidade técnica continua sendo sua.
      </p>
      <button onClick={revisar} disabled={carregando} className="btn btn-primary">
        {carregando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {texto ? "Revisar de novo" : "Revisar com IA"}
      </button>
      {(texto || carregando) && (
        <div className="card p-4">
          {texto ? (
            <TextoIA>{texto}</TextoIA>
          ) : (
            <span className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" /> Analisando o quadro…
            </span>
          )}
        </div>
      )}
    </div>
  );
}
