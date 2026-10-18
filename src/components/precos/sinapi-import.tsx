"use client";

import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { importarSinapiLote } from "@/app/(app)/catalogo/actions";
import { Sk } from "@/components/skeleton";
import {
  type HorasComposicao,
  interpretarAba,
  type LinhaSinapi,
  type Regime,
  referenciaDoArquivo,
} from "@/lib/precos/sinapi";

type Planilha = { nome: string; dados: ArrayBuffer };

/** Converte o valor de uma célula do exceljs em texto/número simples. */
function valorCelula(v: unknown): unknown {
  if (v == null || typeof v !== "object") return v;
  if (v instanceof Date) return v.toISOString();
  const o = v as { result?: unknown; text?: unknown; richText?: { text: string }[] };
  if ("result" in o) return o.result;
  if (o.richText) return o.richText.map((r) => r.text).join("");
  if ("text" in o) return o.text;
  return String(v);
}

async function extrairPlanilhas(arquivos: File[]): Promise<Planilha[]> {
  const saida: Planilha[] = [];
  for (const f of arquivos) {
    const buf = await f.arrayBuffer();
    if (/\.zip$/i.test(f.name)) {
      const { unzipSync } = await import("fflate");
      const conteudo = unzipSync(new Uint8Array(buf), { filter: (a) => /\.xlsx$/i.test(a.name) });
      for (const [nome, bytes] of Object.entries(conteudo)) {
        saida.push({ nome: nome.split("/").pop() ?? nome, dados: bytes.slice().buffer });
      }
    } else if (/\.xlsx$/i.test(f.name)) {
      saida.push({ nome: f.name, dados: buf });
    }
  }
  return saida;
}

export function ImportarSinapi({ uf, referencia, totalImportado }: { uf: string; referencia: string; totalImportado: number }) {
  const [progresso, setProgresso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function importar(arquivos: File[]) {
    setErro(null);
    setOk(null);
    try {
      setProgresso("Abrindo arquivos…");
      const planilhas = await extrairPlanilhas(arquivos);
      if (!planilhas.length) throw new Error("Envie o arquivo .xlsx ou .zip do SINAPI.");
      const ExcelJS = (await import("exceljs")).default;

      const porRegime = new Map<Regime, LinhaSinapi[]>();
      const horas: HorasComposicao = {};
      let ref = "";
      for (const p of planilhas) {
        setProgresso(`Lendo ${p.nome}…`);
        ref ||= referenciaDoArquivo(p.nome);
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(p.dados);
        for (const ws of wb.worksheets) {
          const linhas: unknown[][] = [];
          ws.eachRow({ includeEmpty: false }, (row) => {
            const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
            linhas.push(vals.map(valorCelula));
          });
          const r = interpretarAba({ arquivo: p.nome, aba: ws.name, linhas, uf });
          if (r.tipo === "analitico") {
            for (const [cod, h] of Object.entries(r.horas)) {
              const t = (horas[cod] ??= { eletricista: 0, ajudante: 0 });
              t.eletricista = Math.max(t.eletricista, h.eletricista);
              t.ajudante = Math.max(t.ajudante, h.ajudante);
            }
          } else if (r.itens.length) {
            porRegime.set(r.regime, [...(porRegime.get(r.regime) ?? []), ...r.itens]);
          }
        }
      }

      const total = [...porRegime.values()].reduce((s, l) => s + l.length, 0);
      if (!total && !Object.keys(horas).length) {
        throw new Error("Não encontrei itens do SINAPI nesse arquivo. Confira se é a planilha de preços/custos de referência.");
      }
      let enviados = 0;
      for (const [regime, itens] of porRegime) {
        for (let i = 0; i < itens.length; i += 1000) {
          const lote = itens.slice(i, i + 1000).map((x) => ({ ...x, descricao: x.descricao.slice(0, 1000) }));
          const e = await importarSinapiLote({ regime, uf, referencia: ref, itens: lote });
          if (e) throw new Error(e);
          enviados += lote.length;
          setProgresso(`Salvando… ${enviados} de ${total}`);
        }
      }
      const codigos = Object.keys(horas);
      for (let i = 0; i < codigos.length; i += 1000) {
        const parte = Object.fromEntries(codigos.slice(i, i + 1000).map((c) => [c, horas[c]]));
        await importarSinapiLote({ regime: "nao_desonerado", uf, referencia: ref, itens: [], horas: parte });
      }
      setOk(
        `Importado: ${total} itens${codigos.length ? ` e horas de ${codigos.length} composições` : ""}${ref ? ` (referência ${ref})` : ""}. Agora associe os itens do catálogo ou use “Reaplicar SINAPI”.`,
      );
    } catch (e) {
      console.error(e);
      setErro(e instanceof Error ? e.message : "Erro ao importar o SINAPI.");
    } finally {
      setProgresso(null);
    }
  }

  return (
    <section className="card space-y-3 p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <FileSpreadsheet className="size-4" /> Tabela SINAPI ({uf})
      </h2>
      <p className="text-sm text-muted">
        {totalImportado > 0
          ? `${totalImportado} itens importados${referencia ? `, referência ${referencia}` : ""}.`
          : "Nenhuma tabela importada ainda."}
      </p>
      <details className="text-sm text-muted">
        <summary className="cursor-pointer font-medium text-fg">Onde baixar</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            No site da Caixa (caixa.gov.br), vá em <strong>Poder Público → SINAPI → Referências de preços e custos</strong>.
          </li>
          <li>
            Baixe o arquivo do mês mais recente para o <strong>Pará (PA)</strong> — de preferência no notebook. Se vier em
            .zip, pode enviar o .zip direto.
          </li>
          <li>Envie aqui. A leitura é feita no seu aparelho e só os dados vão para o banco.</li>
        </ol>
        <p className="mt-2 text-xs">
          Dica: inclua também a planilha “analítica” de composições para o app sugerir o tempo (horas) dos serviços.
        </p>
      </details>
      <label className={`btn btn-secondary w-full cursor-pointer ${progresso ? "pointer-events-none opacity-60" : ""}`}>
        <FileSpreadsheet className="size-4" /> Enviar arquivo SINAPI (.xlsx ou .zip)
        <input
          type="file"
          multiple
          accept=".xlsx,.zip,application/zip,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => {
            const arquivos = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (arquivos.length) importar(arquivos);
          }}
        />
      </label>
      {progresso && (
        <div className="space-y-2">
          <Sk className="h-3 w-full" />
          <p className="text-xs text-muted">{progresso}</p>
        </div>
      )}
      {erro && <p className="text-sm text-danger">{erro}</p>}
      {ok && <p className="text-sm text-ok">{ok}</p>}
    </section>
  );
}
