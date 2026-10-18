"use client";

import {
  AlertTriangle,
  BookmarkPlus,
  Copy,
  FileDown,
  GitBranch,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Settings2,
  Tags,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  duplicarQuadro,
  excluirQuadro,
  gerarOrcamentoDoQuadro,
  salvarArt,
  salvarComoModelo,
  salvarCompras,
  salvarInspecoes,
  salvarLaudo,
  salvarLigacoesFeitas,
  salvarManutencao,
  salvarQuadro,
} from "@/app/(app)/quadros/actions";
import { Campo } from "@/components/ui";
import type { ItemCatalogoSimples } from "@/lib/eletrica/orcamento-quadro";
import { analisarQuadro } from "@/lib/eletrica/calculo";
import { configLigacoes, gerarLigacoes, listaMateriaisCompleta } from "@/lib/eletrica/ligacoes";
import { modulosOcupados, type Peca, peca } from "@/lib/eletrica/pecas";
import {
  type Circuito,
  type Componente,
  fasesDisponiveis,
  novoCircuito,
  type QuadroDados,
} from "@/lib/eletrica/tipos";
import { ListaAlertas } from "./alertas";
import { ConfigQuadro } from "./config-quadro";
import { BotaoOrcamento } from "./dialogo-orcamento";
import { AssistenteArt, type ClienteResumo, EditorLaudo, type PerfilResumo } from "./laudo-art";
import { PainelCompras } from "./lista-compras";
import { type Instrumento, PainelInspecao } from "./painel-inspecao";
import { PainelManutencao } from "./painel-manutencao";
import { PainelProjeto } from "./painel-projeto";
import { VisorUnifilar } from "./visor-unifilar";
import { VisorMultifilar } from "./visor-multifilar";
import { EditorComponente } from "./editor-componente";
import { Folha } from "./folha";
import { FormCircuito, PRESETS } from "./form-circuito";
import { ListaMateriais } from "./materiais";
import { adicionarComponente, cabe, disjuntorSugerido, fasesSugeridas } from "./montagem";
import { PainelCircuitos, QuadroCargas } from "./painel-circuitos";
import { PainelFases } from "./painel-fases";
import type { DestaquePeca } from "./peca-visual";
import { QuadroVisual } from "./quadro-visual";
import { LigacoesVisual } from "./ligacoes-visual";
import { DetalheLigacao, PainelLigacoes } from "./painel-ligacoes";
import { RevisaoIA } from "./revisao-ia";
import { SeletorPeca } from "./seletor-peca";

type Selecao =
  | { tipo: "vazio"; fileira: number; posicao: number }
  | { tipo: "trocar"; id: string }
  | { tipo: "peca"; id: string }
  | { tipo: "circuito"; id: string; novo: boolean; disjuntorId?: string }
  | { tipo: "config" }
  | null;

