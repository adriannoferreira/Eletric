"use client";

import { Check, ChevronDown, Clock, Loader2, Save, Wrench } from "lucide-react";
import { useState, useTransition } from "react";
import { Ajuda } from "@/components/divulgacao";
import { Campo } from "@/components/ui";
import { salvarValorHora } from "@/app/(app)/vendas/actions";
import { reais } from "@/lib/formato";

const CUSTOS = [
  { chave: "transporte", rotulo: "Transporte / combustível", dica: "Gasolina, manutenção do carro/moto, seguro", padrao: 600 },
  { chave: "celular", rotulo: "Celular e internet", dica: "Seu principal canal de vendas", padrao: 120 },
  { chave: "ferramentas", rotulo: "Ferramentas (reposição)", dica: "Quanto separar por mês para trocar e comprar ferramentas", padrao: 150 },
  { chave: "impostos", rotulo: "Impostos (DAS do MEI)", dica: "Valor do seu boleto mensal", padrao: 80 },
  { chave: "contador", rotulo: "Contador / sistemas", dica: "Se não tiver, deixe 0", padrao: 0 },
  { chave: "marketing", rotulo: "Marketing", dica: "Cartões, anúncios, impulsionamentos", padrao: 100 },
  { chave: "outros", rotulo: "Outros", dica: "EPIs, uniforme, cursos (NR-10), etc.", padrao: 100 },
] as const;

type ChaveCusto = (typeof CUSTOS)[number]["chave"];

