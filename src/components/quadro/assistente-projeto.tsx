"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { salvarProjetoObra } from "@/app/(app)/quadros/actions";
import type { ObraExtraidaT } from "@/app/api/ia/extrair-obra/route";
import { Campo } from "@/components/ui";
import { analisarQuadro } from "@/lib/eletrica/calculo";
import { CONCESSIONARIAS, concessionaria } from "@/lib/eletrica/concessionarias";
import {
  AR_POR_BTU,
  gerarQuadro,
  perimetroEfetivo,
  preverAmbientes,
  presetCarga,
  PRESETS_CARGA,
  projetoVazio,
} from "@/lib/eletrica/projeto";
import { DESCRICAO_METODO, METODOS } from "@/lib/eletrica/tabelas";
import {
  type Ambiente,
  type Carga,
  novoId,
  type Obra,
  type ProjetoObra,
  TIPOS_AMBIENTE,
  type TipoAmbiente,
} from "@/lib/eletrica/tipos";
import { ListaAlertas } from "./alertas";
import { BlocoDemanda } from "./projeto-blocos";
import { QuadroVisual } from "./quadro-visual";

const ETAPAS = ["Obra", "Ambientes", "Cargas", "Revisão"] as const;
const RASCUNHO = "eletric:rascunho-projeto";

