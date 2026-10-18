"use client";

import { Camera, Check, Clock, Images, Loader2, Pause, Play, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  adicionarFoto,
  atualizarLegenda,
  adicionarMaterial,
  agendarVisita,
  alternarCronometro,
  excluirFoto,
  legendarFotosComIA,
  excluirHora,
  lancarHoras,
  mudarVisita,
  removerMaterial,
  salvarChecklist,
} from "@/app/(app)/os/actions";
import { Badge } from "@/components/ui";
import type { ItemChecklist, OsHora, OsMaterial, Visita } from "@/db/schema-servicos";
import { reais } from "@/lib/formato";
import { reduzirImagem } from "@/lib/servicos/imagem";
import { dataHora, formatarDuracao, idsEmConflito, paraDataHoraLocal, totalMinutos } from "@/lib/servicos/os";

export function Secao({
  titulo,
  icone: Icone,
  extra,
  children,
}: {
  titulo: string;
  icone: React.ComponentType<{ className?: string }>;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icone className="size-4 text-accent" /> {titulo}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

/* ---------------- Visitas ---------------- */

export function Visitas({ osId, visitas, outras }: { osId: number; visitas: Visita[]; outras: { id: number; inicio: Date; duracaoMin: number }[] }) {
  const [pendente, iniciar] = useTransition();
  const [novo, setNovo] = useState(false);
  const [inicio, setInicio] = useState(() => paraDataHoraLocal(new Date(Date.now() + 86_400_000)).slice(0, 11) + "08:00");
  const [duracao, setDuracao] = useState("120");
  const [erro, setErro] = useState<string | null>(null);
  const conflito = idsEmConflito([
    ...visitas.filter((v) => v.status === "agendada").map((v) => ({ id: `v${v.id}`, inicio: v.inicio, duracaoMin: v.duracaoMin })),
    ...outras.map((v) => ({ id: `o${v.id}`, inicio: v.inicio, duracaoMin: v.duracaoMin })),
  ]);
  const ordenadas = [...visitas].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  return (
    <div className="space-y-2">
      {ordenadas.length === 0 && <p className="text-sm text-muted">Nenhuma visita agendada.</p>}
      {ordenadas.map((v) => (
        <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 p-3">
          <div className="min-w-0 flex-1">
            <p className={`font-medium ${v.status === "cancelada" ? "line-through text-muted" : ""}`}>{dataHora(v.inicio)}</p>
            <p className="text-xs text-muted">{formatarDuracao(v.duracaoMin)}</p>
          </div>
          {conflito.has(`v${v.id}`) && <Badge tom="perigo">Conflito de horário</Badge>}
          <Badge tom={v.status === "realizada" ? "ok" : v.status === "cancelada" ? "neutro" : "info"}>
            {v.status === "realizada" ? "Realizada" : v.status === "cancelada" ? "Cancelada" : "Agendada"}
          </Badge>
          {v.status === "agendada" && (
            <>
              <button disabled={pendente} onClick={() => iniciar(() => mudarVisita(osId, v.id, "realizada"))} className="btn btn-ghost p-2" aria-label="Marcar como realizada">
                <Check className="size-4" />
              </button>
              <button disabled={pendente} onClick={() => iniciar(() => mudarVisita(osId, v.id, "cancelada"))} className="btn btn-ghost p-2" aria-label="Cancelar visita">
                <X className="size-4" />
              </button>
            </>
          )}
          {v.status !== "agendada" && (
            <button disabled={pendente} onClick={() => confirm("Excluir esta visita?") && iniciar(() => mudarVisita(osId, v.id, "excluir"))} className="btn btn-ghost p-2 text-muted" aria-label="Excluir visita">
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      ))}
      {novo ? (
        <div className="grid grid-cols-[1fr_6rem] gap-2 rounded-xl border border-border p-3">
          <input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} className="input" />
          <input type="number" min={15} step={15} value={duracao} onChange={(e) => setDuracao(e.target.value)} className="input" aria-label="Duração em minutos" />
          <p className="col-span-2 text-xs text-muted">Duração em minutos</p>
          {erro && <p className="col-span-2 text-sm text-danger">{erro}</p>}
          <button className="btn btn-secondary" onClick={() => setNovo(false)}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                const e = await agendarVisita(osId, inicio, Number(duracao));
                setErro(e);
                if (!e) setNovo(false);
              })
            }
          >
            Agendar
          </button>
        </div>
      ) : (
        <button onClick={() => setNovo(true)} className="btn btn-secondary w-full">
          <Plus className="size-4" /> Agendar visita
        </button>
      )}
    </div>
  );
}

