"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Campo } from "@/components/ui";
import { reais } from "@/lib/formato";
import {
  AMBIENTES_LUX,
  APARELHOS_TIPICOS,
  type Aparelho,
  CARREGADORES,
  carregadorVE,
  consumoMensal,
  correnteMotor,
  DIAMETRO_CABO_MM,
  DISPONIBILIDADE_KWH,
  ELETRODUTOS,
  estimarBTU,
  estimarSolar,
  luminarias,
  ocupacaoEletroduto,
} from "@/lib/servicos/calculos";

const fmt = (v: number, d = 1) => (Number.isFinite(v) ? v.toLocaleString("pt-BR", { maximumFractionDigits: d }) : "—");
const num = (s: string) => Number(s.replace(",", ".")) || 0;

function Res({ itens }: { itens: [string, string][] }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-accent-soft p-4 sm:grid-cols-4">
      {itens.map(([r, v]) => (
        <div key={r}>
          <p className="text-xs text-muted">{r}</p>
          <p className="text-lg font-bold">{v}</p>
        </div>
      ))}
    </div>
  );
}

function Nota({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-info-soft p-3 text-xs text-info">{children}</p>;
}

function N({ rotulo, valor, set, dica }: { rotulo: string; valor: string; set: (v: string) => void; dica?: string }) {
  return (
    <Campo rotulo={rotulo} dica={dica}>
      <input className="input" inputMode="decimal" value={valor} onChange={(e) => set(e.target.value)} />
    </Campo>
  );
}

export function CalcBTU() {
  const [area, setArea] = useState("15");
  const [pessoas, setPessoas] = useState("2");
  const [eletr, setEletr] = useState("1");
  const [sol, setSol] = useState(false);
  const r = estimarBTU({ areaM2: num(area), solTarde: sol, pessoas: num(pessoas), eletronicos: num(eletr) });
  return (
    <div className="card space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <N rotulo="Área (m²)" valor={area} set={setArea} />
        <N rotulo="Pessoas" valor={pessoas} set={setPessoas} />
        <N rotulo="Eletrônicos" valor={eletr} set={setEletr} dica="TV, computador…" />
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium">
          <input type="checkbox" checked={sol} onChange={(e) => setSol(e.target.checked)} className="size-5 accent-[var(--accent)]" /> Sol da tarde / cobertura
        </label>
      </div>
      <Res itens={[["Carga estimada", `${fmt(r.btu, 0)} BTU/h`], ["Aparelho sugerido", r.sugerido ? `${fmt(r.sugerido, 0)} BTU/h` : "acima de 60.000"]]} />
      <Nota>Estimativa prática de mercado (600 BTU/m², 800 com sol forte, +600 por pessoa extra e por eletrônico). Em Belém, ambientes com muito vidro, forro sem isolamento ou cozinha integrada podem precisar de mais. Para comércio, faça cálculo de carga térmica.</Nota>
    </div>
  );
}

export function CalcLux() {
  const [amb, setAmb] = useState(0);
  const [lux, setLux] = useState(String(AMBIENTES_LUX[0].lux));
  const [area, setArea] = useState("12");
  const [lm, setLm] = useState("1800");
  const [u, setU] = useState("0,6");
  const [fm, setFm] = useState("0,8");
  const r = luminarias({ lux: num(lux), areaM2: num(area), lumensPorLuminaria: num(lm), utilizacao: num(u), manutencao: num(fm) });
  return (
    <div className="card space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Ambiente" className="sm:col-span-2">
          <select
            className="input"
            value={amb}
            onChange={(e) => {
              const i = Number(e.target.value);
              setAmb(i);
              setLux(String(AMBIENTES_LUX[i].lux));
            }}
          >
            {AMBIENTES_LUX.map((a, i) => (
              <option key={a.nome} value={i}>{a.nome} — {a.lux} lux{a.ref === "tipico" ? " (típico)" : ""}</option>
            ))}
          </select>
        </Campo>
        <N rotulo="Iluminância (lux)" valor={lux} set={setLux} />
        <N rotulo="Área (m²)" valor={area} set={setArea} />
        <N rotulo="Lúmens por luminária" valor={lm} set={setLm} dica="Ver embalagem (lm)" />
        <N rotulo="Fator de utilização" valor={u} set={setU} dica="0,4 a 0,7 (teto/paredes claras ↑)" />
        <N rotulo="Fator de manutenção" valor={fm} set={setFm} dica="0,8 ambiente limpo" />
      </div>
      <Res itens={[["Fluxo necessário", `${fmt(r.fluxoTotal, 0)} lm`], ["Luminárias", String(r.quantidade)], ["Iluminância obtida", `${fmt(r.luxObtido, 0)} lux`]]} />
      <Nota>Método dos lúmens. Valores de ambientes de trabalho baseados na ABNT NBR ISO/CIE 8995-1; os residenciais são referências típicas de mercado. Conferir na edição vigente.</Nota>
    </div>
  );
}

export function CalcConsumo() {
  const [lista, setLista] = useState<Aparelho[]>(APARELHOS_TIPICOS);
  const [tarifa, setTarifa] = useState("");
  const r = consumoMensal(lista, tarifa ? num(tarifa) : null);
  const set = (i: number, k: keyof Aparelho, v: string) =>
    setLista((l) => l.map((a, j) => (j === i ? { ...a, [k]: k === "nome" ? v : num(v) } : a)));
  return (
    <div className="card space-y-4 p-4">
      <N rotulo="Tarifa (R$/kWh com impostos)" valor={tarifa} set={setTarifa} dica="Pegue na conta de luz do cliente (valor total ÷ kWh). Não usamos valor fixo." />
      <div className="space-y-2">
        {r.linhas.map((a, i) => (
          <div key={i} className="rounded-xl border border-border p-2.5">
            <div className="flex items-center gap-2">
              <input className="input py-1.5" value={a.nome} onChange={(e) => set(i, "nome", e.target.value)} aria-label="Aparelho" />
              <button onClick={() => setLista((l) => l.filter((_, j) => j !== i))} className="btn btn-ghost p-2 text-muted" aria-label="Remover"><Trash2 className="size-4" /></button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-muted">
              {(
                [
                  ["watts", "W"],
                  ["horasDia", "h/dia"],
                  ["diasMes", "dias/mês"],
                  ["quantidade", "qtd"],
                ] as const
              ).map(([k, r2]) => (
                <label key={k}>
                  {r2}
                  <input className="input mt-1 px-2 py-1.5" inputMode="decimal" defaultValue={String(a[k]).replace(".", ",")} onChange={(e) => set(i, k, e.target.value)} />
                </label>
              ))}
            </div>
            <p className="mt-1 text-right text-sm font-semibold">{fmt(a.kwh)} kWh/mês{a.custo != null && ` · ${reais(a.custo)}`}</p>
          </div>
        ))}
      </div>
      <button onClick={() => setLista((l) => [...l, { nome: "Novo aparelho", watts: 100, horasDia: 1, diasMes: 30, quantidade: 1 }])} className="btn btn-secondary w-full">
        <Plus className="size-4" /> Aparelho
      </button>
      <Res itens={[["Consumo estimado", `${fmt(r.totalKWh, 0)} kWh/mês`], ["Custo estimado", r.totalCusto != null ? reais(r.totalCusto) : "informe a tarifa"]]} />
      <Nota>Potências e horas são exemplos: ajuste pelos aparelhos do cliente. A conta real inclui custo de disponibilidade, bandeiras e iluminação pública.</Nota>
    </div>
  );
}

export function CalcMotor() {
  const [pot, setPot] = useState("1");
  const [un, setUn] = useState<"cv" | "kW">("cv");
  const [tensao, setTensao] = useState("220");
  const [fases, setFases] = useState<1 | 3>(1);
  const [ren, setRen] = useState("0,75");
  const [fp, setFp] = useState("0,8");
  const r = correnteMotor({ potencia: num(pot), unidade: un, tensao: num(tensao), fases, rendimento: num(ren), fp: num(fp) });
  return (
    <div className="card space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <N rotulo="Potência" valor={pot} set={setPot} />
        <Campo rotulo="Unidade">
          <select className="input" value={un} onChange={(e) => setUn(e.target.value as "cv" | "kW")}><option value="cv">cv</option><option value="kW">kW</option></select>
        </Campo>
        <Campo rotulo="Fases">
          <select className="input" value={fases} onChange={(e) => setFases(Number(e.target.value) as 1 | 3)}><option value={1}>Monofásico</option><option value={3}>Trifásico</option></select>
        </Campo>
        <N rotulo="Tensão (V)" valor={tensao} set={setTensao} />
        <N rotulo="Rendimento" valor={ren} set={setRen} dica="Placa do motor; típico 0,7–0,9" />
        <N rotulo="Fator de potência" valor={fp} set={setFp} dica="Placa; típico 0,75–0,87" />
      </div>
      <Res
        itens={[
          ["Corrente nominal", `${fmt(r.In)} A`],
          ["Cabo para", `${fmt(r.correnteCabo)} A (125%)`],
          ["Contator AC-3", r.contator ? `≥ ${r.contator} A` : "> 95 A"],
          ["Relé térmico", `faixa com ${fmt(r.In)} A`],
        ]}
      />
      <Nota>Use sempre a corrente da PLACA do motor quando houver. Com a corrente do cabo, dimensione a bitola na aba “Bitola do cabo”. Proteção: disjuntor-motor ou disjuntor + relé térmico ajustado em In. Regra de 125% para o condutor: conferir NBR 5410 (6.5.1).</Nota>
    </div>
  );
}

export function CalcSolar() {
  const [consumo, setConsumo] = useState("400");
  const [lig, setLig] = useState<keyof typeof DISPONIBILIDADE_KWH>("bi");
  const [hsp, setHsp] = useState("4,8");
  const [pr, setPr] = useState("0,78");
  const [mod, setMod] = useState("550");
  const [area, setArea] = useState("2,6");
  const r = estimarSolar({ consumoMensalKWh: num(consumo), ligacao: lig, hsp: num(hsp), pr: num(pr), potenciaModuloW: num(mod), areaModuloM2: num(area) });
  return (
    <div className="card space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <N rotulo="Consumo médio (kWh/mês)" valor={consumo} set={setConsumo} dica="Média de 12 meses da conta" />
        <Campo rotulo="Ligação">
          <select className="input" value={lig} onChange={(e) => setLig(e.target.value as keyof typeof DISPONIBILIDADE_KWH)}>
            <option value="mono">Monofásica</option>
            <option value="bi">Bifásica</option>
            <option value="tri">Trifásica</option>
          </select>
        </Campo>
        <N rotulo="Irradiação (HSP, kWh/m²·dia)" valor={hsp} set={setHsp} dica="Belém ≈ 4,5–5 — conferir (CRESESB/INPE)" />
        <N rotulo="Desempenho (PR)" valor={pr} set={setPr} dica="0,75–0,80" />
        <N rotulo="Potência do módulo (W)" valor={mod} set={setMod} />
        <N rotulo="Área do módulo (m²)" valor={area} set={setArea} />
      </div>
      <Res
        itens={[
          ["A compensar", `${fmt(r.compensar, 0)} kWh/mês`],
          ["Sistema", `${fmt(r.kWpReal, 2)} kWp`],
          ["Módulos", String(r.modulos)],
          ["Área de telhado", `${fmt(r.area, 0)} m²`],
        ]}
      />
      <Nota>Estimativa para conversa com o cliente. Desconta o custo de disponibilidade ({DISPONIBILIDADE_KWH[lig]} kWh) — conferir regra ANEEL vigente. Projeto, ART/TRT e homologação na Equatorial exigem responsável técnico habilitado.</Nota>
    </div>
  );
}

export function CalcVE() {
  const [i, setI] = useState(1);
  const [tensao, setTensao] = useState("220");
  const [bat, setBat] = useState("50");
  const c = CARREGADORES[i];
  const r = carregadorVE({ kW: c.kW, fases: c.fases, tensao: num(tensao), bateriaKWh: num(bat), eficiencia: 0.9 });
  return (
    <div className="card space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Campo rotulo="Carregador" className="col-span-2 sm:col-span-1">
          <select className="input" value={i} onChange={(e) => setI(Number(e.target.value))}>
            {CARREGADORES.map((x, j) => <option key={x.nome} value={j}>{x.nome}</option>)}
          </select>
        </Campo>
        <N rotulo={c.fases === 3 ? "Tensão F-F (V)" : "Tensão (V)"} valor={tensao} set={setTensao} />
        <N rotulo="Bateria do carro (kWh)" valor={bat} set={setBat} />
      </div>
      <Res itens={[["Corrente", `${fmt(r.I)} A`], ["Carga 0→100%", `${fmt(r.horasCargaCompleta)} h`], ["Circuito", "Exclusivo + PE"]]} />
      <Nota>Carga contínua por horas: dimensione cabo e disjuntor com folga e confira se o padrão de entrada comporta (pode exigir aumento de carga na Equatorial). Proteção diferencial: DR tipo A com detecção de corrente contínua 6 mA ou tipo B, conforme o carregador — conferir ABNT NBR 17019 e o manual.</Nota>
    </div>
  );
}

export function CalcEletroduto() {
  const [cabos, setCabos] = useState([{ secao: "2,5", quantidade: 6 }]);
  const [tubo, setTubo] = useState(1);
  const r = ocupacaoEletroduto(cabos, ELETRODUTOS[tubo].interno);
  return (
    <div className="card space-y-4 p-4">
      {cabos.map((c, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <Campo rotulo="Seção (mm²)">
            <select className="input" value={c.secao} onChange={(e) => setCabos((l) => l.map((x, j) => (j === i ? { ...x, secao: e.target.value } : x)))}>
              {Object.keys(DIAMETRO_CABO_MM).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Quantidade">
            <input className="input" inputMode="numeric" value={c.quantidade} onChange={(e) => setCabos((l) => l.map((x, j) => (j === i ? { ...x, quantidade: Math.max(0, Math.round(num(e.target.value))) } : x)))} />
          </Campo>
          <button onClick={() => setCabos((l) => l.filter((_, j) => j !== i))} className="btn btn-ghost p-3 text-muted" aria-label="Remover"><Trash2 className="size-4" /></button>
        </div>
      ))}
      <button onClick={() => setCabos((l) => [...l, { secao: "1,5", quantidade: 2 }])} className="btn btn-secondary w-full"><Plus className="size-4" /> Outra seção</button>
      <Campo rotulo="Eletroduto">
        <select className="input" value={tubo} onChange={(e) => setTubo(Number(e.target.value))}>
          {ELETRODUTOS.map((e, i) => <option key={e.nome} value={i}>{e.nome} — Ø int. ≈ {fmt(e.interno)} mm</option>)}
        </select>
      </Campo>
      <Res
        itens={[
          ["Condutores", String(r.n)],
          ["Ocupação", `${fmt(r.taxa * 100)}%`],
          ["Máximo", `${fmt(r.max * 100, 0)}%`],
          ["Resultado", r.ok ? "✅ Cabe" : `❌ Use ${r.sugerido?.nome ?? "eletroduto maior"}`],
        ]}
      />
      <Nota>Taxa máxima pela NBR 5410 (6.2.11.1.6): 53% com 1 condutor, 31% com 2 e 40% com 3 ou mais — conferir edição vigente. Diâmetros de cabos e eletrodutos são aproximados: conferir o catálogo do fabricante.</Nota>
    </div>
  );
}
