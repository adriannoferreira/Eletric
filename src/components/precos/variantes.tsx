"use client";

import { AlertTriangle, Layers, Loader2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { criarVariantesAcao, salvarAtributos } from "@/app/(app)/catalogo/actions";
import { Campo } from "@/components/ui";
import {
  type Atributos,
  combinar,
  type Especificacao,
  especificacaoCompleta,
  faltando,
  FAMILIAS,
  type Familia,
  GRADES,
  nomeVariante,
  PRESETS,
} from "@/lib/precos/variantes";

const ROTULOS: Record<string, string> = {
  polos: "Polos",
  curva: "Curva",
  corrente: "Corrente (A)",
  icnKa: "Icn (kA)",
  idnMa: "IΔn (mA)",
  tipoDr: "Tipo do DR",
  classe: "Classe",
  ucV: "Uc (V)",
  imaxKa: "Imax (kA)",
  inKa: "In (kA)",
  secao: "Seção (mm²)",
  cor: "Cor",
  tensaoV: "Isolação (V)",
  diametro: "Diâmetro",
  padrao: "Padrão",
  modelo: "Tipo",
  teclas: "Teclas",
  comprimentoM: "Comprimento (m)",
  modulos: "Módulos",
  instalacao: "Instalação",
  marca: "Marca",
  linha: "Linha",
};

export const rotuloAtributo = (k: string) => ROTULOS[k] ?? k;

const fmt = (v: string | number) => String(v).replace(".", ",");

/** Aviso exibido em materiais cuja família é conhecida, mas faltam atributos para cotar. */
export function AvisoVariante({ e }: { e: Especificacao }) {
  if (especificacaoCompleta(e)) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn">
      <AlertTriangle className="size-3" /> Defina as variantes ({faltando(e).map(rotuloAtributo).join(", ").toLowerCase()})
    </span>
  );
}

