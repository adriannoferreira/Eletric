"use client";

import { AlertTriangle, Check, Copy, ExternalLink, FileText, Loader2, Plus, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sk } from "@/components/skeleton";
import { lerStream } from "@/components/texto-ia";
import { Campo } from "@/components/ui";
import { analisarQuadro } from "@/lib/eletrica/calculo";
import { concessionaria } from "@/lib/eletrica/concessionarias";
import { gerarChecklist, resumirInspecao, descreverInspecao } from "@/lib/eletrica/inspecao";
import type { Laudo, NaoConformidade, QuadroDados, RegistroArt } from "@/lib/eletrica/tipos";
import { reais } from "@/lib/formato";
import { interpretarRedacao, laudoPadrao } from "@/lib/eletrica/laudo";

export type PerfilResumo = {
  nome: string;
  empresa: string;
  documento: string;
  telefone: string;
  email: string;
  cidade: string;
  registroProfissional: string;
};
export type ClienteResumo = {
  nome: string;
  documento: string;
  endereco: string;
  bairro: string;
  cidade: string;
  telefone: string;
  email: string;
} | null;

/** Usa o debounce para gravar sem um clique de "Salvar" (uso em campo). */
function useAutoSalvar<T>(valor: T, salvar: (v: T) => void, ativo: boolean) {
  const primeiro = useRef(true);
  const salvarRef = useRef(salvar);
  useEffect(() => {
    salvarRef.current = salvar;
  });
  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false;
      return;
    }
    if (!ativo) return;
    const t = setTimeout(() => salvarRef.current(valor), 800);
    return () => clearTimeout(t);
  }, [valor, ativo]);
}

const AVISO_LEGAL =
  "O laudo só tem validade quando emitido e assinado por profissional legalmente habilitado (técnico com registro no CFT/CRT ou engenheiro no CREA, dentro das suas atribuições), acompanhado da TRT/ART correspondente.";

