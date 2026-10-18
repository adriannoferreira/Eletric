"use client";

import { ClipboardList, FileDown, GitBranch, Loader2, Pencil, Sparkles, Tags } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { salvarMemorial } from "@/app/(app)/quadros/actions";
import { Sk } from "@/components/skeleton";
import { lerStream, TextoIA } from "@/components/texto-ia";
import { type AnaliseQuadro, listaMateriais } from "@/lib/eletrica/calculo";
import type { QuadroDados } from "@/lib/eletrica/tipos";
import { ListaMateriais } from "./materiais";
import { BlocoDemanda, demandaDoQuadro, descreverObra, ListaSeguranca, TabelaCargas } from "./projeto-blocos";
import { descreverQuadro } from "./revisao-ia";
import { Unifilar } from "./unifilar";

export function pedidoMemorial(nome: string, dados: QuadroDados, analise: AnaliseQuadro) {
  const demanda = demandaDoQuadro(dados);
  return `Escreva o MEMORIAL DESCRITIVO do projeto elétrico de baixa tensão abaixo, para entregar ao cliente e anexar ao projeto. Base: ABNT NBR 5410 (edição vigente), NR-10 e a norma de fornecimento da concessionária indicada. Os cálculos foram feitos pelo app; confira a coerência e aponte o que precisa ser confirmado.

${descreverObra(dados, demanda)}

${descreverQuadro(nome, dados, analise)}

Formato: Markdown, linguagem técnica mas clara, seções numeradas:
1. Objeto e escopo
2. Normas e referências
3. Fornecimento de energia e padrão de entrada (categoria, disjuntor e ramal — indicar que devem seguir a norma da concessionária)
4. Previsão de cargas e demanda
5. Divisão de circuitos e dimensionamento (tabela resumida: circuito, potência, seção, disjuntor, DR)
6. Proteções (disjuntores, DR, DPS) e seletividade
7. Aterramento e equipotencialização
8. Quadro de distribuição (modelo, espaço reserva, identificação)
9. Recomendações de execução, testes e segurança (NR-10)
10. Pendências a confirmar em campo/na norma
Não invente números que não estejam nos dados; quando algo depender da concessionária, diga isso.`;
}

export function PainelProjeto({
  id,
  nome,
  dados,
  analise,
  alterado,
  aoMudarMemorial,
  aoVerUnifilar,
  botaoOrcamento,
}: {
  id: number;
  nome: string;
  dados: QuadroDados;
  analise: AnaliseQuadro;
  alterado: boolean;
  aoMudarMemorial: (m: QuadroDados["memorial"]) => void;
  aoVerUnifilar: () => void;
  botaoOrcamento: React.ReactNode;
}) {
  const demanda = useMemo(() => demandaDoQuadro(dados), [dados]);
  const materiais = useMemo(() => listaMateriais(dados, analise), [dados, analise]);
  const [texto, setTexto] = useState("");
  const [gerando, setGerando] = useState(false);
  const memorial = gerando || texto ? texto : (dados.memorial?.texto ?? "");

  async function gerar() {
    setGerando(true);
    setTexto("");
    let final = "";
    try {
      const res = await fetch("/api/ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistente: "eletrica", esforco: "high", pedido: pedidoMemorial(nome, dados, analise) }),
      });
      await lerStream(res, (t) => {
        final = t;
        setTexto(t);
      });
      if (res.ok && final.trim()) aoMudarMemorial(await salvarMemorial(id, final));
    } catch {
      setTexto("⚠️ Sem conexão. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <a
          href={`/quadros/${id}/imprimir?auto=1`}
          target="_blank"
          className="btn btn-primary"
          onClick={(e) => {
            if (alterado && !confirm("Há alterações não salvas — o PDF usa a versão salva. Continuar?")) e.preventDefault();
          }}
        >
          <FileDown className="size-4" /> Exportar PDF
        </a>
        <button onClick={aoVerUnifilar} className="btn btn-secondary">
          <GitBranch className="size-4" /> Unifilar em tela cheia
        </button>
        {botaoOrcamento}
        <a href={`/quadros/${id}/imprimir?doc=etiquetas`} target="_blank" className="btn btn-secondary">
          <Tags className="size-4" /> Etiquetas
        </a>
        {dados.projeto ? (
          <Link href={`/quadros/projeto?quadro=${id}`} className="btn btn-secondary">
            <Pencil className="size-4" /> Editar dados da obra
          </Link>
        ) : null}
      </div>

      {!dados.projeto && (
        <p className="rounded-xl bg-info-soft p-3 text-sm text-info">
          Quadro montado do zero: a demanda abaixo é calculada pelos circuitos que você criou. Concessionária e
          ambientes não foram informados — use o “Gerar projeto da obra” quando quiser a previsão completa pela NBR 5410.
        </p>
      )}

      <Secao titulo="Demanda e entrada de energia">
        <BlocoDemanda dados={dados} demanda={demanda} />
      </Secao>

      <Secao titulo="Diagrama unifilar">
        <div className="overflow-x-auto rounded-xl border border-border bg-surface p-2">
          <Unifilar dados={dados} analise={analise} />
        </div>
        <p className="mt-1 text-xs text-muted">Role para o lado no celular. Bolinhas: fases (R vermelha, S azul, T cinza).</p>
      </Secao>

      <Secao titulo="Quadro de cargas">
        <TabelaCargas dados={dados} analise={analise} />
      </Secao>

      <Secao titulo="Aterramento e segurança">
        <ListaSeguranca dados={dados} />
      </Secao>

      <Secao titulo="Lista de materiais">
        <ListaMateriais itens={materiais} />
      </Secao>

      <Secao titulo="Memorial descritivo (IA)">
        <div className="space-y-3">
          <button onClick={gerar} disabled={gerando || analise.circuitos.length === 0} className="btn btn-primary">
            {gerando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {memorial ? "Gerar de novo" : "Gerar memorial descritivo com IA"}
          </button>
          {dados.memorial && !texto && (
            <p className="text-xs text-muted">
              Gerado em {new Date(dados.memorial.geradoEm).toLocaleString("pt-BR")} — sai também no PDF.
            </p>
          )}
          {(memorial || gerando) && (
            <div className="card p-4">
              {memorial ? (
                <TextoIA>{memorial}</TextoIA>
              ) : (
                <div className="space-y-2" aria-label="Escrevendo o memorial">
                  <Sk className="h-4 w-1/3" />
                  <Sk className="h-3 w-full" />
                  <Sk className="h-3 w-11/12" />
                  <Sk className="h-3 w-4/5" />
                </div>
              )}
            </div>
          )}
        </div>
      </Secao>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 font-semibold">
        <ClipboardList className="size-4 text-accent" /> {titulo}
      </h3>
      {children}
    </section>
  );
}
