import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import { concessionaria, orientacaoAterramento } from "@/lib/eletrica/concessionarias";
import { calcularDemanda, type Demanda } from "@/lib/eletrica/projeto";
import { LOCAIS, type QuadroDados, TIPOS_CIRCUITO } from "@/lib/eletrica/tipos";
import { peca } from "@/lib/eletrica/pecas";

const n = (v: number, d = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });

const CATEGORIA = { monofasico: "Monofásico", bifasico: "Bifásico", trifasico: "Trifásico" } as const;

/** Demanda calculada a partir dos circuitos do quadro (gerado ou montado à mão). */
export function demandaDoQuadro(q: QuadroDados): Demanda {
  return calcularDemanda(
    q.circuitos,
    {
      tensaoFN: q.alimentacao.tensaoFN,
      // Em quadro monofásico a tensão F-F não é usada; estima a da rede para a categoria sugerida.
      tensaoFF:
        q.alimentacao.tipo === "monofasico"
          ? Math.round(q.alimentacao.tensaoFN * Math.sqrt(3))
          : q.alimentacao.tensaoFF,
    },
    q.projeto?.obra ?? {},
  );
}

export function BlocoDemanda({ dados, demanda }: { dados: QuadroDados; demanda: Demanda }) {
  const conc = dados.projeto ? concessionaria(dados.projeto.obra.concessionaria) : null;
  const atual = dados.alimentacao.tipo;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Item r="Carga instalada" v={`${n(demanda.cargaInstaladaW / 1000, 2)} kW`} />
        <Item r="Demanda estimada" v={`${n(demanda.demandaKVA, 2)} kVA`} />
        <Item r="Categoria sugerida" v={CATEGORIA[demanda.categoria]} />
        <Item r="Disjuntor geral (ref.)" v={demanda.disjuntorGeralA ? `${demanda.disjuntorGeralA} A` : "—"} />
      </div>
      <table className="w-full text-sm">
        <tbody className="[&_td]:py-1">
          <tr>
            <td className="text-muted">Iluminação + tomadas (TUG)</td>
            <td className="text-right">
              {n(demanda.iluminacaoTugW / 1000, 2)} kW × {n(demanda.fdIluminacaoTug, 2)}
            </td>
          </tr>
          <tr>
            <td className="text-muted">Aparelhos (TUE)</td>
            <td className="text-right">
              {n(demanda.aparelhosW / 1000, 2)} kW × {n(demanda.fdAparelhos, 2)}
            </td>
          </tr>
          <tr>
            <td className="text-muted">Ar-condicionado</td>
            <td className="text-right">{n(demanda.arW / 1000, 2)} kW × 1</td>
          </tr>
          <tr>
            <td className="text-muted">Corrente de demanda por fase</td>
            <td className="text-right">{n(demanda.correnteA)} A</td>
          </tr>
          <tr>
            <td className="text-muted">Seção mínima do alimentador do QDC (B1, 30 °C)</td>
            <td className="text-right">{demanda.secaoEntradaMm2 ? `${n(demanda.secaoEntradaMm2)} mm²` : "—"}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-sm">
        <b>Por quê:</b> {demanda.motivoCategoria}
        {atual !== demanda.categoria && (
          <span className="text-warn"> O quadro está configurado como {CATEGORIA[atual].toLowerCase()}.</span>
        )}
      </p>
      {conc && (
        <p className="text-sm">
          <b>Concessionária:</b> {conc.nome} — {conc.norma}
          {conc.normaConferir && <span className="text-warn"> (conferir nome/revisão da norma)</span>}
          {conc.tensaoConferir && <span className="text-warn"> · tensão {conc.tensoes.join(" ou ")} V a conferir com a concessionária</span>}
        </p>
      )}
      <ul className="space-y-1 text-xs text-muted">
        {demanda.alertas.map((a, i) => (
          <li key={i} className={a.nivel === "erro" ? "text-danger" : a.nivel === "aviso" ? "text-warn" : ""}>
            • {a.mensagem}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ListaSeguranca({ dados }: { dados: QuadroDados }) {
  const conc = concessionaria(dados.projeto?.obra.concessionaria ?? "outra");
  const comps = dados.componentes.map((c) => peca(c.pecaId)).filter(Boolean);
  const nDR = comps.filter((p) => p!.tipo === "dr").length;
  const dps = comps.find((p) => p!.tipo === "dps");
  const itens = [
    ...orientacaoAterramento(conc, dados.alimentacao.esquema),
    nDR
      ? `${nDR} DR de 30 mA protegendo os circuitos — obrigatório em banheiros, cozinhas, áreas de serviço/lavanderias, garagens, áreas externas e tomadas que alimentam equipamentos externos (NBR 5410 5.1.3.2.2). Teste mensal no botão "T".`
      : "Nenhum DR no quadro: verifique a NBR 5410 5.1.3.2.2 — áreas molhadas e externas exigem DR de 30 mA.",
    dps
      ? `DPS classe II (Uc ${dps.ucV} V) entre cada fase e o PE${dados.alimentacao.esquema === "TN-C-S" ? "" : " e entre neutro e PE"}, com condutores curtos (≤ 0,5 m de ligação total, conferir NBR 5410 6.3.5).`
      : "Sem DPS: recomendado em toda instalação e exigido com entrada aérea (NBR 5410 5.4.2.1 — conferir).",
    "Disjuntor geral seccionando todas as fases; identificar cada circuito no quadro e manter o diagrama dentro da porta.",
    "Execução conforme NR-10: desenergizar, bloquear e sinalizar, testar ausência de tensão, aterrar temporariamente quando aplicável e usar EPI/EPC adequados.",
    "Testes antes de energizar: continuidade do PE, resistência de isolamento (megômetro), polaridade, funcionamento dos DRs e medição da resistência de aterramento.",
  ];
  return (
    <ul className="space-y-2 text-sm">
      {itens.map((t, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** Quadro de cargas completo (tela e impressão). */
export function TabelaCargas({ dados, analise }: { dados: QuadroDados; analise: AnaliseQuadro }) {
  const etiquetaDR = new Map(
    dados.componentes
      .filter((c) => peca(c.pecaId)?.tipo === "dr")
      .map((c, i) => [c.id, c.etiqueta || `DR ${i + 1}`]),
  );
  const drGeral = dados.componentes.find((c) => c.geral && peca(c.pecaId)?.tipo === "dr");
  if (analise.circuitos.length === 0) return <p className="text-sm text-muted">Sem circuitos ainda.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="py-2 pr-2">#</th>
            <th className="pr-2">Circuito</th>
            <th className="pr-2">Tipo</th>
            <th className="pr-2" title="Local usado para a exigência de DR">Local (DR)</th>
            <th className="pr-2 text-right">Pot. (W)</th>
            <th className="pr-2 text-right">V</th>
            <th className="pr-2">Fases</th>
            <th className="pr-2 text-right">Ib (A)</th>
            <th className="pr-2 text-right">Seção</th>
            <th className="pr-2">Disj.</th>
            <th className="pr-2">DR</th>
            <th className="text-right">ΔV%</th>
          </tr>
        </thead>
        <tbody>
          {analise.circuitos.map((r, i) => {
            const dr = r.circuito.drId ? etiquetaDR.get(r.circuito.drId) : drGeral ? "Geral" : null;
            return (
              <tr key={r.circuito.id} className="border-b border-border/60 align-top">
                <td className="py-1.5 pr-2 font-semibold">{i + 1}</td>
                <td className="pr-2">{r.circuito.nome}</td>
                <td className="pr-2">{TIPOS_CIRCUITO[r.circuito.tipo].split(" ")[0]}</td>
                <td className="pr-2">{LOCAIS[r.circuito.local].nome}</td>
                <td className="pr-2 text-right">{n(r.circuito.potenciaW, 0)}</td>
                <td className="pr-2 text-right">{r.tensaoV}</td>
                <td className="pr-2">{r.fases.join("+") || "—"}</td>
                <td className="pr-2 text-right">{n(r.dim.ib)}</td>
                <td className="whitespace-nowrap pr-2 text-right">{r.dim.secao ? `${n(r.dim.secao)} mm²` : "—"}</td>
                <td className="pr-2">{r.pecaDisjuntor ? `${r.pecaDisjuntor.rotulo} ${r.pecaDisjuntor.polos}P` : "—"}</td>
                <td className="pr-2">{dr ?? (r.exigeDR ? "Falta" : "—")}</td>
                <td className="text-right">{n(r.dim.quedaPct, 2)}</td>
              </tr>
            );
          })}
          <tr className="font-semibold">
            <td />
            <td className="py-2">Total instalado</td>
            <td colSpan={2} />
            <td className="text-right">{n(analise.potenciaTotalW, 0)}</td>
            <td colSpan={7} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Item({ r, v }: { r: string; v: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3 print:border print:border-border print:bg-white">
      <p className="text-xs text-muted">{r}</p>
      <p className="font-bold">{v}</p>
    </div>
  );
}

/** Texto do projeto para a IA escrever o memorial. */
export function descreverObra(dados: QuadroDados, demanda: Demanda) {
  const p = dados.projeto;
  const linhas: string[] = [];
  if (p) {
    const c = concessionaria(p.obra.concessionaria);
    linhas.push(
      `Obra: ${p.obra.tipoImovel}; concessionária ${c.nome} (${c.norma}); rede ${p.obra.tensoes} V; esquema ${p.obra.esquema}; padrão existente: ${p.obra.fornecimentoExistente}${p.obra.disjuntorExistenteA ? ` ${p.obra.disjuntorExistenteA} A` : ""}; entrada ${p.obra.entradaAerea ? "aérea" : "subterrânea"}.`,
      `Ambientes: ${p.ambientes.map((a) => `${a.nome} (${a.areaM2} m², ${a.perimetroM || "?"} m)`).join("; ")}.`,
      `Cargas específicas: ${p.cargas.map((x) => `${x.quantidade}× ${x.nome} ${x.potenciaW} W ${x.tensaoV} V`).join("; ") || "nenhuma"}.`,
    );
    if (p.obra.observacoes) linhas.push(`Observações: ${p.obra.observacoes}`);
  } else {
    linhas.push("Quadro montado manualmente (sem dados de ambientes/concessionária).");
  }
  linhas.push(
    `Demanda estimada pelo app: carga instalada ${n(demanda.cargaInstaladaW / 1000, 2)} kW, demanda ${n(demanda.demandaKVA, 2)} kVA, categoria sugerida ${demanda.categoria}, corrente ${n(demanda.correnteA)} A, disjuntor geral de referência ${demanda.disjuntorGeralA ?? "?"} A (fatores genéricos — conferir na norma da concessionária).`,
  );
  return linhas.join("\n");
}
