"use client";

import { listaMateriaisCompleta } from "@/lib/eletrica/ligacoes";
import { ClipboardList, FileDown, GitBranch, Loader2, Pencil, Printer, Save, Sparkles, Tags, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { salvarMemorial } from "@/app/(app)/quadros/actions";
import { Sk } from "@/components/skeleton";
import { lerStream, TextoIA } from "@/components/texto-ia";
import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import { peca } from "@/lib/eletrica/pecas";
import type { QuadroDados } from "@/lib/eletrica/tipos";
import { CONCESSIONARIAS } from "@/lib/eletrica/concessionarias";
import { concessionariaDoQuadro } from "@/lib/eletrica/equatorial";
import { dadosMemorialDoQuadro } from "@/lib/eletrica/memorial-quadro";
import { EXIGENCIAS_DOCUMENTOS, montarMemorialDescritivo, preencherMemorial } from "@/lib/normas/equatorial-pa";
import type { ClienteResumo, PerfilResumo } from "./laudo-art";
import { ListaMateriais } from "./materiais";
import { MenuMais, SeloRef } from "./mini";
import { BlocoPadraoEquatorial } from "./padrao-equatorial";
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
  aoMudarConcessionaria,
  aoVerUnifilar,
  botaoOrcamento,
  cliente,
  perfil,
}: {
  id: number;
  nome: string;
  dados: QuadroDados;
  analise: AnaliseQuadro;
  alterado: boolean;
  aoMudarMemorial: (m: QuadroDados["memorial"]) => void;
  aoMudarConcessionaria: (id: string) => void;
  aoVerUnifilar: () => void;
  botaoOrcamento: React.ReactNode;
  cliente: ClienteResumo;
  perfil: PerfilResumo;
}) {
  const demanda = useMemo(() => demandaDoQuadro(dados), [dados]);
  const materiais = useMemo(() => listaMateriaisCompleta(dados, analise), [dados, analise]);
  const [texto, setTexto] = useState("");
  const [gerando, setGerando] = useState(false);
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const memorial = gerando || texto ? texto : (dados.memorial?.texto ?? "");
  const dadosMem = useMemo(
    () => dadosMemorialDoQuadro({ nome, dados, analise, demanda, cliente, responsavel: perfil, art: dados.art?.numero }),
    [nome, dados, analise, demanda, cliente, perfil],
  );
  const exigeFormato = !!dadosMem && (dadosMem.temGeracao || dadosMem.temRecargaVE);

  /** Equatorial PA: base determinística (números do cálculo) + IA só nos trechos marcados. */
  async function gerarEquatorial() {
    if (!dadosMem) return;
    setGerando(true);
    const base = montarMemorialDescritivo(dadosMem);
    setTexto(base.markdown);
    const contexto = `${descreverObra(dados, demanda)}\n\n${descreverQuadro(nome, dados, analise)}`;
    const textos: Record<string, string> = {};
    try {
      await Promise.all(
        base.secoes
          .filter((s) => s.paraIA)
          .map(async (s) => {
            const res = await fetch("/api/ia/gerar", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                assistente: "eletrica",
                esforco: "high",
                pedido: `Você está redigindo UMA seção do memorial descritivo de uma instalação elétrica de baixa tensão (Equatorial Pará, NT.00001 rev. 09; ABNT NBR 5410; NR-10).\nSeção: "${s.titulo}".\nInstrução: ${s.paraIA!.instrucao}\n\nDados do projeto (use só estes números; não invente valores):\n${contexto}\n\nResponda apenas com o texto da seção, em Markdown, sem repetir o título.`,
              }),
            });
            await lerStream(res, (t) => {
              textos[s.id] = t;
              setTexto(preencherMemorial(base.markdown, textos));
            });
          }),
      );
      const final = preencherMemorial(base.markdown, textos);
      setTexto(final);
      aoMudarMemorial(await salvarMemorial(id, final));
    } catch {
      setTexto((t) => `${t}\n\n⚠️ Sem conexão. Tente de novo.`);
    } finally {
      setGerando(false);
    }
  }

  async function salvarEdicao() {
    if (rascunho == null) return;
    setSalvando(true);
    try {
      const m = await salvarMemorial(id, rascunho);
      aoMudarMemorial(m);
      setTexto(m.texto);
      setRascunho(null);
    } finally {
      setSalvando(false);
    }
  }

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
        <div className="space-y-2 rounded-xl bg-info-soft p-3 text-sm text-info">
          <p>
            Quadro montado do zero: a demanda abaixo é calculada pelos circuitos que você criou. Ambientes não foram
            informados — use o “Gerar projeto da obra” quando quiser a previsão completa pela NBR 5410.
          </p>
          <label className="flex flex-wrap items-center gap-2 text-fg">
            <span className="font-medium">Concessionária:</span>
            <select
              value={concessionariaDoQuadro(dados)}
              onChange={(e) => aoMudarConcessionaria(e.target.value)}
              className="input w-auto py-1.5"
            >
              {CONCESSIONARIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <Secao titulo="Demanda e entrada de energia">
        <BlocoDemanda dados={dados} demanda={demanda} />
      </Secao>

      {demanda.equatorial && (
        <Secao titulo="Padrão de entrada (Equatorial PA)">
          <BlocoPadraoEquatorial padrao={demanda.equatorial} quadroId={id} disjuntorQdcA={geralDoQuadro(dados)} />
        </Secao>
      )}

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

      <Secao titulo="Memorial descritivo">
        <div className="space-y-3">
          {dadosMem && (
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
              {exigeFormato ? "Obrigatório para a Equatorial neste quadro." : "A Equatorial não exige memorial para unidade individual em BT."}
              <SeloRef titulo="Memorial não exigido para unidade individual em baixa tensão">NT.00001 5.2</SeloRef>
              <SeloRef titulo="Obrigatório para micro/minigeração distribuída">NT.00020 5.13</SeloRef>
            </p>
          )}
          {exigeFormato && (
            <details className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
              <summary className="cursor-pointer font-semibold">
                Formato {dadosMem!.temGeracao ? "NT.00020 (geração própria)" : "NT.00042 (recarga VE > 7,4 kW)"}
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                {EXIGENCIAS_DOCUMENTOS.filter((e) => (dadosMem!.temGeracao ? e.ref.includes("NT.00020") : e.ref.includes("NT.00042"))).map((e, i) => (
                  <li key={i}>
                    {e.texto} <SeloRef>{e.ref}</SeloRef>
                  </li>
                ))}
                <li>A4, assinado, digitalizado (até 5 MB), arquivo “Memorial Técnico Descritivo”.</li>
              </ul>
            </details>
          )}
          <div className="flex items-center gap-2">
            {memorial && !gerando ? (
              <a href={`/quadros/${id}/imprimir?doc=memorial`} target="_blank" className="btn btn-primary">
                <Printer className="size-4" /> Imprimir / PDF
              </a>
            ) : (
              <button
                onClick={dadosMem ? gerarEquatorial : gerar}
                disabled={gerando || analise.circuitos.length === 0}
                className="btn btn-primary"
              >
                {gerando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Gerar memorial
              </button>
            )}
            {memorial && !gerando && rascunho == null && (
              <MenuMais>
                <button onClick={() => setRascunho(memorial)} className="btn btn-ghost">
                  <Pencil className="size-4" /> Editar texto
                </button>
                <button onClick={dadosMem ? gerarEquatorial : gerar} disabled={analise.circuitos.length === 0} className="btn btn-ghost">
                  <Sparkles className="size-4" /> Gerar de novo
                </button>
              </MenuMais>
            )}
          </div>
          {dados.memorial && !texto && rascunho == null && (
            <p className="text-xs text-muted">
              Gerado em {new Date(dados.memorial.geradoEm).toLocaleString("pt-BR")}.
            </p>
          )}
          {rascunho != null ? (
            <div className="space-y-2">
              <textarea
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                rows={18}
                className="input font-mono text-sm"
                aria-label="Texto do memorial (Markdown)"
              />
              <div className="flex gap-2">
                <button onClick={salvarEdicao} disabled={salvando} className="btn btn-primary">
                  {salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar memorial
                </button>
                <button onClick={() => setRascunho(null)} className="btn btn-ghost">
                  <X className="size-4" /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            (memorial || gerando) && (
              <div className="card p-4">
                {memorial && !gerando ? (
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold">Ver texto</summary>
                    <div className="mt-2">
                      <TextoIA>{memorial}</TextoIA>
                    </div>
                  </details>
                ) : memorial ? (
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
            )
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

/** Corrente nominal do disjuntor geral do QDC (componente marcado como geral). */
function geralDoQuadro(dados: QuadroDados) {
  const g = dados.componentes.find((c) => c.geral && peca(c.pecaId)?.tipo === "disjuntor");
  return g ? (peca(g.pecaId)?.correnteNominal ?? null) : null;
}