const ABAS = [
  { id: "circuitos", rotulo: "Circuitos" },
  { id: "ligacoes", rotulo: "Ligações" },
  { id: "alertas", rotulo: "Verificação" },
  { id: "fases", rotulo: "Fases" },
  { id: "cargas", rotulo: "Quadro de cargas" },
  { id: "materiais", rotulo: "Materiais" },
  { id: "ia", rotulo: "Revisão IA" },
  { id: "projeto", rotulo: "Projeto" },
  { id: "compras", rotulo: "Compras" },
  { id: "inspecao", rotulo: "Inspeção" },
  { id: "laudo", rotulo: "Laudo" },
  { id: "art", rotulo: "ART/TRT" },
  { id: "manutencao", rotulo: "Manutenção" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

const ESCALAS = [0.6, 0.8, 1, 1.25];

export function Construtor({
  id,
  nomeInicial,
  clienteIdInicial,
  dadosIniciais,
  clientes,
  catalogo,
  perfil,
  instrumentos,
  cliente,
  valorContrato,
  abaInicial,
}: {
  id: number;
  nomeInicial: string;
  clienteIdInicial: number | null;
  dadosIniciais: QuadroDados;
  clientes: { id: number; nome: string }[];
  catalogo: ItemCatalogoSimples[];
  perfil: PerfilResumo;
  instrumentos: Instrumento[];
  cliente: ClienteResumo;
  valorContrato: { valor: number; titulo: string } | null;
  abaInicial?: string;
}) {
  const [dados, setDados] = useState(dadosIniciais);
  const [nome, setNome] = useState(nomeInicial);
  const [clienteId, setClienteId] = useState(clienteIdInicial);
  const [salvo, setSalvo] = useState(() => JSON.stringify([nomeInicial, clienteIdInicial, dadosIniciais]));
  const [sel, setSel] = useState<Selecao>(null);
  const [aba, setAba] = useState<Aba>(() => (ABAS.some((a) => a.id === abaInicial) ? (abaInicial as Aba) : "circuitos"));
  const [verUnifilar, setVerUnifilar] = useState(false);
  const [verMultifilar, setVerMultifilar] = useState(false);
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const [escala, setEscala] = useState(2);
  const [menu, setMenu] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [salvando, iniciarSalvar] = useTransition();
  const [, iniciarAcao] = useTransition();

  const analise = useMemo(() => analisarQuadro(dados), [dados]);
  const ligacoes = useMemo(() => gerarLigacoes(dados, analise), [dados, analise]);
  const materiais = useMemo(() => listaMateriaisCompleta(dados, analise), [dados, analise]);
  const [vista, setVista] = useState<"porta" | "espelho" | "montagem" | "ligacoes">("montagem");
  const [animar, setAnimar] = useState(false);
  const [ligSel, setLigSel] = useState<string | null>(null);
  const ligacaoSelecionada = ligSel ? ligacoes.ligacoes.find((l) => l.id === ligSel) : undefined;
  const alterado = JSON.stringify([nome, clienteId, dados]) !== salvo;

  useEffect(() => {
    if (!alterado) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [alterado]);

  const salvar = useCallback(() => {
    iniciarSalvar(async () => {
      const r = await salvarQuadro(id, nome, clienteId, dados);
      if (r.ok) {
        setSalvo(JSON.stringify([nome, clienteId, dados]));
        setErroSalvar(null);
      } else setErroSalvar(r.erro);
    });
  }, [id, nome, clienteId, dados]);

  /**
   * Partes que já foram gravadas no banco por ações próprias (compras, inspeção,
   * laudo, ART, manutenção, memorial): atualiza o estado e a "versão salva" para
   * não acusar alteração pendente.
   */
  const aplicarPersistido = useCallback((patch: Partial<QuadroDados>) => {
    setDados((q) => ({ ...q, ...patch }));
    setSalvo((s) => {
      const [n, c, d] = JSON.parse(s);
      return JSON.stringify([n, c, { ...d, ...patch }]);
    });
  }, []);

  const selo = {
    eletricista: [perfil.nome || perfil.empresa, perfil.registroProfissional].filter(Boolean).join(" — "),
    cliente: clientes.find((c) => c.id === clienteId)?.nome ?? "",
    obra: nome,
    data: new Date().toLocaleDateString("pt-BR"),
  };

  // Destaque das peças conforme o resultado do circuito
  const destaques = useMemo(() => {
    const d: Record<string, DestaquePeca> = {};
    for (const r of analise.circuitos) {
      if (r.componente && (r.status === "erro" || r.status === "aviso")) d[r.componente.id] = r.status;
    }
    return d;
  }, [analise]);

  // ---- Operações ----------------------------------------------------------
  const atualizarComponente = (c: Componente) =>
    setDados((q) => ({ ...q, componentes: q.componentes.map((x) => (x.id === c.id ? c : x)) }));

  const atualizarCircuito = (c: Circuito) =>
    setDados((q) => ({ ...q, circuitos: q.circuitos.map((x) => (x.id === c.id ? c : x)) }));

  function colocarPeca(p: Peca) {
    if (sel?.tipo === "vazio") {
      const r = adicionarComponente(dados, p.id, { fileira: sel.fileira, posicao: sel.posicao });
      if (!r) return;
      setDados(r.quadro);
      setSel({ tipo: "peca", id: r.id });
    } else if (sel?.tipo === "trocar") {
      const atual = dados.componentes.find((c) => c.id === sel.id);
      if (!atual) return;
      const nFases = p.tipo === "dps" ? 1 : Math.min(p.polos, 3);
      atualizarComponente({
        ...atual,
        pecaId: p.id,
        fases: atual.fases.length === nFases ? atual.fases : fasesSugeridas(dados, nFases),
        circuitoId: p.tipo === "disjuntor" ? atual.circuitoId : null,
      });
      setSel({ tipo: "peca", id: atual.id });
    }
  }

  function removerComponente(compId: string) {
    setDados((q) => ({
      ...q,
      componentes: q.componentes.filter((c) => c.id !== compId),
      circuitos: q.circuitos.map((c) => (c.drId === compId ? { ...c, drId: null } : c)),
    }));
    setSel(null);
  }

  function novoCircuitoPara(disjuntorId?: string) {
    const ordem = dados.circuitos.length + 1;
    const dj = disjuntorId ? peca(dados.componentes.find((c) => c.id === disjuntorId)?.pecaId ?? "") : undefined;
    const ligacao = dj?.polos === 3 ? "3F" : dj?.polos === 2 ? "FF" : "FN";
    const c = novoCircuito({ nome: `Circuito ${ordem}`, ligacao });
    setDados((q) => ({
      ...q,
      circuitos: [...q.circuitos, c],
      componentes: disjuntorId
        ? q.componentes.map((k) => (k.id === disjuntorId ? { ...k, circuitoId: c.id } : k))
        : q.componentes,
    }));
    setSel({ tipo: "circuito", id: c.id, novo: true, disjuntorId });
  }

  function removerCircuito(cid: string) {
    setDados((q) => ({
      ...q,
      circuitos: q.circuitos.filter((c) => c.id !== cid),
      componentes: q.componentes.map((k) => (k.circuitoId === cid ? { ...k, circuitoId: null } : k)),
    }));
    setSel(null);
  }

  /** Coloca (ou troca) o disjuntor sugerido pelo motor para o circuito. */
  function aplicarDisjuntorSugerido(cid: string) {
    const c = dados.circuitos.find((x) => x.id === cid);
    if (!c) return;
    const p = disjuntorSugerido(dados, c);
    if (!p) return alert("Não há disjuntor no catálogo para esta corrente.");
    const atual = dados.componentes.find((k) => k.circuitoId === cid);
    if (atual) {
      if (!cabe(dados, atual.fileira, atual.posicao, modulosOcupados(p), atual.id)) {
        return alert("O disjuntor sugerido não cabe nesta posição. Libere espaço ao lado.");
      }
      atualizarComponente({
        ...atual,
        pecaId: p.id,
        fases: atual.fases.length === Math.min(p.polos, 3) ? atual.fases : fasesSugeridas(dados, Math.min(p.polos, 3)),
      });
      return;
    }
    const r = adicionarComponente(dados, p.id, undefined, { circuitoId: cid });
    if (!r) return alert("Quadro sem espaço livre para o disjuntor. Aumente o tamanho da caixa.");
    setDados(r.quadro);
  }

  function fecharCircuito() {
    if (sel?.tipo === "circuito" && sel.novo && !dados.componentes.some((k) => k.circuitoId === sel.id)) {
      aplicarDisjuntorSugerido(sel.id);
    }
    setSel(null);
  }

  // ---- Seleções atuais ----------------------------------------------------
  const compSel = sel?.tipo === "peca" ? dados.componentes.find((c) => c.id === sel.id) : undefined;
  const circSel = sel?.tipo === "circuito" ? dados.circuitos.find((c) => c.id === sel.id) : undefined;
  const resSel = circSel ? analise.circuitos.find((r) => r.circuito.id === circSel.id) : undefined;
  const sugestao = circSel ? disjuntorSugerido(dados, circSel) : undefined;
  const trocando = sel?.tipo === "trocar" ? dados.componentes.find((c) => c.id === sel.id) : undefined;

  const cabePeca = (p: Peca) => {
    const w = modulosOcupados(p);
    if (sel?.tipo === "vazio") return cabe(dados, sel.fileira, sel.posicao, w);
    if (trocando) return cabe(dados, trocando.fileira, trocando.posicao, w, trocando.id);
    return false;
  };

  const todosAlertas = [...analise.alertas, ...analise.circuitos.flatMap((r) => r.alertas), ...ligacoes.alertas];
  const nErros = todosAlertas.filter((a) => a.nivel === "erro").length;
  const nAvisos = todosAlertas.filter((a) => a.nivel === "aviso").length;

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-1 text-2xl font-bold tracking-tight outline-none focus:bg-surface-2"
          aria-label="Nome do quadro"
        />
        <button onClick={() => setSel({ tipo: "config" })} className="btn btn-secondary p-2.5" aria-label="Configurar quadro">
          <Settings2 className="size-4" />
        </button>
        <div className="relative">
          <button onClick={() => setMenu((v) => !v)} className="btn btn-secondary p-2.5" aria-label="Mais opções">
            <MoreVertical className="size-4" />
          </button>
          {menu && (
            <div className="absolute right-0 z-30 mt-1 w-60 rounded-xl border border-border bg-surface p-1 shadow-lg" onMouseLeave={() => setMenu(false)}>
              <button className="btn btn-ghost w-full justify-start" onClick={() => { setMenu(false); setSalvandoModelo(true); }}>
                <BookmarkPlus className="size-4" /> Salvar como modelo
              </button>
              <a className="btn btn-ghost w-full justify-start" href={`/quadros/${id}/imprimir?doc=etiquetas`} target="_blank" onClick={() => setMenu(false)}>
                <Tags className="size-4" /> Etiquetas do quadro
              </a>
              <button className="btn btn-ghost w-full justify-start" onClick={() => { setMenu(false); setAba("art"); }}>
                <Pencil className="size-4" /> Preparar dados da ART/TRT
              </button>
              {dados.projeto && (
                <Link className="btn btn-ghost w-full justify-start" href={`/quadros/projeto?quadro=${id}`}>
                  <Pencil className="size-4" /> Editar dados da obra
                </Link>
              )}
              <button
                className="btn btn-ghost w-full justify-start"
                onClick={() => {
                  setMenu(false);
                  if (alterado && !confirm("Há alterações não salvas que não irão para a cópia. Continuar?")) return;
                  iniciarAcao(() => duplicarQuadro(id));
                }}
              >
                <Copy className="size-4" /> Duplicar
              </button>
              <button
                className="btn btn-ghost w-full justify-start text-danger"
                onClick={() => {
                  setMenu(false);
                  if (confirm("Excluir este quadro?")) iniciarAcao(() => excluirQuadro(id));
                }}
              >
                <Trash2 className="size-4" /> Excluir
              </button>
            </div>
          )}
        </div>
        <button onClick={salvar} disabled={salvando || !alterado} className="btn btn-primary">
          {salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {alterado ? "Salvar" : "Salvo"}
        </button>
      </div>
      {alterado && <p className="no-print -mt-2 text-xs text-warn">Alterações não salvas</p>}

      {/* Ações principais */}
      <div className="no-print -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        <a
          href={`/quadros/${id}/imprimir?auto=1`}
          target="_blank"
          className="btn btn-primary shrink-0"
          onClick={(e) => {
            if (alterado && !confirm("Há alterações não salvas — o PDF usa a versão salva. Salve antes. Continuar mesmo assim?")) e.preventDefault();
          }}
        >
          <FileDown className="size-4" /> Exportar PDF
        </a>
        <button className="btn btn-secondary shrink-0" onClick={() => setVerUnifilar(true)}>
          <GitBranch className="size-4" /> Unifilar
        </button>
        <button className="btn btn-secondary shrink-0" onClick={() => setVerMultifilar(true)}>
          <GitBranch className="size-4" /> Multifilar
        </button>
        <BotaoOrcamento
          className="btn btn-secondary shrink-0"
          clienteId={clienteId}
          clientes={clientes}
          aviso={alterado ? "O orçamento usa a versão salva do quadro. Salve antes para incluir as últimas alterações. Continuar?" : undefined}
          acao={(cid) => gerarOrcamentoDoQuadro(id, cid)}
        />
        <a href={`/quadros/${id}/imprimir?doc=etiquetas`} target="_blank" className="btn btn-secondary shrink-0">
          <Tags className="size-4" /> Etiquetas
        </a>
      </div>
      {erroSalvar && <p className="text-sm text-danger">{erroSalvar}</p>}

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Resumo rotulo="Fornecimento" valor={`${dados.alimentacao.tipo === "monofasico" ? "Mono" : dados.alimentacao.tipo === "bifasico" ? "Bi" : "Tri"} ${dados.alimentacao.tensaoFN}/${dados.alimentacao.tensaoFF} V`} />
        <Resumo rotulo="Potência instalada" valor={`${(analise.potenciaTotalW / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kW`} />
        <Resumo rotulo="Módulos" valor={`${analise.modulosUsados}/${analise.modulosTotais} · reserva ${analise.reservaExigida}`} />
        <button onClick={() => setAba("alertas")} className="card p-3 text-left">
          <p className="text-xs text-muted">Verificação NBR 5410</p>
          <p className={`flex items-center gap-1.5 font-semibold ${nErros ? "text-danger" : nAvisos ? "text-warn" : "text-ok"}`}>
            {nErros || nAvisos ? <AlertTriangle className="size-4" /> : null}
            {nErros ? `${nErros} erro(s)` : nAvisos ? `${nAvisos} aviso(s)` : "Conforme"}
          </p>
        </button>
      </div>

      {/* O quadro */}
      <div className="card overflow-hidden">
        <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
            {(
              [
                ["porta", "Com porta"],
                ["espelho", "Espelho"],
                ["montagem", "Montagem"],
                ["ligacoes", "Ligações"],
              ] as const
            ).map(([v, r]) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium sm:text-sm ${vista === v ? "bg-surface shadow-sm" : "text-muted"}`}
              >
                {r}
              </button>
            ))}
          </div>
          {vista === "ligacoes" && (
            <label className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={animar} onChange={(e) => setAnimar(e.target.checked)} />
              Animar corrente
            </label>
          )}
          <div className="flex items-center gap-1">
            <button className="btn btn-ghost p-2" disabled={escala === 0} onClick={() => setEscala((e) => e - 1)} aria-label="Diminuir zoom">
              <ZoomOut className="size-4" />
            </button>
            <button className="btn btn-ghost p-2" disabled={escala === ESCALAS.length - 1} onClick={() => setEscala((e) => e + 1)} aria-label="Aumentar zoom">
              <ZoomIn className="size-4" />
            </button>
          </div>
        </div>
        <p className="no-print px-3 pt-2 text-xs text-muted">
          {vista === "ligacoes"
            ? "Toque num cabo para ver de onde sai, para onde vai, cor e seção."
            : vista === "porta"
              ? "Frente do quadro fechado. Toque na porta para abrir."
              : vista === "espelho"
                ? "Sem porta: o espelho esconde bornes e cabos, como no quadro real. Toque numa peça para editar."
                : "Sem espelho: trilhos, bornes e barras à mostra. Toque num espaço vazio para colocar uma peça."}
        </p>
        <div className="overflow-x-auto bg-surface-2 p-4">
          <div className="mx-auto w-max">
            {vista !== "ligacoes" ? (
              <QuadroVisual
                dados={dados}
                nome={nome}
                escala={ESCALAS[escala]}
                vista={vista}
                selecionado={compSel?.id ?? null}
                destaques={destaques}
                aoTocarVazio={(fileira, posicao) => setSel({ tipo: "vazio", fileira, posicao })}
                aoTocarPeca={(cid) => setSel({ tipo: "peca", id: cid })}
                aoAbrirPorta={() => setVista("espelho")}
              />
            ) : (
              <LigacoesVisual
                dados={dados}
                resultado={ligacoes}
                nome={nome}
                escala={ESCALAS[escala]}
                selecionada={ligSel}
                aoSelecionar={setLigSel}
                animar={animar}
              />
            )}
          </div>
        </div>
        {vista === "ligacoes" && ligacaoSelecionada && (
          <div className="no-print p-3">
            <DetalheLigacao dados={dados} resultado={ligacoes} ligacao={ligacaoSelecionada} aoMudar={setDados} aoFechar={() => setLigSel(null)} />
          </div>
        )}
      </div>

      {/* Abas de análise */}
      <div className="no-print -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`btn shrink-0 py-2 ${aba === a.id ? "btn-primary" : "btn-secondary"}`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <section className="card p-4">
        {aba === "circuitos" && (
          <PainelCircuitos
            analise={analise}
            aoAbrir={(cid) => setSel({ tipo: "circuito", id: cid, novo: false })}
            aoNovo={() => novoCircuitoPara()}
          />
        )}
        {aba === "ligacoes" && (
          <PainelLigacoes
            id={id}
            dados={dados}
            resultado={ligacoes}
            selecionada={ligSel}
            aoSelecionar={(lid) => {
              setLigSel(lid);
              setVista("ligacoes");
            }}
            aoMudar={setDados}
            aoMarcar={(feitas) => {
              // Só "feitas" é gravado agora; cores/ajustes continuam dependendo do Salvar.
              setDados((q) => ({ ...q, ligacoes: { ...configLigacoes(q), feitas } }));
              setSalvo((sv) => {
                const [n, c, d] = JSON.parse(sv);
                return JSON.stringify([n, c, { ...d, ligacoes: { ...configLigacoes(d), feitas } }]);
              });
              salvarLigacoesFeitas(id, feitas);
            }}
          />
        )}
        {aba === "alertas" && (
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold">Quadro</h3>
              <ListaAlertas alertas={analise.alertas} vazio="Nenhum problema geral encontrado." />
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Ligações</h3>
              <ListaAlertas alertas={ligacoes.alertas.filter((a) => a.nivel !== "info")} vazio="Ligações sem problemas." />
            </div>
            {analise.circuitos.map((r, i) =>
              r.alertas.some((a) => a.nivel !== "info") ? (
                <div key={r.circuito.id}>
                  <h3 className="mb-2 font-semibold">
                    {i + 1}. {r.circuito.nome}
                  </h3>
                  <ListaAlertas alertas={r.alertas.filter((a) => a.nivel !== "info")} />
                </div>
              ) : null,
            )}
            <p className="text-xs text-muted">
              Verificação automática baseada na NBR 5410:2004 (versão corrigida 2008). Valores marcados com
              “conferir” devem ser confirmados na edição vigente da norma. Não substitui projeto assinado
              quando exigido.
            </p>
          </div>
        )}
        {aba === "fases" && <PainelFases analise={analise} fases={fasesDisponiveis(dados.alimentacao)} />}
        {aba === "cargas" && (
          analise.circuitos.length ? <QuadroCargas analise={analise} /> : <p className="text-sm text-muted">Sem circuitos ainda.</p>
        )}
        {aba === "materiais" && <ListaMateriais itens={materiais} />}
        {aba === "ia" && <RevisaoIA nome={nome} dados={dados} analise={analise} />}
        {aba === "projeto" && (
          <PainelProjeto
            id={id}
            nome={nome}
            dados={dados}
            analise={analise}
            alterado={alterado}
            aoMudarMemorial={(memorial) => aplicarPersistido({ memorial })}
            aoMudarConcessionaria={(concessionaria) => setDados((q) => ({ ...q, concessionaria }))}
            aoVerUnifilar={() => setVerUnifilar(true)}
            botaoOrcamento={
              <BotaoOrcamento
                clienteId={clienteId}
                clientes={clientes}
                aviso={alterado ? "O orçamento usa a versão salva do quadro. Continuar?" : undefined}
                acao={(cid) => gerarOrcamentoDoQuadro(id, cid)}
              />
            }
          />
        )}
        {aba === "compras" && (
          <PainelCompras
            id={id}
            nome={nome}
            dados={dados}
            analise={analise}
            catalogo={catalogo}
            aoMarcar={(compras) => {
              aplicarPersistido({ compras });
              salvarCompras(id, compras);
            }}
          />
        )}
        {aba === "inspecao" && (
          <PainelInspecao
            id={id}
            nome={nome}
            dados={dados}
            responsavelPadrao={perfil.nome}
            instrumentos={instrumentos}
            aoSalvar={(inspecoes) => {
              aplicarPersistido({ inspecoes });
              salvarInspecoes(id, inspecoes);
            }}
          />
        )}
        {aba === "laudo" && (
          <EditorLaudo
            id={id}
            dados={dados}
            perfil={perfil}
            aoSalvar={async (laudo) => {
              const r = await salvarLaudo(id, laudo);
              if (r.ok) aplicarPersistido({ laudo: r.laudo });
            }}
          />
        )}
        {aba === "art" && (
          <AssistenteArt
            dados={dados}
            perfil={perfil}
            cliente={clienteId === clienteIdInicial ? cliente : null}
            valorContrato={clienteId === clienteIdInicial ? valorContrato : null}
            aoSalvar={(art) => {
              aplicarPersistido({ art });
              salvarArt(id, art);
            }}
          />
        )}
        {aba === "manutencao" && (
          <PainelManutencao
            id={id}
            nome={nome}
            dados={dados}
            tecnicoPadrao={perfil.nome}
            cliente={clienteId === clienteIdInicial && cliente ? { nome: cliente.nome, telefone: cliente.telefone } : null}
            clienteId={clienteId}
            clientes={clientes}
            aoSalvar={(manutencao) => {
              aplicarPersistido({ manutencao });
              salvarManutencao(id, manutencao);
            }}
          />
        )}
      </section>

      {/* Folhas */}
      <Folha
        titulo={sel?.tipo === "trocar" ? "Trocar peça" : "Colocar peça"}
        aberta={sel?.tipo === "vazio" || sel?.tipo === "trocar"}
        aoFechar={() => setSel(trocando ? { tipo: "peca", id: trocando.id } : null)}
      >
        <SeletorPeca aoEscolher={colocarPeca} cabe={cabePeca} polosMax={fasesDisponiveis(dados.alimentacao).length} />
      </Folha>

      <Folha
        titulo={compSel ? (peca(compSel.pecaId)?.nome ?? "Peça") : "Peça"}
        aberta={Boolean(compSel)}
        aoFechar={() => setSel(null)}
        rodape={<button className="btn btn-primary ml-auto" onClick={() => setSel(null)}>Pronto</button>}
      >
        {compSel && (
          <EditorComponente
            dados={dados}
            analise={analise}
            componente={compSel}
            aoMudar={atualizarComponente}
            aoMudarQuadro={setDados}
            aoEditarCircuito={(cid) => setSel({ tipo: "circuito", id: cid, novo: false })}
            aoNovoCircuito={() => novoCircuitoPara(compSel.id)}
            aoTrocarPeca={() => setSel({ tipo: "trocar", id: compSel.id })}
            aoRemover={() => removerComponente(compSel.id)}
          />
        )}
      </Folha>

      <Folha
        titulo={circSel ? `Circuito ${dados.circuitos.indexOf(circSel) + 1}` : "Circuito"}
        aberta={Boolean(circSel)}
        aoFechar={fecharCircuito}
        rodape={
          circSel && (
            <>
              <button className="btn btn-danger" onClick={() => confirm("Excluir este circuito?") && removerCircuito(circSel.id)}>
                <Trash2 className="size-4" /> Excluir
              </button>
              <button className="btn btn-primary ml-auto" onClick={fecharCircuito}>
                {sel?.tipo === "circuito" && sel.novo && !resSel?.componente ? "Pronto e colocar disjuntor" : "Pronto"}
              </button>
            </>
          )
        }
      >
        {circSel && (
          <div className="space-y-5">
            {sel?.tipo === "circuito" && sel.novo && (
              <div className="space-y-1.5">
                <span className="label">Preencher rápido</span>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {PRESETS.map((p) => (
                    <button
                      key={p.nome}
                      className="badge shrink-0 bg-surface-2 py-1.5"
                      onClick={() => {
                        const ligacao =
                          p.c.ligacao === "FF" && dados.alimentacao.tipo === "monofasico" ? "FN" : (p.c.ligacao ?? circSel.ligacao);
                        atualizarCircuito({ ...circSel, ...p.c, ligacao, nome: p.nome });
                      }}
                    >
                      {p.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {resSel && (
              <div className="rounded-2xl bg-surface-2 p-3">
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <Dado rotulo="Corrente (Ib)" valor={`${resSel.dim.ib.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} A`} />
                  <Dado rotulo="Cabo" valor={resSel.dim.secao ? `${resSel.dim.secao.toLocaleString("pt-BR")} mm²` : "—"} />
                  <Dado rotulo="Disjuntor sugerido" valor={sugestao ? sugestao.rotulo + ` ${sugestao.polos}P` : "—"} />
                  <Dado rotulo="Queda de tensão" valor={`${resSel.dim.quedaPct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`} />
                </div>
                <p className="mt-2 text-xs text-muted">
                  Iz do cabo: {resSel.dim.iz.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} A (FCT {resSel.dim.fct} × FCA{" "}
                  {resSel.dim.fca}) · critérios: capacidade {resSel.dim.secaoCapacidade ?? "?"} mm², queda {resSel.dim.secaoQueda ?? "?"} mm²,
                  mínima {resSel.dim.secaoMinima} mm²
                </p>
                {sugestao && (!resSel.pecaDisjuntor || resSel.pecaDisjuntor.id !== sugestao.id) && (
                  <button className="btn btn-secondary mt-3" onClick={() => aplicarDisjuntorSugerido(circSel.id)}>
                    <Plus className="size-4" /> {resSel.pecaDisjuntor ? `Trocar para ${sugestao.nome}` : `Colocar ${sugestao.nome} no quadro`}
                  </button>
                )}
                <div className="mt-3">
                  <ListaAlertas alertas={resSel.alertas} vazio="Circuito conforme a NBR 5410." />
                </div>
              </div>
            )}

            <FormCircuito circuito={circSel} alimentacao={dados.alimentacao} aoMudar={atualizarCircuito} />
          </div>
        )}
      </Folha>

      <Folha
        titulo="Configurar quadro"
        aberta={sel?.tipo === "config"}
        aoFechar={() => setSel(null)}
        rodape={<button className="btn btn-primary ml-auto" onClick={() => setSel(null)}>Pronto</button>}
      >
        <ConfigQuadro dados={dados} aoMudar={setDados} clientes={clientes} clienteId={clienteId} aoMudarCliente={setClienteId} />
      </Folha>

      {verMultifilar && (
        <VisorMultifilar
          id={id}
          dados={dados}
          analise={analise}
          selo={{
            ...selo,
            alimentacao: `${dados.alimentacao.tipo} ${dados.alimentacao.tensaoFN}/${dados.alimentacao.tensaoFF} V · ${dados.alimentacao.esquema}`,
          }}
          alterado={alterado}
          aoFechar={() => setVerMultifilar(false)}
        />
      )}
      {verUnifilar && (
        <VisorUnifilar id={id} dados={dados} analise={analise} selo={selo} alterado={alterado} aoFechar={() => setVerUnifilar(false)} />
      )}

      <Folha titulo="Salvar como modelo" aberta={salvandoModelo} aoFechar={() => setSalvandoModelo(false)}>
        <form
          className="space-y-4"
          action={async (f) => {
            const r = await salvarComoModelo(String(f.get("nome") ?? ""), String(f.get("descricao") ?? ""), dados);
            if (!r.ok) return alert(r.erro);
            setSalvandoModelo(false);
            alert("Modelo salvo! Ele aparece em Quadros → Modelos.");
          }}
        >
          <Campo rotulo="Nome do modelo">
            <input name="nome" defaultValue={nome} required className="input" />
          </Campo>
          <Campo rotulo="Descrição curta">
            <input name="descricao" placeholder="Ex.: casa 2 quartos, bifásico, 2 chuveiros" className="input" />
          </Campo>
          <p className="text-xs text-muted">O modelo guarda a montagem atual (peças e circuitos), sem cliente, inspeções ou documentos.</p>
          <button className="btn btn-primary w-full">Salvar modelo</button>
        </form>
      </Folha>

      {/* Na impressão, o quadro de cargas sai junto */}
      <div className="hidden print:block">
        <h2 className="mb-2 mt-6 font-bold">Quadro de cargas</h2>
        <QuadroCargas analise={analise} />
      </div>
    </div>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-muted">{rotulo}</p>
      <p className="truncate font-semibold">{valor}</p>
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{rotulo}</p>
      <p className="font-bold">{valor}</p>
    </div>
  );
}