const AMBIENTES_RAPIDOS: { tipo: TipoAmbiente; nome: string; area: number; perimetro: number }[] = [
  { tipo: "sala", nome: "Sala", area: 16, perimetro: 16 },
  { tipo: "quarto", nome: "Quarto", area: 10, perimetro: 13 },
  { tipo: "banheiro", nome: "Banheiro", area: 3.5, perimetro: 7.5 },
  { tipo: "cozinha", nome: "Cozinha", area: 8, perimetro: 12 },
  { tipo: "area_servico", nome: "Área de serviço", area: 4, perimetro: 8 },
  { tipo: "varanda", nome: "Varanda", area: 6, perimetro: 10 },
  { tipo: "garagem", nome: "Garagem", area: 15, perimetro: 16 },
  { tipo: "corredor", nome: "Corredor", area: 4, perimetro: 9 },
  { tipo: "escritorio", nome: "Escritório", area: 9, perimetro: 12 },
  { tipo: "area_externa", nome: "Área externa", area: 20, perimetro: 18 },
];

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function AssistenteProjeto({
  clientes,
  quadroId,
  nomeInicial,
  clienteInicial,
  projetoInicial,
  iaLigada,
}: {
  clientes: { id: number; nome: string }[];
  quadroId: number | null;
  nomeInicial: string;
  clienteInicial: number | null;
  projetoInicial: ProjetoObra | null;
  iaLigada: boolean;
}) {
  const router = useRouter();
  const [etapa, setEtapa] = useState(0);
  const [nome, setNome] = useState(nomeInicial);
  const [clienteId, setClienteId] = useState<number | null>(clienteInicial);
  const [projeto, setProjeto] = useState<ProjetoObra>(() => projetoInicial ?? projetoVazio());
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const [carregouRascunho, setCarregouRascunho] = useState(false);

  // Rascunho local (só para projeto novo), para não perder o que foi digitado na obra.
  useEffect(() => {
    if (quadroId || projetoInicial) return;
    try {
      const r = localStorage.getItem(RASCUNHO);
      if (r) {
        const d = JSON.parse(r);
        if (d?.projeto) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- restauração única do rascunho salvo neste aparelho
          setProjeto(d.projeto);
          setNome(d.nome ?? "");
          setCarregouRascunho(true);
        }
      }
    } catch {}
  }, [quadroId, projetoInicial]);
  useEffect(() => {
    if (quadroId) return;
    try {
      localStorage.setItem(RASCUNHO, JSON.stringify({ nome, projeto }));
    } catch {}
  }, [nome, projeto, quadroId]);

  const setObra = (o: Partial<Obra>) => setProjeto((p) => ({ ...p, obra: { ...p.obra, ...o } }));
  const setAmb = (id: string, a: Partial<Ambiente>) =>
    setProjeto((p) => ({ ...p, ambientes: p.ambientes.map((x) => (x.id === id ? { ...x, ...a } : x)) }));
  const setCarga = (id: string, c: Partial<Carga>) =>
    setProjeto((p) => ({ ...p, cargas: p.cargas.map((x) => (x.id === id ? { ...x, ...c } : x)) }));

  function addAmbiente(t: (typeof AMBIENTES_RAPIDOS)[number]) {
    const iguais = projeto.ambientes.filter((a) => a.tipo === t.tipo).length;
    setProjeto((p) => ({
      ...p,
      ambientes: [
        ...p.ambientes,
        {
          id: novoId("a"),
          nome: iguais ? `${t.nome} ${iguais + 1}` : t.nome,
          tipo: t.tipo,
          areaM2: t.area,
          perimetroM: t.perimetro,
          distanciaM: 10,
          luzVA: null,
          tomadas: null,
        },
      ],
    }));
  }

  function addCarga(tipo: string) {
    const p = presetCarga(tipo);
    const amb = projeto.ambientes.find((a) => a.tipo === p.ambiente);
    setProjeto((pr) => ({
      ...pr,
      cargas: [
        ...pr.cargas,
        {
          id: novoId("t"),
          nome: p.nome,
          tipo,
          potenciaW: p.potenciaW,
          fatorPotencia: p.fatorPotencia,
          tensaoV: p.tensaoV === 127 ? Number(pr.obra.tensoes.split("/")[0]) : p.tensaoV,
          trifasico: false,
          quantidade: 1,
          ambienteId: amb?.id ?? null,
        },
      ],
    }));
  }

  const resultado = useMemo(() => {
    if (projeto.ambientes.length === 0 && projeto.cargas.length === 0) return null;
    const r = gerarQuadro(projeto);
    return { ...r, analise: analisarQuadro(r.dados) };
  }, [projeto]);

  function concluir() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarProjetoObra(quadroId, nome || "Projeto da obra", clienteId, projeto);
      if (!r.ok) return setErro(r.erro);
      try {
        localStorage.removeItem(RASCUNHO);
      } catch {}
      router.push(`/quadros/${r.id}`);
    });
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Etapas */}
      <ol className="no-print grid grid-cols-4 gap-1.5">
        {ETAPAS.map((e, i) => (
          <li key={e}>
            <button
              onClick={() => setEtapa(i)}
              className={`w-full rounded-xl px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                i === etapa ? "bg-accent text-accent-fg" : i < etapa ? "bg-accent-soft" : "bg-surface-2 text-muted"
              }`}
            >
              {i + 1}. {e}
            </button>
          </li>
        ))}
      </ol>
      {carregouRascunho && (
        <p className="rounded-xl bg-info-soft px-3 py-2 text-sm text-info">
          Rascunho recuperado deste aparelho.{" "}
          <button
            className="underline"
            onClick={() => {
              setProjeto(projetoVazio());
              setNome("");
              setCarregouRascunho(false);
            }}
          >
            Começar do zero
          </button>
        </p>
      )}

      {etapa === 0 && (
        <>
          <DescreverComIA
            iaLigada={iaLigada}
            aoPreencher={(o) => {
              setProjeto((p) => mesclarExtraida(p, o));
              setEtapa(1);
            }}
          />
          <section className="card grid gap-4 p-4 md:grid-cols-2">
            <Campo rotulo="Nome do projeto/quadro">
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: QDC Casa da Maria" className="input" />
            </Campo>
            <Campo rotulo="Cliente (opcional)">
              <select value={clienteId ?? ""} onChange={(e) => setClienteId(Number(e.target.value) || null)} className="input">
                <option value="">— sem cliente —</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Tipo de imóvel">
              <select value={projeto.obra.tipoImovel} onChange={(e) => setObra({ tipoImovel: e.target.value as Obra["tipoImovel"] })} className="input">
                <option value="casa">Casa térrea</option>
                <option value="sobrado">Sobrado</option>
                <option value="apartamento">Apartamento</option>
                <option value="comercio">Comércio / escritório</option>
                <option value="outro">Outro</option>
              </select>
            </Campo>
            <Campo rotulo="Concessionária" dica={concessionaria(projeto.obra.concessionaria).norma}>
              <select
                value={projeto.obra.concessionaria}
                onChange={(e) => {
                  const c = concessionaria(e.target.value);
                  setObra({ concessionaria: c.id, tensoes: c.tensoes.includes(projeto.obra.tensoes) ? projeto.obra.tensoes : c.tensoes[0] });
                }}
                className="input"
              >
                {CONCESSIONARIAS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                    {c.regiao ? ` — ${c.regiao}` : ""}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo
              rotulo="Tensão da rede"
              dica={concessionaria(projeto.obra.concessionaria).tensaoConferir ? "Tensão usual da região — conferir com a concessionária" : undefined}
            >
              <div className="grid grid-cols-2 gap-2">
                {(["127/220", "220/380"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setObra({ tensoes: t })}
                    className={`btn ${projeto.obra.tensoes === t ? "btn-primary" : "btn-secondary"}`}
                  >
                    {t} V
                  </button>
                ))}
              </div>
            </Campo>
            <Campo rotulo="Esquema de aterramento" dica="TN-C-S é o usual com padrão da concessionária">
              <select value={projeto.obra.esquema} onChange={(e) => setObra({ esquema: e.target.value as Obra["esquema"] })} className="input">
                <option value="TN-C-S">TN-C-S (neutro aterrado no padrão)</option>
                <option value="TN-S">TN-S</option>
                <option value="TT">TT (eletrodo próprio)</option>
              </select>
            </Campo>
            <Campo rotulo="Padrão de entrada existente">
              <select
                value={projeto.obra.fornecimentoExistente}
                onChange={(e) => setObra({ fornecimentoExistente: e.target.value as Obra["fornecimentoExistente"] })}
                className="input"
              >
                <option value="desconhecido">Não sei / obra nova</option>
                <option value="monofasico">Monofásico</option>
                <option value="bifasico">Bifásico</option>
                <option value="trifasico">Trifásico</option>
              </select>
            </Campo>
            <Campo rotulo="Disjuntor do padrão existente (A)" dica="Opcional">
              <input
                inputMode="numeric"
                value={projeto.obra.disjuntorExistenteA ?? ""}
                onChange={(e) => setObra({ disjuntorExistenteA: e.target.value ? num(e.target.value) : null })}
                className="input"
              />
            </Campo>
            <Campo rotulo="Método de instalação dos cabos">
              <select value={projeto.obra.metodo} onChange={(e) => setObra({ metodo: e.target.value as Obra["metodo"] })} className="input">
                {METODOS.map((m) => (
                  <option key={m} value={m}>
                    {DESCRICAO_METODO[m]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Circuitos por eletroduto (típico)" dica="Afeta a capacidade dos cabos (Tabela 42)">
              <input
                type="number"
                min={1}
                value={projeto.obra.agrupamento}
                onChange={(e) => setObra({ agrupamento: Math.max(1, Math.round(num(e.target.value))) })}
                className="input"
              />
            </Campo>
            <label className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm">
              <input type="checkbox" checked={projeto.obra.drEmTodos} onChange={(e) => setObra({ drEmTodos: e.target.checked })} className="size-5 accent-[var(--accent)]" />
              Proteger todos os circuitos com DR (recomendado). Desmarcado: só os obrigatórios.
            </label>
            <label className="flex items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm">
              <input type="checkbox" checked={projeto.obra.entradaAerea} onChange={(e) => setObra({ entradaAerea: e.target.checked })} className="size-5 accent-[var(--accent)]" />
              Entrada de energia aérea (DPS exigido)
            </label>
            <Campo rotulo="Observações da obra" className="md:col-span-2">
              <textarea value={projeto.obra.observacoes} onChange={(e) => setObra({ observacoes: e.target.value })} rows={2} className="input" />
            </Campo>
          </section>
        </>
      )}

      {etapa === 1 && (
        <section className="space-y-3">
          <div className="card p-3">
            <p className="label mb-2">Adicionar ambiente</p>
            <div className="flex flex-wrap gap-1.5">
              {AMBIENTES_RAPIDOS.map((t) => (
                <button key={t.tipo} onClick={() => addAmbiente(t)} className="badge bg-surface-2 py-1.5 hover:bg-accent-soft">
                  <Plus className="mr-1 size-3" /> {t.nome}
                </button>
              ))}
            </div>
          </div>
          {preverAmbientes(projeto.ambientes).map((pv) => {
            const a = pv.ambiente;
            return (
              <div key={a.id} className="card space-y-3 p-3">
                <div className="flex items-center gap-2">
                  <input value={a.nome} onChange={(e) => setAmb(a.id, { nome: e.target.value })} className="input flex-1 font-semibold" />
                  <button
                    onClick={() =>
                      setProjeto((p) => ({
                        ...p,
                        ambientes: p.ambientes.filter((x) => x.id !== a.id),
                        cargas: p.cargas.map((c) => (c.ambienteId === a.id ? { ...c, ambienteId: null } : c)),
                      }))
                    }
                    className="btn btn-ghost p-2 text-muted hover:text-danger"
                    aria-label="Remover ambiente"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Campo rotulo="Tipo">
                    <select value={a.tipo} onChange={(e) => setAmb(a.id, { tipo: e.target.value as TipoAmbiente, tomadas: null })} className="input">
                      {Object.entries(TIPOS_AMBIENTE).map(([k, t]) => (
                        <option key={k} value={k}>
                          {t.nome}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo rotulo="Área (m²)">
                    <input inputMode="decimal" defaultValue={a.areaM2 || ""} onChange={(e) => setAmb(a.id, { areaM2: num(e.target.value) })} className="input" />
                  </Campo>
                  <Campo rotulo="Perímetro (m)" dica={a.perimetroM ? undefined : `≈ ${perimetroEfetivo(a)} m`}>
                    <input inputMode="decimal" defaultValue={a.perimetroM || ""} onChange={(e) => setAmb(a.id, { perimetroM: num(e.target.value) })} className="input" />
                  </Campo>
                  <Campo rotulo="Até o quadro (m)">
                    <input inputMode="decimal" defaultValue={a.distanciaM} onChange={(e) => setAmb(a.id, { distanciaM: num(e.target.value) })} className="input" />
                  </Campo>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-3 text-sm">
                  <div>
                    <p className="text-xs text-muted">Iluminação (mín. {pv.luzMinimaVA} VA)</p>
                    <input
                      inputMode="numeric"
                      value={a.luzVA ?? ""}
                      placeholder={String(pv.luzMinimaVA)}
                      onChange={(e) => setAmb(a.id, { luzVA: e.target.value ? num(e.target.value) : null })}
                      className="input mt-1 px-2.5 py-1.5"
                    />
                    {a.luzVA !== null && a.luzVA < pv.luzMinimaVA && <p className="mt-1 text-xs text-danger">Abaixo do mínimo da NBR 5410 9.5.2.1.</p>}
                  </div>
                  <div>
                    <p className="text-xs text-muted">Tomadas (mín. {pv.tomadasMinimas})</p>
                    <input
                      inputMode="numeric"
                      value={a.tomadas ?? ""}
                      placeholder={String(pv.tomadasMinimas)}
                      onChange={(e) => setAmb(a.id, { tomadas: e.target.value ? Math.round(num(e.target.value)) : null })}
                      className="input mt-1 px-2.5 py-1.5"
                    />
                    {a.tomadas !== null && a.tomadas < pv.tomadasMinimas && <p className="mt-1 text-xs text-danger">Abaixo do mínimo da NBR 5410 9.5.2.2.</p>}
                  </div>
                  <p className="col-span-2 text-xs text-muted">
                    Previsto: {pv.luzVA} VA de iluminação · {pv.tomadas} tomada(s) = {pv.tomadasVA} VA ({pv.vaPorTomada.join(" + ") || "—"})
                  </p>
                </div>
              </div>
            );
          })}
          {projeto.ambientes.length === 0 && <p className="card p-6 text-center text-sm text-muted">Adicione os cômodos da obra acima.</p>}
          <p className="text-xs text-muted">
            Mínimos da NBR 5410 9.5.2: iluminação 100 VA até 6 m² + 60 VA a cada 4 m² inteiros; tomadas por perímetro (3,5 m em
            cozinhas/áreas de serviço, 5 m nos demais); 600 VA nas primeiras tomadas de banheiros, cozinhas e áreas de serviço.
          </p>
        </section>
      )}

      {etapa === 2 && (
        <section className="space-y-3">
          <div className="card p-3">
            <p className="label mb-2">Adicionar equipamento (TUE)</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS_CARGA.map((p) => (
                <button key={p.id} onClick={() => addCarga(p.id)} className="badge bg-surface-2 py-1.5 hover:bg-accent-soft">
                  <Plus className="mr-1 size-3" /> {p.nome}
                </button>
              ))}
            </div>
          </div>
          {projeto.cargas.map((c) => {
            const preset = presetCarga(c.tipo);
            return (
              <div key={c.id} className="card space-y-3 p-3">
                <div className="flex items-center gap-2">
                  <input value={c.nome} onChange={(e) => setCarga(c.id, { nome: e.target.value })} className="input flex-1 font-semibold" />
                  <button
                    onClick={() => setProjeto((p) => ({ ...p, cargas: p.cargas.filter((x) => x.id !== c.id) }))}
                    className="btn btn-ghost p-2 text-muted hover:text-danger"
                    aria-label="Remover carga"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {c.tipo === "ar" ? (
                    <Campo rotulo="Capacidade">
                      <select
                        value={Object.entries(AR_POR_BTU).find(([, w]) => w === c.potenciaW)?.[0] ?? ""}
                        onChange={(e) => {
                          const btu = Number(e.target.value);
                          if (btu) setCarga(c.id, { potenciaW: AR_POR_BTU[btu], nome: `Ar-condicionado ${btu.toLocaleString("pt-BR")} BTU` });
                        }}
                        className="input"
                      >
                        <option value="">Outra</option>
                        {Object.keys(AR_POR_BTU).map((b) => (
                          <option key={b} value={b}>
                            {Number(b).toLocaleString("pt-BR")} BTU
                          </option>
                        ))}
                      </select>
                    </Campo>
                  ) : null}
                  <Campo rotulo="Potência (W)">
                    <input inputMode="numeric" value={c.potenciaW || ""} onChange={(e) => setCarga(c.id, { potenciaW: num(e.target.value) })} className="input" />
                  </Campo>
                  <Campo rotulo="Tensão">
                    <select value={c.tensaoV} onChange={(e) => setCarga(c.id, { tensaoV: Number(e.target.value) })} className="input">
                      {[127, 220, 380].map((v) => (
                        <option key={v} value={v}>
                          {v} V
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo rotulo="Quantidade">
                    <input type="number" min={1} value={c.quantidade} onChange={(e) => setCarga(c.id, { quantidade: Math.max(1, Math.round(num(e.target.value))) })} className="input" />
                  </Campo>
                  <Campo rotulo="Ambiente">
                    <select value={c.ambienteId ?? ""} onChange={(e) => setCarga(c.id, { ambienteId: e.target.value || null })} className="input">
                      <option value="">—</option>
                      {projeto.ambientes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                  </Campo>
                </div>
                {c.tensaoV === 380 && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={c.trifasico} onChange={(e) => setCarga(c.id, { trifasico: e.target.checked })} /> Equipamento trifásico
                  </label>
                )}
                {preset.nota && <p className="text-xs text-warn">{preset.nota}</p>}
              </div>
            );
          })}
          {projeto.cargas.length === 0 && <p className="card p-6 text-center text-sm text-muted">Chuveiros, ar-condicionado, forno… adicione acima.</p>}
          <p className="text-xs text-muted">Potências típicas de referência — confira sempre a placa do aparelho.</p>
        </section>
      )}

      {etapa === 3 && (
        <section className="space-y-4">
          {!resultado ? (
            <p className="card p-6 text-center text-sm text-muted">Informe ao menos um ambiente ou uma carga.</p>
          ) : (
            <>
              <div className="card p-4">
                <h3 className="mb-3 font-semibold">Demanda e categoria</h3>
                <BlocoDemanda dados={resultado.dados} demanda={resultado.demanda} />
              </div>
              <div className="card overflow-hidden">
                <h3 className="p-4 pb-2 font-semibold">
                  Quadro gerado — {resultado.dados.modelo.fileiras * resultado.dados.modelo.modulosPorFileira} módulos, {resultado.dados.circuitos.length} circuitos
                </h3>
                <div className="overflow-x-auto bg-surface-2 p-4">
                  <div className="mx-auto w-max">
                    <QuadroVisual dados={resultado.dados} escala={0.7} />
                  </div>
                </div>
              </div>
              <div className="card p-4">
                <h3 className="mb-2 font-semibold">Circuitos</h3>
                <ul className="divide-y divide-border text-sm">
                  {resultado.analise.circuitos.map((r, i) => (
                    <li key={r.circuito.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0">
                        <b>{i + 1}.</b> {r.circuito.nome}
                        <span className="block text-xs text-muted">
                          {r.circuito.potenciaW} W · {r.tensaoV} V · {r.fases.join("+")}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-xs">
                        {r.dim.secao?.toLocaleString("pt-BR")} mm² · {r.pecaDisjuntor?.rotulo}
                        {r.circuito.drId ? " · DR" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-4">
                <h3 className="mb-2 font-semibold">Verificação NBR 5410</h3>
                <ListaAlertas
                  alertas={[
                    ...resultado.alertas,
                    ...resultado.analise.alertas,
                    ...resultado.analise.circuitos.flatMap((r) => r.alertas.map((x) => ({ ...x, mensagem: `${r.circuito.nome}: ${x.mensagem}` }))),
                  ].filter((x) => x.nivel !== "info")}
                  vazio="Projeto sem pendências no verificador automático."
                />
              </div>
            </>
          )}
        </section>
      )}

      {erro && <p className="text-sm text-danger">{erro}</p>}

      <div className="no-print fixed inset-x-0 bottom-[calc(4.4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-64">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <button onClick={() => setEtapa((e) => Math.max(0, e - 1))} disabled={etapa === 0} className="btn btn-secondary">
            <ArrowLeft className="size-4" /> Voltar
          </button>
          <span className="flex-1 text-center text-xs text-muted">
            {projeto.ambientes.length} ambiente(s) · {projeto.cargas.reduce((s, c) => s + c.quantidade, 0)} carga(s)
          </span>
          {etapa < 3 ? (
            <button onClick={() => setEtapa((e) => e + 1)} className="btn btn-primary">
              Avançar <ArrowRight className="size-4" />
            </button>
          ) : (
            <button onClick={concluir} disabled={salvando || !resultado} className="btn btn-primary">
              {salvando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {quadroId ? "Atualizar quadro" : "Criar quadro"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Mescla o que a IA extraiu no projeto atual. */
function mesclarExtraida(p: ProjetoObra, o: ObraExtraidaT): ProjetoObra {
  const ambientes: Ambiente[] = o.ambientes.map((a) => ({
    id: novoId("a"),
    nome: a.nome,
    tipo: a.tipo as TipoAmbiente,
    areaM2: Math.max(0, a.areaM2),
    perimetroM: Math.max(0, a.perimetroM),
    distanciaM: Math.max(1, a.distanciaM || 10),
    luzVA: null,
    tomadas: null,
  }));
  const conc = concessionaria(o.concessionaria);
  const tensoes = o.tensoes === "desconhecida" ? (conc.tensoes[0] ?? p.obra.tensoes) : o.tensoes;
  const cargas: Carga[] = o.cargas.map((c) => {
    const preset = presetCarga(c.tipo);
    const amb = ambientes.find((a) => a.nome.toLowerCase() === c.ambiente.toLowerCase());
    return {
      id: novoId("t"),
      nome: c.nome,
      tipo: c.tipo,
      potenciaW: Math.max(0, c.potenciaW),
      fatorPotencia: preset.fatorPotencia,
      tensaoV: [127, 220, 380].includes(c.tensaoV) ? c.tensaoV : preset.tensaoV,
      trifasico: c.trifasico,
      quantidade: Math.max(1, Math.round(c.quantidade)),
      ambienteId: amb?.id ?? null,
    };
  });
  return {
    obra: {
      ...p.obra,
      tipoImovel: o.tipoImovel,
      concessionaria: conc.id,
      tensoes,
      fornecimentoExistente: o.fornecimentoExistente,
      observacoes: [p.obra.observacoes, ...o.premissas.map((x) => `Premissa: ${x}`)].filter(Boolean).join("\n"),
    },
    ambientes: ambientes.length ? ambientes : p.ambientes,
    cargas: cargas.length ? cargas : p.cargas,
  };
}

function DescreverComIA({ iaLigada, aoPreencher }: { iaLigada: boolean; aoPreencher: (o: ObraExtraidaT) => void }) {
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function extrair() {
    setCarregando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/ia/extrair-obra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao: texto }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.obra) setMsg(j.erro ?? "Não foi possível interpretar a descrição.");
      else aoPreencher(j.obra);
    } catch {
      setMsg("Sem conexão. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section className="card space-y-3 border-accent/40 p-4">
      <div className="flex items-center gap-2">
        <Wand2 className="size-5 text-accent" />
        <h3 className="font-semibold">Atalho: descreva a obra e a IA preenche</h3>
      </div>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="Ex.: casa térrea, 2 quartos, 1 suíte, cozinha americana, chuveiro 7500 W nos dois banheiros, 2 ar 12000 BTU, Enel SP bifásico"
        className="input"
      />
      {!iaLigada && (
        <p className="text-xs text-warn">A IA está desligada (falta a chave ANTHROPIC_API_KEY). Preencha as etapas manualmente — o resto funciona.</p>
      )}
      {msg && <p className="text-sm text-danger">{msg}</p>}
      <button onClick={extrair} disabled={carregando || texto.trim().length < 10} className="btn btn-primary">
        {carregando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Preencher com IA
      </button>
      <p className="text-xs text-muted">Você revisa tudo nas próximas etapas antes de gerar o quadro.</p>
    </section>
  );
}
