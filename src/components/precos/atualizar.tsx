"use client";

import { Bot, RefreshCw, Settings2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { atualizarDesatualizados, atualizarPelosCodigosSinapi, salvarConfig } from "@/app/(app)/catalogo/actions";
import { CartaoSugestao } from "@/app/(app)/catalogo/editor";
import { Sk } from "@/components/skeleton";
import { Campo } from "@/components/ui";
import type { ConfigPrecos, SugestaoPreco } from "@/db";
import { reais } from "@/lib/formato";

export function Sugestoes({
  pendentes,
}: {
  pendentes: { sugestao: SugestaoPreco; nome: string; unidade: string; precoAtual: number; servicoCalculado: boolean }[];
}) {
  return (
    <section>
      <h2 className="mb-2 font-semibold">Sugestões de preço pendentes ({pendentes.length})</h2>
      {pendentes.length === 0 ? (
        <p className="card p-4 text-sm text-muted">Nenhuma sugestão esperando aprovação.</p>
      ) : (
        <div className="space-y-3">
          {pendentes.map((p) => (
            <CartaoSugestao
              key={p.sugestao.id}
              sugestao={p.sugestao}
              servicoCalculado={p.servicoCalculado}
              titulo={`${p.nome} — atual ${reais(p.precoAtual)}/${p.unidade}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function LoteIA({ desatualizados, iaLigada }: { desatualizados: number; iaLigada: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <section className="card space-y-3 p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Bot className="size-4" /> Pesquisar preços desatualizados com IA
      </h2>
      <p className="text-sm text-muted">{desatualizados} item(ns) a atualizar · até 8 por vez</p>
      <button
        disabled={pendente || !iaLigada || desatualizados === 0}
        onClick={() =>
          iniciar(async () => {
            setMsg(null);
            const r = await atualizarDesatualizados();
            setMsg(`${r.pesquisados} pesquisado(s), ${r.sugestoes} sugestão(ões) criada(s)${r.falhas ? `, ${r.falhas} falha(s)` : ""}.`);
          })
        }
        className="btn btn-primary w-full"
      >
        {pendente ? "Pesquisando… (até 3 min)" : "Pesquisar agora"}
      </button>
      {pendente && (
        <div className="space-y-2">
          <Sk className="h-4 w-2/3" />
          <Sk className="h-4 w-1/2" />
          <Sk className="h-4 w-3/5" />
        </div>
      )}
      {msg && <p className="text-sm text-ok">{msg}</p>}
      {!iaLigada && <p className="text-sm text-warn">A IA não está configurada.</p>}
    </section>
  );
}

export function ReaplicarSinapi() {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <section className="card space-y-2 p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <RefreshCw className="size-4" /> Reaplicar SINAPI nos itens associados
      </h2>

      <button
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const n = await atualizarPelosCodigosSinapi();
            setMsg(n ? `${n} item(ns) atualizados com o SINAPI.` : "Nenhum material com código SINAPI ou tabela não importada.");
          })
        }
        className="btn btn-secondary w-full"
      >
        {pendente ? "Atualizando…" : "Reaplicar SINAPI"}
      </button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </section>
  );
}

const fmt = (v: number | null) => (v == null ? "" : String(v).replace(".", ","));

export function ConfigPrecosForm({ config }: { config: ConfigPrecos }) {
  const [estado, acao, pendente] = useActionState(salvarConfig, null);
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 font-semibold">
        <Settings2 className="size-4" /> Configurações de preço
      </h2>
      <form action={acao} className="card grid gap-4 p-4 sm:grid-cols-2">
        <Campo rotulo="Cidade de referência" dica="Usada nas pesquisas com IA">
          <input name="cidade" defaultValue={config.cidade} className="input" />
        </Campo>
        <Campo rotulo="Validade do preço (dias)" dica="Depois disso aparece como desatualizado">
          <input name="validadeDias" inputMode="numeric" defaultValue={config.validadeDias} className="input" />
        </Campo>
        <Campo rotulo="Margem sobre o SINAPI (%)" dica="O SINAPI costuma ficar abaixo do varejo">
          <input name="margemSinapi" inputMode="decimal" defaultValue={fmt(config.margemSinapi)} className="input" />
        </Campo>
        <Campo rotulo="Regime SINAPI">
          <select name="regimeSinapi" defaultValue={config.regimeSinapi} className="input">
            <option value="nao_desonerado">Não desonerado (recomendado para autônomo)</option>
            <option value="desonerado">Desonerado</option>
          </select>
        </Campo>
        <Campo rotulo="Valor/hora do ajudante (R$)" dica="Vazio = metade do seu valor/hora">
          <input name="valorHoraAjudante" inputMode="decimal" defaultValue={fmt(config.valorHoraAjudante)} className="input" />
        </Campo>
        <Campo rotulo="Margem nos serviços calculados (%)" dica="Somada ao custo das horas">
          <input name="margemServico" inputMode="decimal" defaultValue={fmt(config.margemServico)} className="input" />
        </Campo>
        <div className="sm:col-span-2">
          {estado === "ok" && <p className="mb-2 text-sm text-ok">Configurações salvas.</p>}
          {estado && estado !== "ok" && <p className="mb-2 text-sm text-danger">{estado}</p>}
          <button className="btn btn-primary w-full sm:w-auto" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar configurações"}
          </button>
        </div>
      </form>
    </section>
  );
}
