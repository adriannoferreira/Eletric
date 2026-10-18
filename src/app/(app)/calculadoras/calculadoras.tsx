"use client";

import { useState } from "react";
import { ListaAlertas } from "@/components/quadro/alertas";
import { Conferir, Ref } from "@/components/divulgacao";
import { Campo } from "@/components/ui";
import {
  capacidadeCorrigida,
  correnteProjeto,
  dimensionar,
  disjuntorMinimo,
  potenciaDaCorrente,
  quedaTensaoPct,
} from "@/lib/eletrica/calculo";
import { DESCRICAO_METODO, type Metodo, METODOS, QUEDA_MAX_TERMINAL, SECOES } from "@/lib/eletrica/tabelas";
import { LIGACOES, type Ligacao, TIPOS_CIRCUITO, type TipoCircuito } from "@/lib/eletrica/tipos";
import { CalcPadraoEquatorial } from "@/components/normas/calc-padrao";
import { CalcBTU, CalcConsumo, CalcEletroduto, CalcLux, CalcMotor, CalcSolar, CalcVE } from "./extras";

const ABAS = [
  { id: "cabo", rotulo: "Bitola do cabo" },
  { id: "corrente", rotulo: "Corrente × potência" },
  { id: "queda", rotulo: "Queda de tensão" },
  { id: "disjuntor", rotulo: "Disjuntor" },
  { id: "btu", rotulo: "Ar-condicionado (BTU)" },
  { id: "lux", rotulo: "Iluminação" },
  { id: "consumo", rotulo: "Consumo / conta" },
  { id: "motor", rotulo: "Motores e bombas" },
  { id: "solar", rotulo: "Solar" },
  { id: "ve", rotulo: "Carro elétrico" },
  { id: "eletroduto", rotulo: "Eletroduto" },
  { id: "padrao", rotulo: "Padrão Equatorial PA" },
] as const;

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString("pt-BR", { maximumFractionDigits: d }) : "—");
const num = (s: string) => Number(s.replace(",", ".")) || 0;

export function Calculadoras() {
  const [aba, setAba] = useState<(typeof ABAS)[number]["id"]>("cabo");
  return (
    <div className="space-y-4">
      <select
        value={aba}
        onChange={(e) => setAba(e.target.value as (typeof ABAS)[number]["id"])}
        className="input text-base font-semibold md:hidden"
        aria-label="Calculadora"
      >
        {ABAS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.rotulo}
          </option>
        ))}
      </select>
      <div className="hidden flex-wrap gap-1.5 md:flex">
        {ABAS.map((a) => (
          <button key={a.id} onClick={() => setAba(a.id)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${aba === a.id ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"}`}>
            {a.rotulo}
          </button>
        ))}
      </div>
      {aba === "cabo" && <CalcCabo />}
      {aba === "corrente" && <CalcCorrente />}
      {aba === "queda" && <CalcQueda />}
      {aba === "disjuntor" && <CalcDisjuntor />}
      {aba === "btu" && <CalcBTU />}
      {aba === "lux" && <CalcLux />}
      {aba === "consumo" && <CalcConsumo />}
      {aba === "motor" && <CalcMotor />}
      {aba === "solar" && <CalcSolar />}
      {aba === "ve" && <CalcVE />}
      {aba === "eletroduto" && <CalcEletroduto />}
      {aba === "padrao" && <CalcPadraoEquatorial />}
      {["cabo", "corrente", "queda", "disjuntor"].includes(aba) && (
        <div className="flex flex-wrap items-center gap-2">
          <Ref norma="NBR 5410" item="Tab. 36, 40, 42">
            <p>Cobre, isolação PVC 70 °C, Tabelas 36, 40 e 42 da NBR 5410:2004 (versão corrigida 2008). Queda de tensão pelo método simplificado (resistência a 70 °C, sem reatância).</p>
          </Ref>
          <Conferir itens={["Edição vigente da NBR 5410.", "Catálogo do fabricante do cabo e do disjuntor."]} />
        </div>
      )}
    </div>
  );
}