export function EditorLaudo({
  dados,
  perfil,
  aoSalvar,
  id,
}: {
  id: number;
  dados: QuadroDados;
  perfil: PerfilResumo;
  aoSalvar: (l: Laudo) => void;
}) {
  const [laudo, setLaudo] = useState<Laudo>(() => dados.laudo ?? laudoPadrao(dados));
  const [redigindo, setRedigindo] = useState(false);
  const [rascunhoIA, setRascunhoIA] = useState("");
  useAutoSalvar(laudo, aoSalvar, true);
  const set = (p: Partial<Laudo>) => setLaudo((l) => ({ ...l, ...p }));
  const habilitado = Boolean(perfil.registroProfissional.trim());
  const insp = dados.inspecoes.find((i) => i.id === laudo.inspecaoId) ?? null;
  const itens = useMemo(() => gerarChecklist(dados), [dados]);
  const resumo = insp ? resumirInspecao(itens, insp) : null;

  function importarDaInspecao() {
    if (!resumo) return;
    set({
      naoConformidades: resumo.naoConformes.map((x) => ({
        descricao: `${x.item.titulo}${x.resposta?.obs ? ` — ${x.resposta.obs}` : ""}`,
        risco: x.item.secao === "ensaio" ? "alto" : "medio",
        recomendacao: "",
      })),
      conclusao: resumo.nc > 0 ? "ressalvas" : "conforme",
    });
  }

  async function redigir() {
    setRedigindo(true);
    setRascunhoIA("");
    let final = "";
    const a = analisarQuadro(dados);
    const al = dados.alimentacao;
    const pedido = `Redija os textos técnicos de um laudo/relatório de inspeção de instalação elétrica de baixa tensão (NBR 5410). NÃO invente medições, nomes, registros ou números de ART/TRT.

Instalação: ${al.tipo} ${al.tensaoFN}/${al.tensaoFF} V, esquema ${al.esquema}${dados.projeto ? `, concessionária ${concessionaria(dados.projeto.obra.concessionaria).nome}` : ""}; ${a.circuitos.length} circuitos; potência instalada ${(a.potenciaTotalW / 1000).toFixed(2)} kW.
Resultado da inspeção (${insp ? new Date(insp.data).toLocaleDateString("pt-BR") : "sem inspeção registrada"}):
${insp ? descreverInspecao(itens, insp) : "(sem dados)"}

Responda EXATAMENTE neste formato, sem nada antes ou depois:
### ANALISE
(2 a 4 parágrafos: estado geral da instalação e principais achados)
### NAO_CONFORMIDADES
- [alto|medio|baixo] descrição curta | recomendação de correção
### CONCLUSAO
conforme|ressalvas|nao_conforme
(1 parágrafo de conclusão)`;
    try {
      const res = await fetch("/api/ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistente: "eletrica", esforco: "high", pedido }),
      });
      await lerStream(res, (t) => {
        final = t;
        setRascunhoIA(t);
      });
      if (res.ok) {
        const p = interpretarRedacao(final);
        if (p) {
          set(p);
          setRascunhoIA("");
        }
      }
    } catch {
      setRascunhoIA("⚠️ Sem conexão. Tente de novo.");
    } finally {
      setRedigindo(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-xl bg-warn-soft p-3 text-sm text-warn">
        <ShieldAlert className="size-5 shrink-0" />
        <div className="text-fg">
          <p className="font-semibold">Validade do laudo</p>
          <p>{AVISO_LEGAL}</p>
          {!habilitado && (
            <p className="mt-1 font-semibold text-danger">
              Seu perfil está sem registro profissional: o documento sai como “Relatório de inspeção” com marca d’água
              “RASCUNHO — requer responsável técnico habilitado”. Preencha o registro em Meu perfil se você for habilitado.
            </p>
          )}
        </div>
      </div>

      <Campo rotulo="Inspeção usada no laudo">
        <select value={laudo.inspecaoId ?? ""} onChange={(e) => set({ inspecaoId: e.target.value || null })} className="input">
          <option value="">— nenhuma —</option>
          {dados.inspecoes.map((i) => (
            <option key={i.id} value={i.id}>
              {new Date(i.data).toLocaleDateString("pt-BR")} — {i.responsavel || "sem responsável"}
            </option>
          ))}
        </select>
      </Campo>
      {resumo && (
        <p className="text-sm">
          Inspeção: {resumo.ok} OK, <span className="text-danger">{resumo.nc} não conformes</span>, {resumo.pendentes} pendentes.{" "}
          <button onClick={importarDaInspecao} className="text-info underline">
            Trazer não conformidades
          </button>
        </p>
      )}

      <button onClick={redigir} disabled={redigindo} className="btn btn-primary">
        {redigindo ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Redigir laudo com IA
      </button>
      {redigindo && !rascunhoIA && (
        <div className="space-y-2" aria-label="Redigindo">
          <Sk className="h-3 w-full" />
          <Sk className="h-3 w-4/5" />
        </div>
      )}
      {rascunhoIA && <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-xs">{rascunhoIA}</pre>}

      <Campo rotulo="2. Objetivo e escopo">
        <textarea value={laudo.objetivo} onChange={(e) => set({ objetivo: e.target.value })} rows={3} className="input" />
      </Campo>
      <Campo rotulo="Análise / descrição dos resultados">
        <textarea value={laudo.analise} onChange={(e) => set({ analise: e.target.value })} rows={6} className="input" />
      </Campo>

      <div>
        <p className="label mb-1.5">7. Não conformidades e recomendações</p>
        <ul className="space-y-2">
          {laudo.naoConformidades.map((nc, i) => (
            <li key={i} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex gap-2">
                <select
                  value={nc.risco}
                  onChange={(e) => set({ naoConformidades: laudo.naoConformidades.map((x, j) => (j === i ? { ...x, risco: e.target.value as NaoConformidade["risco"] } : x)) })}
                  className="input w-28"
                >
                  <option value="alto">Risco alto</option>
                  <option value="medio">Risco médio</option>
                  <option value="baixo">Risco baixo</option>
                </select>
                <input
                  value={nc.descricao}
                  onChange={(e) => set({ naoConformidades: laudo.naoConformidades.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)) })}
                  placeholder="Não conformidade"
                  className="input flex-1"
                />
                <button
                  onClick={() => set({ naoConformidades: laudo.naoConformidades.filter((_, j) => j !== i) })}
                  className="btn btn-ghost p-2 text-muted"
                  aria-label="Remover"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <input
                value={nc.recomendacao}
                onChange={(e) => set({ naoConformidades: laudo.naoConformidades.map((x, j) => (j === i ? { ...x, recomendacao: e.target.value } : x)) })}
                placeholder="Recomendação de correção"
                className="input"
              />
            </li>
          ))}
        </ul>
        <button
          onClick={() => set({ naoConformidades: [...laudo.naoConformidades, { descricao: "", risco: "medio", recomendacao: "" }] })}
          className="btn btn-secondary mt-2"
        >
          <Plus className="size-4" /> Adicionar
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="8. Conclusão">
          <select value={laudo.conclusao} onChange={(e) => set({ conclusao: e.target.value as Laudo["conclusao"] })} className="input">
            <option value="conforme">Conforme</option>
            <option value="ressalvas">Conforme com ressalvas</option>
            <option value="nao_conforme">Não conforme</option>
          </select>
        </Campo>
        <Campo rotulo="Texto da conclusão" className="sm:col-span-2">
          <textarea value={laudo.textoConclusao} onChange={(e) => set({ textoConclusao: e.target.value })} rows={3} className="input" />
        </Campo>
      </div>
      <Campo rotulo="9. Validade / periodicidade da próxima inspeção">
        <textarea value={laudo.periodicidade} onChange={(e) => set({ periodicidade: e.target.value })} rows={2} className="input" />
      </Campo>
      <p className="text-xs text-muted">
        O nº da ART/TRT vem da aba “ART/TRT” (você informa depois de emitir no sistema do conselho). Salvo automaticamente.
      </p>
      <a href={`/quadros/${id}/imprimir?doc=laudo&auto=1`} target="_blank" className="btn btn-primary">
        <FileText className="size-4" /> {habilitado ? "Laudo técnico (PDF)" : "Relatório de inspeção — rascunho (PDF)"}
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assistente de ART/TRT — só prepara os dados
// ---------------------------------------------------------------------------

const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

const ATIVIDADES: Record<RegistroArt["atividade"], string> = {
  projeto: "Projeto",
  execucao: "Execução",
  projeto_execucao: "Projeto e execução",
  manutencao: "Manutenção",
  inspecao: "Inspeção e laudo técnico",
};

export function descricaoAtividade(dados: QuadroDados, atividade: RegistroArt["atividade"]) {
  const a = analisarQuadro(dados);
  const al = dados.alimentacao;
  const imovel = dados.projeto
    ? { casa: "residência", sobrado: "residência (sobrado)", apartamento: "apartamento", comercio: "estabelecimento comercial", outro: "edificação" }[dados.projeto.obra.tipoImovel]
    : "edificação";
  const kw = (a.potenciaTotalW / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return `${ATIVIDADES[atividade]} de instalação elétrica de baixa tensão em ${imovel}, compreendendo quadro de distribuição com ${a.circuitos.length} circuitos terminais, potência instalada de ${kw} kW, alimentação ${al.tipo} ${al.tensaoFN}/${al.tensaoFF} V, esquema de aterramento ${al.esquema}, com proteção por disjuntores termomagnéticos, dispositivos DR de 30 mA e DPS, conforme ABNT NBR 5410 e NR-10.`;
}

function artPadrao(dados: QuadroDados, cliente: ClienteResumo): RegistroArt {
  return {
    tipo: "TRT",
    uf: "",
    linkConselho: "",
    atividade: dados.inspecoes.length ? "inspecao" : "projeto_execucao",
    enderecoObra: cliente ? [cliente.endereco, cliente.bairro, cliente.cidade].filter(Boolean).join(", ") : "",
    inicio: "",
    fim: "",
    descricao: descricaoAtividade(dados, dados.inspecoes.length ? "inspecao" : "projeto_execucao"),
    numero: "",
    dataEmissao: "",
  };
}

function Copiavel({ rotulo, valor }: { rotulo: string; valor: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex items-start gap-2 border-b border-border/60 py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{rotulo}</p>
        <p className="whitespace-pre-wrap break-words text-sm">{valor || <span className="text-warn">não informado</span>}</p>
      </div>
      <button
        disabled={!valor}
        onClick={async () => {
          await navigator.clipboard.writeText(valor);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        }}
        className="btn btn-ghost shrink-0 p-2"
        aria-label={`Copiar ${rotulo}`}
      >
        {ok ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}

export function AssistenteArt({
  dados,
  perfil,
  cliente,
  valorContrato,
  aoSalvar,
}: {
  dados: QuadroDados;
  perfil: PerfilResumo;
  cliente: ClienteResumo;
  valorContrato: { valor: number; titulo: string } | null;
  aoSalvar: (r: RegistroArt) => void;
}) {
  const [art, setArt] = useState<RegistroArt>(() => dados.art ?? artPadrao(dados, cliente));
  const [sugestao, setSugestao] = useState("");
  const [carregando, setCarregando] = useState(false);
  useAutoSalvar(art, aoSalvar, true);
  const set = (p: Partial<RegistroArt>) => setArt((a) => ({ ...a, ...p }));
  const kw = (analisarQuadro(dados).potenciaTotalW / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const linkOficial =
    art.linkConselho ||
    (art.tipo === "TRT" ? "https://www.cft.org.br" : `https://www.google.com/search?q=${encodeURIComponent(`CREA-${art.uf || "seu estado"} ART online`)}`);

  async function sugerir() {
    setCarregando(true);
    setSugestao("");
    const pedido = `Sugira um texto curto (máx. 600 caracteres) para o campo "descrição/observações" de uma ${art.tipo} de ${ATIVIDADES[art.atividade].toLowerCase()} de instalação elétrica de baixa tensão, a partir destes dados: ${descricaoAtividade(dados, art.atividade)} Endereço da obra: ${art.enderecoObra || "não informado"}. Use linguagem técnica objetiva, sem inventar números de registro, ART/TRT ou valores. Responda só com o texto.`;
    try {
      const res = await fetch("/api/ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistente: "eletrica", esforco: "low", pedido }),
      });
      await lerStream(res, setSugestao);
    } catch {
      setSugestao("⚠️ Sem conexão.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 rounded-xl bg-info-soft p-3 text-sm">
        <AlertTriangle className="size-5 shrink-0 text-info" />
        <p className="text-fg">
          <b>A ART/TRT é emitida e assinada por você no sistema do seu conselho. O app só prepara os dados.</b> Copie cada
          campo abaixo para o sistema oficial (CFT/CRT para TRT, CREA para ART), emita, pague a taxa e depois registre aqui o
          número.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Documento">
          <select value={art.tipo} onChange={(e) => set({ tipo: e.target.value as RegistroArt["tipo"] })} className="input">
            <option value="TRT">TRT — técnico (CFT/CRT)</option>
            <option value="ART">ART — engenheiro (CREA)</option>
          </select>
        </Campo>
        <Campo rotulo="UF">
          <select value={art.uf} onChange={(e) => set({ uf: e.target.value })} className="input">
            <option value="">—</option>
            {UFS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Atividade">
          <select
            value={art.atividade}
            onChange={(e) => {
              const atividade = e.target.value as RegistroArt["atividade"];
              set({ atividade, descricao: descricaoAtividade(dados, atividade) });
            }}
            className="input"
          >
            {Object.entries(ATIVIDADES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Link do sistema do seu conselho" className="sm:col-span-3" dica="Salve aqui o endereço que você usa para emitir (ex.: o do CREA do seu estado).">
          <input value={art.linkConselho} onChange={(e) => set({ linkConselho: e.target.value })} placeholder="https://…" className="input" />
        </Campo>
        <Campo rotulo="Endereço da obra" className="sm:col-span-3">
          <input value={art.enderecoObra} onChange={(e) => set({ enderecoObra: e.target.value })} className="input" />
        </Campo>
        <Campo rotulo="Início previsto">
          <input type="date" value={art.inicio} onChange={(e) => set({ inicio: e.target.value })} className="input" />
        </Campo>
        <Campo rotulo="Término previsto">
          <input type="date" value={art.fim} onChange={(e) => set({ fim: e.target.value })} className="input" />
        </Campo>
        <Campo rotulo="Descrição da atividade" className="sm:col-span-3">
          <textarea value={art.descricao} onChange={(e) => set({ descricao: e.target.value })} rows={4} className="input" />
        </Campo>
      </div>

      <a href={linkOficial} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
        <ExternalLink className="size-4" />{" "}
        {art.linkConselho ? "Abrir o sistema do meu conselho" : art.tipo === "TRT" ? "Abrir o site do CFT" : `Buscar “CREA-${art.uf || "UF"} ART online”`}
      </a>

      <section className="card p-4">
        <h4 className="mb-1 font-semibold">Dados prontos para copiar</h4>
        <Copiavel rotulo="Contratante — nome" valor={cliente?.nome ?? ""} />
        <Copiavel rotulo="Contratante — CPF/CNPJ" valor={cliente?.documento ?? ""} />
        <Copiavel rotulo="Contratante — endereço" valor={cliente ? [cliente.endereco, cliente.bairro, cliente.cidade].filter(Boolean).join(", ") : ""} />
        <Copiavel rotulo="Endereço da obra/serviço" valor={art.enderecoObra} />
        <Copiavel rotulo="Data de início" valor={art.inicio ? new Date(art.inicio + "T12:00:00").toLocaleDateString("pt-BR") : ""} />
        <Copiavel rotulo="Data de término" valor={art.fim ? new Date(art.fim + "T12:00:00").toLocaleDateString("pt-BR") : ""} />
        <Copiavel rotulo="Atividade" valor={`${ATIVIDADES[art.atividade]} — instalação elétrica de baixa tensão`} />
        <Copiavel rotulo="Descrição" valor={art.descricao} />
        <Copiavel rotulo="Quantidade e unidade" valor={`${kw} kW instalados (${dados.circuitos.length} circuitos)`} />
        <Copiavel rotulo="Valor do contrato" valor={valorContrato ? `${reais(valorContrato.valor)} (orçamento “${valorContrato.titulo}”)` : ""} />
        <Copiavel rotulo="Responsável técnico" valor={perfil.nome} />
        <Copiavel rotulo="Registro profissional" valor={perfil.registroProfissional} />
        <Copiavel rotulo="CPF/CNPJ do responsável" valor={perfil.documento} />
        <Copiavel rotulo="Contato do responsável" valor={[perfil.telefone, perfil.email].filter(Boolean).join(" · ")} />
        {!valorContrato && <p className="mt-2 text-xs text-muted">Sem orçamento aprovado para este cliente — informe o valor do contrato no sistema do conselho.</p>}
      </section>

      <div className="space-y-2">
        <button onClick={sugerir} disabled={carregando} className="btn btn-secondary">
          {carregando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Sugerir texto de observações (IA)
        </button>
        {sugestao && <Copiavel rotulo="Sugestão de observações" valor={sugestao} />}
      </div>

      <section className="grid gap-3 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2">
        <p className="text-sm font-semibold sm:col-span-2">Depois de emitir no sistema oficial</p>
        <Campo rotulo={`Nº da ${art.tipo} emitida`}>
          <input value={art.numero} onChange={(e) => set({ numero: e.target.value })} className="input" />
        </Campo>
        <Campo rotulo="Data de emissão">
          <input type="date" value={art.dataEmissao} onChange={(e) => set({ dataEmissao: e.target.value })} className="input" />
        </Campo>
        <p className="text-xs text-muted sm:col-span-2">O número aparece no laudo e no PDF do quadro. Salvo automaticamente.</p>
      </section>
    </div>
  );
}