/* ---------------- Checklist ---------------- */

export function Checklist({ osId, inicial }: { osId: number; inicial: ItemChecklist[] }) {
  const [itens, setItens] = useState(inicial);
  const [novo, setNovo] = useState("");
  const [, iniciar] = useTransition();
  const feitos = itens.filter((i) => i.feito).length;

  function salvar(lista: ItemChecklist[]) {
    setItens(lista);
    iniciar(async () => void (await salvarChecklist(osId, lista)));
  }

  return (
    <div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-ok transition-all" style={{ width: `${itens.length ? (feitos / itens.length) * 100 : 0}%` }} />
      </div>
      <ul className="space-y-1">
        {itens.map((i) => (
          <li key={i.id} className="group flex items-start gap-3 rounded-xl px-1 py-1.5">
            <button
              onClick={() => salvar(itens.map((x) => (x.id === i.id ? { ...x, feito: !x.feito } : x)))}
              className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 ${i.feito ? "border-ok bg-ok text-white" : "border-border"}`}
              aria-label={i.feito ? "Desmarcar" : "Marcar"}
            >
              {i.feito && <Check className="size-4" />}
            </button>
            <span className={`flex-1 text-[15px] ${i.feito ? "text-muted line-through" : ""}`}>{i.texto}</span>
            <button onClick={() => salvar(itens.filter((x) => x.id !== i.id))} className="p-1 text-muted opacity-50 hover:text-danger group-hover:opacity-100" aria-label="Remover item">
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!novo.trim()) return;
          salvar([...itens, { id: `c${Date.now()}`, texto: novo.trim(), feito: false }]);
          setNovo("");
        }}
      >
        <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Adicionar item" className="input" />
        <button className="btn btn-secondary shrink-0" aria-label="Adicionar"><Plus className="size-4" /></button>
      </form>
    </div>
  );
}

/* ---------------- Horas ---------------- */

export function Horas({ osId, horas }: { osId: number; horas: OsHora[] }) {
  const [agora, setAgora] = useState(() => new Date());
  const [pendente, iniciar] = useTransition();
  const aberto = horas.find((h) => !h.fim);
  const [manual, setManual] = useState(false);
  const [mInicio, setMInicio] = useState(() => paraDataHoraLocal(new Date()));
  const [mMin, setMMin] = useState("60");
  const [mDesc, setMDesc] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, [aberto]);

  const total = totalMinutos(horas, agora);
  const segAberto = aberto ? Math.floor((agora.getTime() - aberto.inicio.getTime()) / 1000) : 0;
  const relogio = `${String(Math.floor(segAberto / 3600)).padStart(2, "0")}:${String(Math.floor((segAberto % 3600) / 60)).padStart(2, "0")}:${String(segAberto % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
        <div className="flex-1">
          <p className="text-xs text-muted">Total trabalhado</p>
          <p className="text-xl font-bold">{formatarDuracao(total)}</p>
          {aberto && <p className="font-mono text-sm text-accent">● {relogio}</p>}
        </div>
        <button disabled={pendente} onClick={() => iniciar(() => alternarCronometro(osId))} className={`btn ${aberto ? "btn-secondary" : "btn-primary"}`}>
          {pendente ? <Loader2 className="size-4 animate-spin" /> : aberto ? <Pause className="size-4" /> : <Play className="size-4" />}
          {aberto ? "Pausar" : "Iniciar"}
        </button>
      </div>
      {horas.filter((h) => h.fim).length > 0 && (
        <ul className="divide-y divide-border text-sm">
          {horas
            .filter((h) => h.fim)
            .map((h) => (
              <li key={h.id} className="flex items-center gap-2 py-2">
                <span className="flex-1">
                  {dataHora(h.inicio)} {h.descricao && <span className="text-muted">· {h.descricao}</span>}
                </span>
                <span className="font-medium">{formatarDuracao(totalMinutos([h], agora))}</span>
                <button onClick={() => confirm("Excluir este registro?") && iniciar(() => excluirHora(osId, h.id))} className="p-1 text-muted hover:text-danger" aria-label="Excluir registro">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
        </ul>
      )}
      {manual ? (
        <div className="grid grid-cols-[1fr_6rem] gap-2 rounded-xl border border-border p-3">
          <input type="datetime-local" value={mInicio} onChange={(e) => setMInicio(e.target.value)} className="input" />
          <input type="number" min={1} value={mMin} onChange={(e) => setMMin(e.target.value)} className="input" aria-label="Minutos" />
          <input value={mDesc} onChange={(e) => setMDesc(e.target.value)} placeholder="O que foi feito (opcional)" className="input col-span-2" />
          {erro && <p className="col-span-2 text-sm text-danger">{erro}</p>}
          <button className="btn btn-secondary" onClick={() => setManual(false)}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                const e = await lancarHoras(osId, mInicio, Number(mMin), mDesc);
                setErro(e);
                if (!e) setManual(false);
              })
            }
          >
            Lançar
          </button>
        </div>
      ) : (
        <button onClick={() => setManual(true)} className="btn btn-ghost w-full text-sm">
          <Clock className="size-4" /> Lançar horas manualmente
        </button>
      )}
    </div>
  );
}

/* ---------------- Materiais ---------------- */

type ItemCat = { id: number; nome: string; unidade: string; preco: number; tipo: string };

export function Materiais({ osId, materiais, catalogo }: { osId: number; materiais: OsMaterial[]; catalogo: ItemCat[] }) {
  const [pendente, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [desc, setDesc] = useState("");
  const [qtd, setQtd] = useState("1");
  const [un, setUn] = useState("un");
  const [preco, setPreco] = useState("0");
  const [catId, setCatId] = useState<number | null>(null);
  const total = materiais.reduce((s, m) => s + m.quantidade * m.precoUnitario, 0);
  const normal = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const sugestoes = useMemo(
    () => (busca.length < 2 ? [] : catalogo.filter((c) => c.tipo === "material" && normal(c.nome).includes(normal(busca))).slice(0, 6)),
    [busca, catalogo],
  );
  const num = (s: string) => Number(s.replace(",", ".")) || 0;

  return (
    <div className="space-y-2">
      {materiais.length === 0 && <p className="text-sm text-muted">Nenhum material lançado.</p>}
      <ul className="divide-y divide-border text-sm">
        {materiais.map((m) => (
          <li key={m.id} className="flex items-center gap-2 py-2">
            <span className="flex-1">
              <span className="font-medium">{m.quantidade.toLocaleString("pt-BR")} {m.unidade}</span> · {m.descricao}
            </span>
            <span className="shrink-0">{reais(m.quantidade * m.precoUnitario)}</span>
            <button onClick={() => iniciar(() => removerMaterial(osId, m.id))} className="p-1 text-muted hover:text-danger" aria-label="Remover material">
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      {materiais.length > 0 && <p className="text-right text-sm font-semibold">Total: {reais(total)}</p>}
      {aberto ? (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <div className="relative">
            <input
              value={busca || desc}
              onChange={(e) => {
                setBusca(e.target.value);
                setDesc(e.target.value);
                setCatId(null);
              }}
              placeholder="Material (busca no catálogo)"
              className="input"
            />
            {sugestoes.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
                {sugestoes.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDesc(s.nome);
                        setUn(s.unidade);
                        setPreco(String(s.preco));
                        setCatId(s.id);
                        setBusca("");
                      }}
                      className="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
                    >
                      <span>{s.nome}</span>
                      <span className="text-muted">{reais(s.preco)}/{s.unidade}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} className="input" aria-label="Quantidade" />
            <input value={un} onChange={(e) => setUn(e.target.value)} className="input" aria-label="Unidade" />
            <input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} className="input" aria-label="Preço unitário" />
          </div>
          <p className="text-xs text-muted">Quantidade · unidade · preço unitário (R$)</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-secondary" onClick={() => setAberto(false)}>Cancelar</button>
            <button
              className="btn btn-primary"
              disabled={pendente || !desc.trim() || num(qtd) <= 0}
              onClick={() =>
                iniciar(async () => {
                  const e = await adicionarMaterial(osId, {
                    catalogoId: catId,
                    descricao: desc.trim(),
                    unidade: un || "un",
                    quantidade: num(qtd),
                    precoUnitario: num(preco),
                  });
                  if (!e) {
                    setDesc("");
                    setQtd("1");
                    setPreco("0");
                    setCatId(null);
                  }
                })
              }
            >
              Adicionar
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAberto(true)} className="btn btn-secondary w-full">
          <Plus className="size-4" /> Lançar material
        </button>
      )}
    </div>
  );
}

/* ---------------- Fotos ---------------- */

const ETAPAS = [
  { v: "antes", r: "Antes" },
  { v: "durante", r: "Durante" },
  { v: "depois", r: "Depois" },
] as const;

export function Fotos({ osId, fotos }: { osId: number; fotos: { id: number; etapa: string; legenda: string }[] }) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ampliada, setAmpliada] = useState<number | null>(null);
  const [legendando, setLegendando] = useState(false);
  const [, iniciar] = useTransition();
  const fotoAmpliada = fotos.find((f) => f.id === ampliada);
  const semLegenda = fotos.filter((f) => !f.legenda.trim()).length;

  async function enviar(etapa: (typeof ETAPAS)[number]["v"], arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setErro(null);
    setEnviando(etapa);
    try {
      for (const a of Array.from(arquivos)) {
        const dados = await reduzirImagem(a);
        const e = await adicionarFoto(osId, etapa, dados);
        if (e) setErro(e);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao enviar a foto.");
    } finally {
      setEnviando(null);
    }
  }

  async function legendarComIA() {
    setErro(null);
    setAviso(null);
    setLegendando(true);
    try {
      const r = await legendarFotosComIA(osId);
      if (r.erro) setErro(r.erro);
      else setAviso(r.feitas ? `${r.feitas} legenda(s) criada(s). Revise tocando na foto.` : "Todas as fotos já têm legenda.");
    } finally {
      setLegendando(false);
    }
  }

  return (
    <div className="space-y-4">
      {ETAPAS.map((et) => {
        const lista = fotos.filter((f) => f.etapa === et.v);
        return (
          <div key={et.v}>
            <p className="mb-2 text-sm font-medium text-muted">{et.r}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {lista.map((f) => (
                <div key={f.id} className="group relative aspect-square overflow-hidden rounded-xl bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/os/foto/${f.id}`} alt={f.legenda || `Foto ${et.r.toLowerCase()}`} loading="lazy" className="size-full object-cover" onClick={() => setAmpliada(f.id)} />
                  {f.legenda && (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                      {f.legenda}
                    </span>
                  )}
                  <button
                    onClick={() => confirm("Excluir esta foto?") && iniciar(() => excluirFoto(osId, f.id))}
                    className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-white"
                    aria-label="Excluir foto"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border text-muted hover:border-accent">
                {enviando === et.v ? <Loader2 className="size-6 animate-spin" /> : <Camera className="size-6" />}
                <input type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(e) => enviar(et.v, e.target.files)} disabled={!!enviando} />
              </label>
            </div>
          </div>
        );
      })}
      {fotos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={legendarComIA} disabled={legendando || semLegenda === 0} className="btn btn-secondary">
            {legendando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {legendando ? "Legendando…" : `Legendas com IA${semLegenda ? ` (${semLegenda})` : ""}`}
          </button>
          <a href={`/os/${osId}/fotos`} target="_blank" className="btn btn-secondary">
            <Images className="size-4" /> Relatório fotográfico
          </a>
        </div>
      )}
      {aviso && <p className="text-sm text-ok">{aviso}</p>}
      {erro && <p className="text-sm text-danger">{erro}</p>}
      {fotoAmpliada && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4" onClick={() => setAmpliada(null)}>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/os/foto/${fotoAmpliada.id}`} alt={fotoAmpliada.legenda || "Foto ampliada"} className="max-h-full max-w-full rounded-xl" />
          </div>
          <form
            key={fotoAmpliada.id}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const legenda = String(new FormData(e.currentTarget).get("legenda") ?? "");
              iniciar(() => atualizarLegenda(osId, fotoAmpliada.id, legenda));
              setAmpliada(null);
            }}
            className="mx-auto mt-3 flex w-full max-w-lg gap-2 pb-[env(safe-area-inset-bottom)]"
          >
            <input
              name="legenda"
              defaultValue={fotoAmpliada.legenda}
              maxLength={200}
              placeholder="Legenda da foto (aparece no relatório)"
              className="input flex-1"
            />
            <button className="btn btn-primary">Salvar</button>
          </form>
        </div>
      )}
    </div>
  );
}
