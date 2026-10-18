import { Zap } from "lucide-react";
import { TextoIA } from "@/components/texto-ia";
import type { AnaliseQuadro, ItemMaterial } from "@/lib/eletrica/calculo";
import { concessionaria } from "@/lib/eletrica/concessionarias";
import {
  gerarChecklist,
  type ItemInspecao,
  resultadoItem,
  resumirInspecao,
  textoLimite,
} from "@/lib/eletrica/inspecao";
import { gerarChecklistManutencao, resultadoManutencao, resumirVisita, tendencia, textoLimiteItem } from "@/lib/eletrica/manutencao";
import type { Inspecao, QuadroDados, Visita } from "@/lib/eletrica/tipos";
import { FotosLocais } from "./impressao-cliente";
import type { ClienteResumo, PerfilResumo } from "./laudo-art";
import type { Instrumento } from "./painel-inspecao";


const dataBR = (d: string) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString("pt-BR") : "—");

/** Cabeçalho com dados do eletricista, cliente e quadro. */
export function CabecalhoDoc({
  titulo,
  subtitulo,
  perfil,
  cliente,
  nome,
  dados,
  data,
}: {
  titulo: string;
  subtitulo?: string;
  perfil: PerfilResumo;
  cliente: ClienteResumo;
  nome: string;
  dados: QuadroDados;
  data: string;
}) {
  const a = dados.alimentacao;
  const conc = dados.projeto ? concessionaria(dados.projeto.obra.concessionaria) : null;
  return (
    <header className="break-inside-avoid border-b-2 border-black pb-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl border-2 border-black">
            <Zap className="size-6" strokeWidth={2.5} />
          </span>
          <div className="text-sm leading-tight">
            <p className="text-base font-bold">{perfil.empresa || perfil.nome || "Eletricista"}</p>
            {perfil.empresa && perfil.nome && <p>{perfil.nome}</p>}
            <p>{[perfil.telefone, perfil.email].filter(Boolean).join(" · ")}</p>
            {perfil.registroProfissional && <p>{perfil.registroProfissional}</p>}
          </div>
        </div>
        <div className="text-right text-sm leading-tight">
          <p className="text-lg font-bold">{titulo}</p>
          {subtitulo && <p>{subtitulo}</p>}
          <p>{data}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <p>
          <b>Cliente:</b> {cliente?.nome ?? "—"}
        </p>
        <p>
          <b>Quadro:</b> {nome}
        </p>
        {cliente && (cliente.endereco || cliente.cidade) && (
          <p>
            <b>Endereço:</b> {[cliente.endereco, cliente.bairro, cliente.cidade].filter(Boolean).join(", ")}
          </p>
        )}
        <p>
          <b>Alimentação:</b> {a.tipo} {a.tensaoFN}/{a.tensaoFF} V · {a.esquema}
        </p>
        {conc && (
          <p>
            <b>Concessionária:</b> {conc.nome}
          </p>
        )}
        {dados.art?.numero && (
          <p>
            <b>{dados.art.tipo}:</b> nº {dados.art.numero}
            {dados.art.dataEmissao ? ` de ${dataBR(dados.art.dataEmissao)}` : ""}
          </p>
        )}
      </div>
    </header>
  );
}

