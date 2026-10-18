"use client";

import { AlertTriangle, Ban, CheckCircle2, FileText, Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { cargasDoQuadro, dadosCalculadora, gerarOrcamentoPadrao } from "@/app/(app)/normas/actions";
import { Campo } from "@/components/ui";
import {
  AVISO_REVISAO,
  calcularDemandaEquatorial,
  type CargaEquatorial,
  categoriaAtendimento,
  type CategoriaCarga,
  checklistVistoria,
  type Equipamento,
  materiaisPadrao,
  type Montagem,
  potenciaDisponibilizadaKVA,
  ROTULO_LIGACAO,
  ROTULO_MONTAGEM,
  TABELA_3,
  type TipoEquipamento,
  type TipoLigacao,
} from "@/lib/normas/equatorial-pa";

type Ligacao = "FN" | "FF" | "3F";
type Linha = CargaEquatorial & { id: number; ligacao: Ligacao };
type Especial = { id: number; descricao: string; tipo: TipoEquipamento; fases: 1 | 2 | 3; kva: number; cv: number };

const CATEGORIAS: Record<CategoriaCarga, string> = {
  iluminacao_tomadas: "Iluminação/tomadas",
  aparelho: "Aparelho",
  ar_condicionado: "Ar-condicionado",
  motor: "Motor/bomba",
  outro: "Outro",
};
const LIGACOES: Record<Ligacao, string> = { FN: "127 V", FF: "220 V (2 fases)", "3F": "Trifásico" };
const ESPECIAIS: Record<TipoEquipamento, string> = {
  motor: "Motor",
  aparelho: "Aparelho",
  solda_transformador: "Solda a transformador",
  solda_retificadora: "Solda c/ ponte retificadora",
  solda_motor: "Solda a motor",
  raio_x: "Raios-X",
  betoneira: "Betoneira",
};
const CHAVE = "eletric:calc-padrao-equatorial";
let seq = 1;
const novoId = () => seq++;

function carregar() {
  try {
    const s = localStorage.getItem(CHAVE);
    if (s) return JSON.parse(s) as { cargas: Linha[]; especiais: Especial[] };
  } catch {}
  return null;
}

export function CalcPadraoEquatorial() {
  const [cargas, setCargas] = useState<Linha[]>([
    { id: novoId(), descricao: "Pontos de luz e tomada", quantidade: 20, potenciaW: 100, categoria: "iluminacao_tomadas", ligacao: "FN" },
  ]);
  const [especiais, setEspeciais] = useState<Especial[]>([]);
  const [montagem, setMontagem] = useState<Montagem>("muro");
  const [ladoOposto, setLadoOposto] = useState(false);
  const [rural, setRural] = useState(false);
  const [opcao, setOpcao] = useState<"" | TipoLigacao>("");
  const [saidaM, setSaidaM] = useState(10);
  const [listas, setListas] = useState<{ quadros: { id: number; nome: string }[]; clientes: { id: number; nome: string }[] } | null>(null);
  const [clienteId, setClienteId] = useState<number | "">("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    const salvo = carregar();
    if (salvo?.cargas?.length) {
      seq = Math.max(...salvo.cargas.map((c) => c.id), ...salvo.especiais.map((e) => e.id), 0) + 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restaura o rascunho salvo neste aparelho
      setCargas(salvo.cargas);
      setEspeciais(salvo.especiais ?? []);
    }
    dadosCalculadora().then(setListas).catch(() => setListas({ quadros: [], clientes: [] }));
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ cargas, especiais }));
    } catch {}
  }, [cargas, especiais]);

  const equipamentos: Equipamento[] = useMemo(() => {
    const daCarga = cargas
      .filter((c) => c.ligacao !== "FN" || c.categoria === "motor" || c.potenciaW > 5000)
      .map((c) => ({
        descricao: c.descricao,
        tipo: (c.categoria === "motor" ? "motor" : "aparelho") as TipoEquipamento,
        fases: (c.ligacao === "3F" ? 3 : c.ligacao === "FF" ? 2 : 1) as 1 | 2 | 3,
        kva: c.potenciaW / 1000,
        cv: c.categoria === "motor" ? c.potenciaW / 736 : undefined,
      }));
    return [...daCarga, ...especiais.map(({ descricao, tipo, fases, kva, cv }) => ({ descricao, tipo, fases, kva, cv }))];
  }, [cargas, especiais]);

  const fp = equipamentos.some((e) => e.fases === 3) ? 0.92 : 1;
  const demanda = useMemo(() => calcularDemandaEquatorial(cargas, fp), [cargas, fp]);
  const cat = useMemo(
    () =>
      categoriaAtendimento(demanda.cargaInstaladaKW, demanda.demandaKVA, equipamentos, {
        opcaoCliente: opcao || undefined,
        area: rural ? "rural" : "urbana",
      }),
    [demanda, equipamentos, opcao, rural],
  );
  const tipo = cat.tipo === "media_tensao" ? null : cat.tipo;
  const materiais = tipo && cat.linha ? materiaisPadrao(tipo, cat.linha, montagem, { ladoOposto, comprimentoSaidaM: saidaM }) : [];
  const checklist = tipo && cat.linha ? checklistVistoria(tipo, cat.linha, montagem) : [];

  const mudar = (id: number, campo: Partial<Linha>) => setCargas((l) => l.map((c) => (c.id === id ? { ...c, ...campo } : c)));
  const mudarEsp = (id: number, campo: Partial<Especial>) => setEspeciais((l) => l.map((c) => (c.id === id ? { ...c, ...campo } : c)));

  function importar(id: number) {
    iniciar(async () => {
      const lista = await cargasDoQuadro(id);
      if (!lista.length) return setErro("Esse quadro não tem circuitos com potência.");
      setErro(null);
      setCargas(lista.map((c) => ({ ...c, id: novoId() })));
    });
  }

  function orcar() {
    if (!clienteId || !tipo || !cat.linha) return setErro("Escolha o cliente.");
    const itens = [
      ...materiais.map((m) => ({ tipo: "material" as const, descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade, busca: m.busca })),
      { tipo: "servico" as const, descricao: `Montagem de padrão de entrada ${ROTULO_LIGACAO[tipo].toLowerCase()} (Equatorial PA)`, quantidade: 1, unidade: "un", busca: ["padrao", "entrada"] },
      ...(montagem === "poste_aco" ? [] : [{ tipo: "servico" as const, descricao: "Instalação de aterramento (haste + conexões)", quantidade: 1, unidade: "un", busca: ["aterramento", "haste"] }]),
    ];
    iniciar(async () => {
      const e = await gerarOrcamentoPadrao(Number(clienteId), `Padrão de entrada ${ROTULO_LIGACAO[tipo].toLowerCase()} ${cat.linha!.disjuntorA} A`, itens);
      if (e) setErro(e);
    });
  }

  return (
    <div className="space-y-4 print:space-y-3">
      <p className="rounded-xl bg-info-soft px-3 py-2 text-xs text-info print:hidden">{AVISO_REVISAO}</p>

      <section className="card space-y-3 p-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Cargas</h2>
          {listas && listas.quadros.length > 0 && (
            <select defaultValue="" onChange={(e) => e.target.value && importar(Number(e.target.value))} className="input w-auto py-2 text-sm">
              <option value="">Importar de um quadro…</option>
              {listas.quadros.map((q) => (
                <option key={q.id} value={q.id}>{q.nome}</option>
              ))}
            </select>
          )}
        </div>
        <ul className="space-y-2">
          {cargas.map((c) => (
            <li key={c.id} className="rounded-xl border border-border p-2.5">
              <div className="flex gap-2">
                <input value={c.descricao} onChange={(e) => mudar(c.id, { descricao: e.target.value })} className="input flex-1 py-2" aria-label="Descrição" />
                <button onClick={() => setCargas((l) => l.filter((x) => x.id !== c.id))} className="btn btn-ghost p-2 text-muted" aria-label="Remover carga">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="text-xs text-muted">Qtd
                  <input type="number" min={1} value={c.quantidade} onChange={(e) => mudar(c.id, { quantidade: Math.max(1, Number(e.target.value) || 1) })} className="input mt-1 py-1.5" />
                </label>
                <label className="text-xs text-muted">Potência (W)
                  <input type="number" min={0} value={c.potenciaW} onChange={(e) => mudar(c.id, { potenciaW: Math.max(0, Number(e.target.value) || 0) })} className="input mt-1 py-1.5" />
                </label>
                <label className="text-xs text-muted">Tipo
                  <select value={c.categoria} onChange={(e) => mudar(c.id, { categoria: e.target.value as CategoriaCarga })} className="input mt-1 py-1.5">
                    {Object.entries(CATEGORIAS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                  </select>
                </label>
                <label className="text-xs text-muted">Ligação
                  <select value={c.ligacao} onChange={(e) => mudar(c.id, { ligacao: e.target.value as Ligacao })} className="input mt-1 py-1.5">
                    {Object.entries(LIGACOES).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value=""
            onChange={(e) => {
              const a = TABELA_3[Number(e.target.value)];
              if (a) setCargas((l) => [...l, { id: novoId(), descricao: a.aparelho, quantidade: 1, potenciaW: a.potenciaW, categoria: a.categoria, ligacao: "FN" }]);
            }}
            className="input"
          >
            <option value="">+ Aparelho da Tabela 3 da NT…</option>
            {TABELA_3.map((a, i) => <option key={a.aparelho} value={i}>{a.aparelho} — {a.potenciaW} W</option>)}
          </select>
          <button
            onClick={() => setCargas((l) => [...l, { id: novoId(), descricao: "Chuveiro (potência de placa)", quantidade: 1, potenciaW: 5500, categoria: "aparelho", ligacao: "FF" }])}
            className="btn btn-secondary"
          >
            <Plus className="size-4" /> Carga avulsa
          </button>
        </div>
        <p className="text-xs text-muted">Chuveiro e ar-condicionado em 220 V: escolha &quot;220 V (2 fases)&quot;. Use a potência de placa sempre que possível.</p>
      </section>

      <section className="card space-y-3 p-4 print:hidden">
        <h2 className="font-semibold">Equipamentos especiais</h2>
        <p className="text-xs text-muted">Solda, raios-X, betoneira ou motor com potência em cv (eles mudam a categoria ou exigem estudo).</p>
        {especiais.map((e) => (
          <div key={e.id} className="grid grid-cols-2 gap-2 rounded-xl border border-border p-2.5 sm:grid-cols-5">
            <input value={e.descricao} onChange={(ev) => mudarEsp(e.id, { descricao: ev.target.value })} className="input col-span-2 py-1.5 sm:col-span-1" aria-label="Descrição" />
            <select value={e.tipo} onChange={(ev) => mudarEsp(e.id, { tipo: ev.target.value as TipoEquipamento })} className="input py-1.5">
              {Object.entries(ESPECIAIS).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
            </select>
            <select value={e.fases} onChange={(ev) => mudarEsp(e.id, { fases: Number(ev.target.value) as 1 | 2 | 3 })} className="input py-1.5">
              <option value={1}>1 fase (127 V)</option>
              <option value={2}>2 fases (220 V)</option>
              <option value={3}>Trifásico</option>
            </select>
            <label className="flex items-center gap-1 text-xs text-muted">
              {e.tipo === "motor" ? "cv" : "kVA"}
              <input
                type="number"
                min={0}
                step="0.5"
                value={e.tipo === "motor" ? e.cv : e.kva}
                onChange={(ev) => mudarEsp(e.id, e.tipo === "motor" ? { cv: Number(ev.target.value) || 0 } : { kva: Number(ev.target.value) || 0 })}
                className="input py-1.5"
              />
            </label>
            <button onClick={() => setEspeciais((l) => l.filter((x) => x.id !== e.id))} className="btn btn-ghost p-2 text-muted" aria-label="Remover equipamento">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <button onClick={() => setEspeciais((l) => [...l, { id: novoId(), descricao: "Motor", tipo: "motor", fases: 1, kva: 0, cv: 1 }])} className="btn btn-secondary">
          <Plus className="size-4" /> Equipamento especial
        </button>
      </section>

      <section className="card grid gap-3 p-4 sm:grid-cols-2 print:hidden">
        <Campo rotulo="Onde fica a medição">
          <select value={montagem} onChange={(e) => setMontagem(e.target.value as Montagem)} className="input">
            {Object.entries(ROTULO_MONTAGEM).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Tipo de ligação">
          <select value={opcao} onChange={(e) => setOpcao(e.target.value as "" | TipoLigacao)} className="input">
            <option value="">Automático pela norma</option>
            <option value="bifasico">Cliente quer bifásico</option>
            <option value="trifasico">Cliente quer trifásico</option>
          </select>
        </Campo>
        <Campo rotulo="Cabo do padrão até o quadro (m)">
          <input type="number" min={1} value={saidaM} onChange={(e) => setSaidaM(Math.max(1, Number(e.target.value) || 1))} className="input" />
        </Campo>
        <div className="space-y-2 pt-6 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={ladoOposto} onChange={(e) => setLadoOposto(e.target.checked)} /> Imóvel do lado oposto à rede</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={rural} onChange={(e) => setRural(e.target.checked)} /> Área rural</label>
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Padrão de entrada — Equatorial Pará</p>
            <p className="text-2xl font-bold">
              {tipo ? `${ROTULO_LIGACAO[tipo]} · ${cat.linha?.disjuntorA} A` : "Média tensão"}
            </p>
            <p className="text-sm text-muted">
              {cat.tensao} · carga instalada {demanda.cargaInstaladaKW.toFixed(2)} kW · demanda estimada {demanda.demandaKVA.toFixed(2)} kVA
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={() => window.print()} className="btn btn-secondary"><Printer className="size-4" /> Imprimir/PDF</button>
          </div>
        </div>

        {cat.bloqueios.map((b) => <Alerta key={b} tom="perigo" texto={b} />)}
        {cat.estudos.map((b) => <Alerta key={b} tom="aviso" texto={b} />)}
        {cat.avisos.map((b) => <Alerta key={b} tom="info" texto={b} />)}

        {cat.linha && (
          <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
            <Dado r="Disjuntor geral" v={`${cat.linha.disjuntorA} A`} />
            <Dado r="Condutor do cliente — fase(neutro)" v={`${cat.linha.condutorCliente} mm² (1 kV / 90 °C)`} />
            <Dado r="Eletroduto de entrada (aço galvanizado)" v={cat.linha.eletrodutoAco} />
            <Dado r="Aterramento (aço cobreado)" v={`${cat.linha.aterramentoMm2} mm² em eletroduto ${cat.linha.eletrodutoAterramento}`} />
            <Dado r="Haste" v={montagem === "poste_aco" ? "Dispensada (poste de aço)" : "1 haste aço cobreado Ø 16 × 1.500 mm"} />
            <Dado r="Potência disponibilizada (para solar)" v={`${potenciaDisponibilizadaKVA(cat.linha.disjuntorA, tipo!).toFixed(1)} kVA`} />
            <Dado
              r="Ramal (da Equatorial)"
              v={[
                cat.linha.ramal.cobreMultiplexadoMm2 && `até 2 km da orla: cobre multiplexado ${cat.linha.ramal.cobreMultiplexadoMm2} mm²`,
                cat.linha.ramal.aluminio && `demais: alumínio ${cat.linha.ramal.aluminio.tipo} ${cat.linha.ramal.aluminio.mm2} mm²`,
              ].filter(Boolean).join(" · ")}
            />
          </dl>
        )}
        {opcao && cat.linha?.observacao && <p className="text-xs text-muted">{cat.linha.observacao}</p>}

        <details>
          <summary className="cursor-pointer text-sm font-medium">Por que essa categoria</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{cat.motivos.map((m) => <li key={m}>{m}</li>)}</ul>
          <p className="mt-2 text-xs text-muted">Referências: {cat.referencias.join("; ")}</p>
        </details>
        <details>
          <summary className="cursor-pointer text-sm font-medium">Demanda estimada</summary>
          <table className="mt-2 w-full text-xs">
            <tbody>
              {demanda.parcelas.map((p) => (
                <tr key={p.grupo} className="border-b border-border">
                  <td className="py-1 pr-2">{p.grupo}</td>
                  <td className="py-1 pr-2 text-right">{p.cargaKW.toFixed(2)} kW</td>
                  <td className="py-1 pr-2">{p.fator}</td>
                  <td className="py-1 text-right">{p.demandaKW.toFixed(2)} kW</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-muted">{demanda.observacoes.join(" ")}</p>
        </details>
      </section>

      {materiais.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">Materiais do padrão (por conta do cliente)</h2>
          <ul className="divide-y divide-border text-sm">
            {materiais.map((m) => (
              <li key={m.descricao} className="flex justify-between gap-3 py-2">
                <span>{m.descricao}<span className="block text-xs text-muted">{m.ref}</span></span>
                <span className="shrink-0 font-semibold">{m.quantidade.toLocaleString("pt-BR")} {m.unidade}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Ramal de conexão, alças, conectores e medidor são da Equatorial (item 6.3.2.3).</p>
        </section>
      )}

      {checklist.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 font-semibold">Checklist antes de pedir a ligação</h2>
          <ul className="space-y-2 text-sm">
            {checklist.map((c) => (
              <li key={c.texto} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />
                <span>{c.texto}<span className="block text-xs text-muted">{c.ref}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tipo && (
        <section className="card space-y-2 p-4 print:hidden">
          <h2 className="font-semibold">Orçamento do padrão</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={clienteId} onChange={(e) => setClienteId(Number(e.target.value) || "")} className="input">
              <option value="">Escolha o cliente…</option>
              {listas?.clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <button onClick={orcar} disabled={pendente} className="btn btn-primary shrink-0">
              {pendente ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} Gerar orçamento
            </button>
          </div>
          <p className="text-xs text-muted">Usa os preços do seu catálogo; o que não estiver no catálogo entra marcado “[definir preço]”.</p>
          {erro && <p className="text-sm text-danger">{erro}</p>}
        </section>
      )}
      {!tipo && erro && <p className="text-sm text-danger">{erro}</p>}
      <p className="hidden text-xs print:block">{AVISO_REVISAO}</p>
    </div>
  );
}

function Dado({ r, v }: { r: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{r}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function Alerta({ tom, texto }: { tom: "perigo" | "aviso" | "info"; texto: string }) {
  const cls = tom === "perigo" ? "bg-danger-soft text-danger" : tom === "aviso" ? "bg-warn-soft text-warn" : "bg-info-soft text-info";
  const Icone = tom === "perigo" ? Ban : AlertTriangle;
  return (
    <p className={`flex gap-2 rounded-xl px-3 py-2 text-sm ${cls}`}>
      <Icone className="mt-0.5 size-4 shrink-0" /> {texto}
    </p>
  );
}