function num(v: string) {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function CampoNumero({
  rotulo,
  dica,
  valor,
  aoMudar,
  prefixo,
  sufixo,
}: {
  rotulo: string;
  dica?: string;
  valor: string;
  aoMudar: (v: string) => void;
  prefixo?: string;
  sufixo?: string;
}) {
  return (
    <Campo rotulo={rotulo} ajuda={dica}>
      <div className="relative">
        {prefixo && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">{prefixo}</span>}
        <input
          inputMode="decimal"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          className={`input ${prefixo ? "pl-10" : ""} ${sufixo ? "pr-14" : ""}`}
        />
        {sufixo && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">{sufixo}</span>}
      </div>
    </Campo>
  );
}

export function CalculadoraPrecos({ valorHoraSalvo }: { valorHoraSalvo: number | null }) {
  const [custos, setCustos] = useState<Record<ChaveCusto, string>>(
    () => Object.fromEntries(CUSTOS.map((c) => [c.chave, String(c.padrao)])) as Record<ChaveCusto, string>,
  );
  const [proLabore, setProLabore] = useState("4000");
  const [dias, setDias] = useState("22");
  const [horasDia, setHorasDia] = useState("8");
  const [faturavel, setFaturavel] = useState("60");
  const [reserva, setReserva] = useState("15");
  const [salvo, setSalvo] = useState(false);
  const [salvando, iniciar] = useTransition();

  const totalCustos = CUSTOS.reduce((a, c) => a + num(custos[c.chave]), 0);
  const horasFaturaveis = num(dias) * num(horasDia) * (num(faturavel) / 100);
  const necessidade = (totalCustos + num(proLabore)) * (1 + num(reserva) / 100);
  const valorHora = horasFaturaveis > 0 ? necessidade / horasFaturaveis : 0;

  // Simulador
  const [usarSalvo, setUsarSalvo] = useState(valorHoraSalvo !== null);
  const horaSimulador = usarSalvo && valorHoraSalvo ? valorHoraSalvo : valorHora;
  const [horas, setHoras] = useState("2");
  const [deslocamento, setDeslocamento] = useState("30");
  const [materiais, setMateriais] = useState("0");
  const [margemMaterial, setMargemMaterial] = useState("15");
  const [visitaMinima, setVisitaMinima] = useState("120");

  const maoDeObra = Math.max(num(visitaMinima), num(horas) * horaSimulador);
  const materialCobrado = num(materiais) * (1 + num(margemMaterial) / 100);
  const precoFinal = maoDeObra + num(deslocamento) + materialCobrado;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card space-y-4 p-4 md:p-5">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock className="size-4 text-accent" /> Quanto vale sua hora
            <Ajuda titulo="Quanto vale sua hora">
              <p>O mínimo que você precisa cobrar por hora para pagar as contas e ainda sobrar.</p>
            </Ajuda>
          </h2>
        </div>

        <details className="group rounded-2xl border border-border p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Custos fixos por mês
            <span className="flex items-center gap-1 font-normal text-muted">
              {reais(totalCustos)} <ChevronDown className="size-4 transition group-open:rotate-180" />
            </span>
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {CUSTOS.map((c) => (
              <CampoNumero
                key={c.chave}
                rotulo={c.rotulo}
                dica={c.dica}
                prefixo="R$"
                valor={custos[c.chave]}
                aoMudar={(v) => setCustos((s) => ({ ...s, [c.chave]: v }))}
              />
            ))}
          </div>
        </details>

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoNumero rotulo="Pró-labore (mês)" dica="Seu “salário” limpo" prefixo="R$" valor={proLabore} aoMudar={setProLabore} />
          <CampoNumero rotulo="Reserva / margem" dica="Para meses fracos, férias e imprevistos" sufixo="%" valor={reserva} aoMudar={setReserva} />
          <CampoNumero rotulo="Dias trabalhados por mês" valor={dias} aoMudar={setDias} />
          <CampoNumero rotulo="Horas por dia" valor={horasDia} aoMudar={setHorasDia} />
          <CampoNumero
            rotulo="Tempo realmente cobrado"
            dica="Descontando deslocamento, orçamento, compra de material. 50–70% é comum."
            sufixo="%"
            valor={faturavel}
            aoMudar={setFaturavel}
          />
        </div>

        <div className="rounded-2xl bg-accent-soft p-4">
          <p className="text-sm text-muted">Sua hora técnica deve ser no mínimo</p>
          <p className="text-3xl font-bold tracking-tight">{reais(valorHora)}</p>
          <p className="mt-1 text-xs text-muted">
            {reais(necessidade)} por mês ÷ {Math.round(horasFaturaveis)} horas cobradas
          </p>
          <button
            className="btn btn-primary mt-3 w-full sm:w-auto"
            disabled={salvando || valorHora <= 0}
            onClick={() =>
              iniciar(async () => {
                await salvarValorHora(valorHora);
                setSalvo(true);
                setUsarSalvo(false);
              })
            }
          >
            {salvando ? <Loader2 className="size-4 animate-spin" /> : salvo ? <Check className="size-4" /> : <Save className="size-4" />}
            {salvo ? "Salvo no seu perfil" : "Salvar no meu perfil"}
          </button>
          {valorHoraSalvo !== null && !salvo && (
            <p className="mt-2 text-xs text-muted">Valor salvo atualmente: {reais(valorHoraSalvo)}/h</p>
          )}
        </div>
      </section>

      <section className="card h-fit space-y-4 p-4 md:p-5">
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><Wrench className="size-4 text-accent" /> Simular preço de um serviço</h2>
        </div>

        {valorHoraSalvo !== null && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={usarSalvo} onChange={(e) => setUsarSalvo(e.target.checked)} className="size-4 accent-[var(--accent)]" />
            Usar minha hora salva ({reais(valorHoraSalvo)})
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoNumero rotulo="Horas do serviço" dica="Inclua tempo de teste e limpeza" valor={horas} aoMudar={setHoras} sufixo="h" />
          <CampoNumero rotulo="Visita mínima" dica="Nenhum serviço sai por menos que isso" prefixo="R$" valor={visitaMinima} aoMudar={setVisitaMinima} />
          <CampoNumero rotulo="Deslocamento" prefixo="R$" valor={deslocamento} aoMudar={setDeslocamento} />
          <CampoNumero rotulo="Materiais (custo)" dica="Se você compra o material" prefixo="R$" valor={materiais} aoMudar={setMateriais} />
          <CampoNumero rotulo="Margem sobre material" dica="Cobre tempo de compra e garantia" sufixo="%" valor={margemMaterial} aoMudar={setMargemMaterial} />
        </div>

        <dl className="space-y-1.5 rounded-2xl bg-surface-2 p-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Mão de obra</dt><dd>{reais(maoDeObra)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Deslocamento</dt><dd>{reais(num(deslocamento))}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Material</dt><dd>{reais(materialCobrado)}</dd></div>
          <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
            <dt className="flex items-center gap-1">
              Preço sugerido
              <Ajuda titulo="Como apresentar o preço">
                <p>Apresente o valor com segurança e explique o que está incluso (material de qualidade, teste, garantia). Evite dar desconto logo de cara. Ofereça parcelamento.</p>
              </Ajuda>
            </dt>
            <dd>{reais(precoFinal)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