/** Diálogo para criar variantes de uma família escolhendo combinações numa grade ou num preset. */
export function CriarVariantes({ familiaInicial, aoFechar }: { familiaInicial?: Familia; aoFechar: () => void }) {
  const [familia, setFamilia] = useState<Familia>(familiaInicial ?? "disjuntor_din");
  const grade = useMemo(() => GRADES[familia] ?? {}, [familia]);
  const [escolhas, setEscolhas] = useState<Record<string, (string | number)[]>>({});
  const [preco, setPreco] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  const combinacoes = useMemo(() => {
    const todas = Object.keys(grade).every((k) => (escolhas[k] ?? []).length > 0) ? combinar(escolhas) : [];
    return todas.filter((a) => especificacaoCompleta({ familia, atributos: a }));
  }, [escolhas, familia, grade]);

  function alternar(k: string, v: string | number) {
    setEscolhas((e) => {
      const atual = e[k] ?? [];
      return { ...e, [k]: atual.includes(v) ? atual.filter((x) => x !== v) : [...atual, v] };
    });
  }

  function criar(lista: Atributos[]) {
    setMsg(null);
    iniciar(async () => {
      const r = await criarVariantesAcao(familia, lista, Number(preco.replace(",", ".")) || undefined);
      setMsg(r.erro ? { ok: false, texto: r.erro } : { ok: true, texto: `${r.criadas} variante(s) criada(s). As que já existiam foram mantidas.` });
    });
  }

  const presets = PRESETS.filter((p) => p.familia === familia);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" onClick={aoFechar}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Layers className="size-5 text-accent" /> Criar variantes
          </h2>
          <button type="button" onClick={aoFechar} className="btn btn-ghost p-2" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <p className="text-sm text-muted">Cada corrente/seção tem preço próprio. Crie só as que você usa.</p>
        <Campo rotulo="Família">
          <select
            value={familia}
            onChange={(e) => {
              setFamilia(e.target.value as Familia);
              setEscolhas({});
              setMsg(null);
            }}
            className="input"
          >
            {(Object.keys(FAMILIAS) as Familia[])
              .filter((f) => GRADES[f])
              .map((f) => (
                <option key={f} value={f}>
                  {FAMILIAS[f].nome}
                </option>
              ))}
          </select>
        </Campo>

        {presets.length > 0 && (
          <div className="space-y-2">
            <p className="label">Atalhos</p>
            {presets.map((p) => (
              <button
                key={p.nome}
                type="button"
                disabled={pendente}
                onClick={() => criar(p.combinacoes)}
                className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2.5 text-left text-sm hover:border-accent"
              >
                <span className="font-medium">{p.nome}</span>
                <span className="text-xs text-muted">{p.combinacoes.length} variantes</span>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <p className="label">Ou escolha as combinações</p>
          {Object.entries(grade).map(([k, valores]) => (
            <div key={k}>
              <p className="mb-1.5 text-xs font-semibold text-muted">{rotuloAtributo(k)}</p>
              <div className="flex flex-wrap gap-1.5">
                {valores.map((v) => {
                  const on = (escolhas[k] ?? []).includes(v);
                  return (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => alternar(k, v)}
                      className={`min-w-11 rounded-full border px-3 py-1.5 text-sm font-medium ${on ? "border-accent bg-accent-soft" : "border-border text-muted"}`}
                    >
                      {fmt(v)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {combinacoes.length > 0 && (
          <div className="rounded-xl bg-surface-2 p-3 text-sm">
            <p className="font-medium">{combinacoes.length} variante(s):</p>
            <p className="mt-1 text-xs text-muted">
              {combinacoes
                .slice(0, 6)
                .map((a) => nomeVariante({ familia, atributos: a }))
                .join(" · ")}
              {combinacoes.length > 6 ? ` · … +${combinacoes.length - 6}` : ""}
            </p>
          </div>
        )}
        <Campo rotulo="Preço inicial (opcional)" dica="Deixe vazio para cotar depois (cotação, IA ou SINAPI)">
          <input value={preco} onChange={(e) => setPreco(e.target.value)} inputMode="decimal" placeholder="0,00" className="input" />
        </Campo>
        {msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.texto}</p>}
        <button type="button" disabled={pendente || combinacoes.length === 0} onClick={() => criar(combinacoes)} className="btn btn-primary w-full">
          {pendente ? <Loader2 className="size-4 animate-spin" /> : null}
          Criar {combinacoes.length || ""} variante(s)
        </button>
      </div>
    </div>
  );
}

/** Edição da família e dos atributos técnicos de um material do catálogo. */
export function EditorAtributos({
  id,
  inicial,
  aoSalvar,
}: {
  id: number;
  inicial: Especificacao | null;
  aoSalvar?: () => void;
}) {
  const [familia, setFamilia] = useState<Familia | "">(inicial?.familia ?? "");
  const [attrs, setAttrs] = useState<Atributos>(inicial?.atributos ?? {});
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const chaves = familia ? [...FAMILIAS[familia].criticos, ...FAMILIAS[familia].opcionais] : [];
  const e = familia ? { familia, atributos: attrs } : null;

  return (
    <section className="space-y-3 rounded-2xl bg-surface-2 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Layers className="size-4 text-accent" /> Especificação técnica (variante)
      </p>
      <select
        value={familia}
        onChange={(ev) => {
          setFamilia(ev.target.value as Familia | "");
          setAttrs({});
        }}
        className="input"
      >
        <option value="">— sem família (item simples) —</option>
        {(Object.keys(FAMILIAS) as Familia[]).map((f) => (
          <option key={f} value={f}>
            {FAMILIAS[f].nome}
          </option>
        ))}
      </select>
      {familia && (
        <div className="grid grid-cols-2 gap-2">
          {chaves.map((k) => {
            const opcoes = GRADES[familia]?.[k];
            const critico = (FAMILIAS[familia].criticos as readonly string[]).includes(k);
            const valor = attrs[k];
            return (
              <label key={k} className="text-xs text-muted">
                {rotuloAtributo(k)}
                {critico && <span className="text-danger"> *</span>}
                {opcoes ? (
                  <select
                    value={valor === undefined ? "" : String(valor)}
                    onChange={(ev) => {
                      const raw = ev.target.value;
                      const v = opcoes.find((o) => String(o) === raw);
                      setAttrs((a) => {
                        const n = { ...a };
                        if (v === undefined) delete n[k];
                        else n[k] = v;
                        return n;
                      });
                    }}
                    className="input mt-1 px-2.5 py-1.5"
                  >
                    <option value="">—</option>
                    {opcoes.map((o) => (
                      <option key={String(o)} value={String(o)}>
                        {fmt(o)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={valor === undefined ? "" : fmt(valor)}
                    onChange={(ev) => {
                      const raw = ev.target.value.trim();
                      setAttrs((a) => {
                        const n = { ...a };
                        if (!raw) delete n[k];
                        else n[k] = /^\d+([.,]\d+)?$/.test(raw) ? Number(raw.replace(",", ".")) : raw;
                        return n;
                      });
                    }}
                    className="input mt-1 px-2.5 py-1.5"
                  />
                )}
              </label>
            );
          })}
        </div>
      )}
      {e && (
        <p className="text-xs text-muted">
          Nome: <strong className="text-fg">{nomeVariante(e)}</strong>
          {!especificacaoCompleta(e) && <span className="block text-warn">Preencha os campos com * para poder cotar.</span>}
        </p>
      )}
      {msg && <p className="text-xs text-ok">{msg}</p>}
      <button
        type="button"
        disabled={pendente || !familia}
        onClick={() =>
          iniciar(async () => {
            const erro = familia ? await salvarAtributos(id, familia, attrs) : "Escolha a família";
            setMsg(erro ?? "Especificação salva.");
            if (!erro) aoSalvar?.();
          })
        }
        className="btn btn-secondary w-full"
      >
        {pendente ? "Salvando…" : "Salvar especificação"}
      </button>
    </section>
  );
}