function Resultado({ itens }: { itens: [string, string][] }) {
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

function Tensao({ ligacao, setLigacao, tensao, setTensao }: { ligacao: Ligacao; setLigacao: (l: Ligacao) => void; tensao: string; setTensao: (t: string) => void }) {
  return (
    <>
      <Campo rotulo="Ligação">
        <select className="input" value={ligacao} onChange={(e) => setLigacao(e.target.value as Ligacao)}>
          {Object.entries(LIGACOES).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
      </Campo>
      <Campo rotulo={ligacao === "FN" ? "Tensão fase-neutro (V)" : "Tensão fase-fase (V)"}>
        <input className="input" inputMode="decimal" list="tensoes" value={tensao} onChange={(e) => setTensao(e.target.value)} />
        <datalist id="tensoes">
          {[127, 220, 380].map((v) => <option key={v} value={v} />)}
        </datalist>
      </Campo>
    </>
  );
}

function CalcCabo() {
  const [tipo, setTipo] = useState<TipoCircuito>("tue");
  const [potencia, setPotencia] = useState("7500");
  const [fp, setFp] = useState("1");
  const [ligacao, setLigacao] = useState<Ligacao>("FF");
  const [tensao, setTensao] = useState("220");
  const [comprimento, setComprimento] = useState("15");
  const [metodo, setMetodo] = useState<Metodo>("B1");
  const [agrupados, setAgrupados] = useState("1");
  const [temperatura, setTemperatura] = useState("30");

  const d = dimensionar({
    tipo,
    potenciaW: num(potencia),
    fatorPotencia: num(fp) || 1,
    ligacao,
    tensaoV: num(tensao),
    comprimentoM: num(comprimento),
    metodo,
    temperaturaC: num(temperatura),
    circuitosAgrupados: Math.max(1, Math.round(num(agrupados))),
  });

  return (
    <div className="card space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Campo rotulo="Tipo de circuito">
          <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCircuito)}>
            {Object.entries(TIPOS_CIRCUITO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Potência (W)">
          <input className="input" inputMode="decimal" value={potencia} onChange={(e) => setPotencia(e.target.value)} />
        </Campo>
        <Campo rotulo="Fator de potência">
          <input className="input" inputMode="decimal" value={fp} onChange={(e) => setFp(e.target.value)} />
        </Campo>
        <Tensao ligacao={ligacao} setLigacao={setLigacao} tensao={tensao} setTensao={setTensao} />
        <Campo rotulo="Comprimento (m)">
          <input className="input" inputMode="decimal" value={comprimento} onChange={(e) => setComprimento(e.target.value)} />
        </Campo>
        <Campo rotulo="Método de instalação" className="sm:col-span-2 lg:col-span-3">
          <select className="input" value={metodo} onChange={(e) => setMetodo(e.target.value as Metodo)}>
            {METODOS.map((m) => <option key={m} value={m}>{DESCRICAO_METODO[m]}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Circuitos no mesmo eletroduto">
          <input className="input" inputMode="numeric" value={agrupados} onChange={(e) => setAgrupados(e.target.value)} />
        </Campo>
        <Campo rotulo="Temperatura ambiente (°C)">
          <input className="input" inputMode="decimal" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} />
        </Campo>
      </div>
      <Resultado
        itens={[
          ["Corrente (Ib)", `${fmt(d.ib, 1)} A`],
          ["Cabo", d.secao ? `${fmt(d.secao)} mm²` : "—"],
          ["Disjuntor", d.disjuntor ? `${d.disjuntor} A` : "—"],
          ["Queda", `${fmt(d.quedaPct)}%`],
        ]}
      />
      <div className="space-y-1 text-sm">
        <p>
          <b>Por capacidade:</b> {d.secaoCapacidade ? `${fmt(d.secaoCapacidade)} mm²` : "—"} (Iz ≥ In) ·{" "}
          <b>por queda (≤ {QUEDA_MAX_TERMINAL}%):</b> {d.secaoQueda ? `${fmt(d.secaoQueda)} mm²` : "—"} ·{" "}
          <b>mínima:</b> {fmt(d.secaoMinima)} mm²
        </p>
        <p className="text-muted">
          Iz do cabo escolhido = {fmt(d.iz, 1)} A (Tabela 36 × FCT {d.fct} × FCA {d.fca}). Condição: Ib ≤ In ≤ Iz (5.3.4.1).
        </p>
      </div>
      <ListaAlertas alertas={d.alertas} vazio="Dimensionamento conforme." />
    </div>
  );
}

function CalcCorrente() {
  const [modo, setModo] = useState<"p2i" | "i2p">("p2i");
  const [valor, setValor] = useState("4400");
  const [fp, setFp] = useState("1");
  const [ligacao, setLigacao] = useState<Ligacao>("FN");
  const [tensao, setTensao] = useState("127");
  const v = num(valor);
  const res = modo === "p2i" ? correnteProjeto(v, num(tensao), num(fp) || 1, ligacao) : potenciaDaCorrente(v, num(tensao), num(fp) || 1, ligacao);
  return (
    <div className="card space-y-4 p-4">
      <div className="flex gap-2">
        <button onClick={() => setModo("p2i")} className={`btn py-2 ${modo === "p2i" ? "btn-primary" : "btn-secondary"}`}>Potência → corrente</button>
        <button onClick={() => setModo("i2p")} className={`btn py-2 ${modo === "i2p" ? "btn-primary" : "btn-secondary"}`}>Corrente → potência</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo={modo === "p2i" ? "Potência (W)" : "Corrente (A)"}>
          <input className="input" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
        </Campo>
        <Campo rotulo="Fator de potência">
          <input className="input" inputMode="decimal" value={fp} onChange={(e) => setFp(e.target.value)} />
        </Campo>
        <Tensao ligacao={ligacao} setLigacao={setLigacao} tensao={tensao} setTensao={setTensao} />
      </div>
      <Resultado itens={[[modo === "p2i" ? "Corrente" : "Potência", modo === "p2i" ? `${fmt(res)} A` : `${fmt(res, 0)} W`]]} />
      <p className="text-sm text-muted">
        {ligacao === "3F" ? "Trifásico: I = P ÷ (√3 × V × FP), com V de linha." : "Monofásico: I = P ÷ (V × FP)."}
      </p>
    </div>
  );
}

function CalcQueda() {
  const [corrente, setCorrente] = useState("20");
  const [comprimento, setComprimento] = useState("25");
  const [secao, setSecao] = useState("2.5");
  const [ligacao, setLigacao] = useState<Ligacao>("FN");
  const [tensao, setTensao] = useState("127");
  const pct = quedaTensaoPct(num(corrente), num(comprimento), Number(secao), num(tensao), ligacao);
  const volts = (pct / 100) * num(tensao);
  return (
    <div className="card space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Corrente (A)">
          <input className="input" inputMode="decimal" value={corrente} onChange={(e) => setCorrente(e.target.value)} />
        </Campo>
        <Campo rotulo="Comprimento (m, só ida)">
          <input className="input" inputMode="decimal" value={comprimento} onChange={(e) => setComprimento(e.target.value)} />
        </Campo>
        <Campo rotulo="Seção do cabo">
          <select className="input" value={secao} onChange={(e) => setSecao(e.target.value)}>
            {SECOES.map((s) => <option key={s} value={s}>{fmt(s)} mm²</option>)}
          </select>
        </Campo>
        <Tensao ligacao={ligacao} setLigacao={setLigacao} tensao={tensao} setTensao={setTensao} />
      </div>
      <Resultado itens={[["Queda", `${fmt(pct)}%`], ["Em volts", `${fmt(volts, 1)} V`], ["Tensão no ponto", `${fmt(num(tensao) - volts, 1)} V`]]} />
      <ListaAlertas
        alertas={
          pct > QUEDA_MAX_TERMINAL
            ? [{ nivel: "erro", mensagem: `Acima de ${QUEDA_MAX_TERMINAL}% — aumente a seção ou reduza o comprimento.`, referencia: "NBR 5410 6.2.7.2" }]
            : []
        }
        vazio={`Dentro do limite de ${QUEDA_MAX_TERMINAL}% para circuito terminal.`}
      />
    </div>
  );
}

function CalcDisjuntor() {
  const [ib, setIb] = useState("18");
  const [secao, setSecao] = useState("2.5");
  const [metodo, setMetodo] = useState<Metodo>("B1");
  const [carregados, setCarregados] = useState<2 | 3>(2);
  const [agrupados, setAgrupados] = useState("1");
  const [temperatura, setTemperatura] = useState("30");
  const iz = capacidadeCorrigida(Number(secao), metodo, carregados, num(temperatura), Math.max(1, Math.round(num(agrupados))));
  const In = disjuntorMinimo(num(ib));
  const ok = In !== undefined && In <= iz;
  return (
    <div className="card space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Campo rotulo="Corrente de projeto Ib (A)">
          <input className="input" inputMode="decimal" value={ib} onChange={(e) => setIb(e.target.value)} />
        </Campo>
        <Campo rotulo="Seção do cabo instalado">
          <select className="input" value={secao} onChange={(e) => setSecao(e.target.value)}>
            {SECOES.map((s) => <option key={s} value={s}>{fmt(s)} mm²</option>)}
          </select>
        </Campo>
        <Campo rotulo="Condutores carregados">
          <select className="input" value={carregados} onChange={(e) => setCarregados(Number(e.target.value) as 2 | 3)}>
            <option value={2}>2 (F-N ou F-F)</option>
            <option value={3}>3 (trifásico)</option>
          </select>
        </Campo>
        <Campo rotulo="Método de instalação" className="sm:col-span-2 lg:col-span-3">
          <select className="input" value={metodo} onChange={(e) => setMetodo(e.target.value as Metodo)}>
            {METODOS.map((m) => <option key={m} value={m}>{DESCRICAO_METODO[m]}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Circuitos no mesmo eletroduto">
          <input className="input" inputMode="numeric" value={agrupados} onChange={(e) => setAgrupados(e.target.value)} />
        </Campo>
        <Campo rotulo="Temperatura ambiente (°C)">
          <input className="input" inputMode="decimal" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} />
        </Campo>
      </div>
      <Resultado itens={[["Iz do cabo", `${fmt(iz, 1)} A`], ["Disjuntor mínimo", In ? `${In} A` : "—"]]} />
      <ListaAlertas
        alertas={
          ok
            ? []
            : [
                {
                  nivel: "erro",
                  mensagem: In
                    ? `O disjuntor de ${In} A passa da capacidade do cabo (${fmt(iz, 1)} A). Aumente a seção.`
                    : "Corrente acima dos disjuntores DIN do catálogo.",
                  referencia: "NBR 5410 5.3.4.1 (Ib ≤ In ≤ Iz)",
                },
              ]
        }
        vazio={`Use disjuntor de ${In} A: atende Ib ≤ In ≤ Iz. Curva B para cargas resistivas/iluminação, C para tomadas e motores.`}
      />
    </div>
  );
}