export function Secao({ titulo, children, quebra }: { titulo: string; children: React.ReactNode; quebra?: boolean }) {
  return (
    <section className={`mt-6 ${quebra ? "break-before-page" : ""}`}>
      <h2 className="mb-2 border-b border-black pb-1 text-base font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

export function TabelaMateriais({ itens }: { itens: ItemMaterial[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {itens.map((i) => (
          <tr key={i.descricao} className="border-b border-border">
            <td className="py-1 pr-2">{i.descricao}</td>
            <td className="whitespace-nowrap py-1 text-right font-semibold">
              {i.quantidade} {i.unidade}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RodapeDoc({ extra }: { extra?: string }) {
  return (
    <footer className="mt-8 break-inside-avoid border-t border-black pt-2 text-[10px] leading-snug">
      Documento gerado pelo app Eletric como apoio técnico. Confira as normas vigentes (ABNT NBR 5410, NR-10) e a norma de
      fornecimento da concessionária. Projetos, laudos e serviços que exigem responsável técnico devem ser assinados por
      profissional legalmente habilitado, com ART (CREA) ou TRT (CFT/CRT) quando aplicável.
      {extra ? ` ${extra}` : ""}
    </footer>
  );
}

export function Assinaturas({ campos }: { campos: string[] }) {
  return (
    <div className="mt-10 grid break-inside-avoid gap-10 sm:grid-cols-2">
      {campos.map((c) => (
        <div key={c} className="text-center text-sm">
          <div className="mb-1 border-b border-black pt-10" />
          {c}
        </div>
      ))}
    </div>
  );
}

const ROTULO_RES = { ok: "OK", nc: "NÃO CONFORME", na: "N/A", pendente: "—" } as const;

export function TabelaInspecao({ itens, insp }: { itens: ItemInspecao[]; insp: Inspecao }) {
  const mapa = new Map(insp.respostas.map((r) => [r.itemId, r]));
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="border-b-2 border-black text-left">
          <th className="py-1 pr-2">Item</th>
          <th className="pr-2">Medição</th>
          <th className="pr-2">Limite</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        {itens.map((it) => {
          const r = mapa.get(it.id);
          const res = resultadoItem(it, r);
          return (
            <tr key={it.id} className="break-inside-avoid border-b border-border align-top">
              <td className="py-1 pr-2">
                {it.titulo}
                <span className="block text-[10px] text-muted">{it.referencia}</span>
                {r?.obs && <span className="block italic">Obs.: {r.obs}</span>}
              </td>
              <td className="whitespace-nowrap pr-2">
                {it.medicao && r?.valor !== null && r?.valor !== undefined ? `${r.valor.toLocaleString("pt-BR")} ${it.medicao.unidade}` : ""}
                {it.medicao?.segunda && r?.valor2 !== null && r?.valor2 !== undefined
                  ? ` / ${r.valor2.toLocaleString("pt-BR")} ${it.medicao.segunda.unidade}`
                  : ""}
              </td>
              <td className="whitespace-nowrap pr-2">{it.medicao ? textoLimite(it.medicao.limite, it.medicao.unidade) : ""}</td>
              <td className={`whitespace-nowrap font-bold ${res === "nc" ? "text-danger" : ""}`}>{ROTULO_RES[res]}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ListaInstrumentos({ ids, instrumentos }: { ids: string[]; instrumentos: Instrumento[] }) {
  const usados = instrumentos.filter((i) => ids.includes(String(i.id)));
  if (!usados.length) return <p className="text-sm">Instrumentos não informados.</p>;
  return (
    <ul className="list-disc pl-5 text-sm">
      {usados.map((i) => (
        <li key={i.id}>
          {i.nome} {[i.marca, i.modelo].filter(Boolean).join(" ")}
          {i.numeroSerie ? ` — nº de série ${i.numeroSerie}` : ""}
          {i.proximaVerificacao ? ` — calibração válida até ${dataBR(i.proximaVerificacao)}` : ""}
        </li>
      ))}
    </ul>
  );
}

/** Relatório de inspeção (NBR 5410 seção 7). */
export function RelatorioInspecao({ id, dados, insp, instrumentos }: { id: number; dados: QuadroDados; insp: Inspecao; instrumentos: Instrumento[] }) {
  const itens = gerarChecklist(dados);
  const r = resumirInspecao(itens, insp);
  return (
    <>
      <Secao titulo="Dados da inspeção">
        <p className="text-sm">
          Data: {dataBR(insp.data)} · Responsável: {insp.responsavel || "—"} · Tensão de ensaio de isolamento: {insp.tensaoEnsaioV} V cc
        </p>
        <p className="mt-1 text-sm font-semibold">Instrumentos:</p>
        <ListaInstrumentos ids={insp.instrumentos} instrumentos={instrumentos} />
      </Secao>
      <Secao titulo="Resultado geral">
        <p className="text-lg font-bold">
          {r.resultado === "aprovado" ? "APROVADO" : r.resultado === "pendencias" ? "COM PENDÊNCIAS" : "INSPEÇÃO INCOMPLETA"}
        </p>
        <p className="text-sm">
          {r.ok} conforme(s) · {r.nc} não conforme(s) · {r.na} N/A · {r.pendentes} não verificado(s)
          {r.desequilibrioPct !== null ? ` · desequilíbrio entre fases ${r.desequilibrioPct.toFixed(0)}%` : ""}
        </p>
      </Secao>
      {r.naoConformes.length > 0 && (
        <Secao titulo="Pendências">
          <ol className="list-decimal pl-5 text-sm">
            {r.naoConformes.map((x) => (
              <li key={x.item.id}>
                {x.item.titulo}
                {x.resposta?.obs ? ` — ${x.resposta.obs}` : ""} <span className="text-muted">({x.item.referencia})</span>
              </li>
            ))}
          </ol>
        </Secao>
      )}
      <Secao titulo="Inspeção visual (NBR 5410 7.2)">
        <TabelaInspecao itens={itens.filter((i) => i.secao === "visual")} insp={insp} />
      </Secao>
      <Secao titulo="Ensaios (NBR 5410 7.3)">
        <TabelaInspecao itens={itens.filter((i) => i.secao === "ensaio")} insp={insp} />
        <p className="mt-1 text-[10px]">Limites marcados como referência devem ser conferidos na edição vigente das normas.</p>
      </Secao>
      {insp.analiseIA && (
        <Secao titulo="Análise e recomendações">
          <TextoIA>{insp.analiseIA}</TextoIA>
        </Secao>
      )}
      <Secao titulo="Fotos">
        <FotosLocais chaves={itens.map((i) => ({ chave: `eletric:foto:${id}:${insp.id}:${i.id}`, legenda: i.titulo }))} />
      </Secao>
    </>
  );
}

const ESTADO = { bom: "BOM", atencao: "ATENÇÃO", critico: "CRÍTICO" } as const;

/** Relatório de manutenção preventiva. */
export function RelatorioManutencao({
  id,
  dados,
  visita,
  proxima,
}: {
  id: number;
  dados: QuadroDados;
  visita: Visita;
  proxima: string;
}) {
  const itens = gerarChecklistManutencao(dados);
  const r = resumirVisita(itens, visita);
  const visitas = dados.manutencao?.visitas ?? [];
  const anterior = visitas[visitas.findIndex((v) => v.id === visita.id) - 1];
  const tend = tendencia(itens, visita, anterior);
  const mapa = new Map(visita.respostas.map((x) => [x.itemId, x]));
  const medidos = itens.filter((i) => i.medicao && mapa.get(i.id)?.valor !== null && mapa.get(i.id)?.valor !== undefined);
  return (
    <>
      <Secao titulo="Resumo executivo">
        <p className="text-lg font-bold">Estado geral: {ESTADO[r.estado]}</p>
        <p className="text-sm">
          {r.ok} item(ns) em ordem · {r.corrigidos.length} corrigido(s) na visita · {r.pendencias.length} pendência(s)
          {r.desequilibrioPct !== null ? ` · desequilíbrio entre fases ${r.desequilibrioPct.toFixed(0)}%` : ""}
        </p>
      </Secao>
      <Secao titulo="Serviços executados">
        <ul className="list-disc pl-5 text-sm">
          {itens
            .filter((i) => ["ok", "corrigido"].includes(resultadoManutencao(i, mapa.get(i.id))))
            .map((i) => (
              <li key={i.id}>
                {i.titulo}
                {resultadoManutencao(i, mapa.get(i.id)) === "corrigido" ? " — corrigido na visita" : ""}
                {mapa.get(i.id)?.obs ? ` (${mapa.get(i.id)!.obs})` : ""}
              </li>
            ))}
          {visita.trocas
            .filter((t) => t.peca)
            .map((t, i) => (
              <li key={`t${i}`}>
                Troca: {t.quantidade}× {t.peca}
              </li>
            ))}
        </ul>
      </Secao>
      {medidos.length > 0 && (
        <Secao titulo="Medições">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="py-1 pr-2">Item</th>
                <th className="pr-2">Medido</th>
                <th className="pr-2">Anterior</th>
                <th>Limite</th>
              </tr>
            </thead>
            <tbody>
              {medidos.map((i) => {
                const t = tend.find((x) => x.item.id === i.id);
                return (
                  <tr key={i.id} className="border-b border-border">
                    <td className="py-1 pr-2">{i.titulo}</td>
                    <td className="pr-2 font-semibold">
                      {mapa.get(i.id)?.valor?.toLocaleString("pt-BR")} {i.medicao?.unidade}
                    </td>
                    <td className="pr-2">
                      {t?.anterior ?? "—"}
                      {t?.delta !== null && t?.delta !== undefined ? ` (${t.delta > 0 ? "+" : ""}${t.delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })})` : ""}
                    </td>
                    <td>{textoLimiteItem(i)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Secao>
      )}
      <Secao titulo="Pendências">
        {r.pendencias.length === 0 ? (
          <p className="text-sm">Nenhuma pendência.</p>
        ) : (
          <ol className="list-decimal pl-5 text-sm">
            {r.pendencias.map((p) => (
              <li key={p.item.id}>
                <b>[{p.item.prioridade === "alta" ? "ALTA" : p.item.prioridade === "media" ? "MÉDIA" : "BAIXA"}]</b> {p.item.titulo}
                {p.resposta?.obs ? ` — ${p.resposta.obs}` : ""}
              </li>
            ))}
          </ol>
        )}
      </Secao>
      {visita.recomendacoes && (
        <Secao titulo="Recomendações">
          <TextoIA>{visita.recomendacoes}</TextoIA>
        </Secao>
      )}
      <Secao titulo="Próxima visita">
        <p className="text-sm">
          {dataBR(proxima)} (periodicidade {dados.manutencao?.periodicidade ?? "—"})
        </p>
      </Secao>
      <Secao titulo="Fotos">
        <FotosLocais chaves={itens.map((i) => ({ chave: `eletric:foto:${id}:${visita.id}:${i.id}`, legenda: i.titulo }))} />
      </Secao>
    </>
  );
}

export function ResumoFases({ analise, fases }: { analise: AnaliseQuadro; fases: ("R" | "S" | "T")[] }) {
  return (
    <p className="text-sm">
      Corrente de projeto por fase: {fases.map((f) => `${f} = ${analise.correntePorFase[f].toLocaleString("pt-BR", { maximumFractionDigits: 1 })} A`).join(" · ")}
      {fases.length > 1 ? ` · desequilíbrio ${analise.desequilibrioPct.toFixed(0)}%` : ""}
    </p>
  );
}
