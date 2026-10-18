import type { AnaliseQuadro } from "@/lib/eletrica/calculo";
import { AVISO_ALTURAS, listaDePontos } from "@/lib/eletrica/pontos";
import type { QuadroDados } from "@/lib/eletrica/tipos";

const n = (v: number) => v.toLocaleString("pt-BR");

export function Materiais({ itens }: { itens: { descricao: string; unidade: string; quantidade: number }[] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {itens.map((m) => (
          <tr key={m.descricao} className="border-b border-border/60">
            <td className="py-1 pr-2">{m.descricao}</td>
            <td className="whitespace-nowrap py-1 text-right">
              {n(m.quantidade)} {m.unidade}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Versão de impressão (sem controles). */
export function ListaPontosImpressao({ dados, analise }: { dados: QuadroDados; analise: AnaliseQuadro }) {
  const lista = listaDePontos(dados, analise);
  const feitos = new Set(dados.pontos?.feitos ?? []);
  return (
    <div className="space-y-4 text-sm">
      <p>
        <b>Totais:</b> {lista.totais.pontosLuz} ponto(s) de luz · {lista.totais.interruptores} interruptor(es) · {lista.totais.tug} TUG ·{" "}
        {lista.totais.tue} TUE
      </p>
      <p className="text-xs">{AVISO_ALTURAS}</p>
      {lista.ambientes.map((a) => (
        <section key={a.chave} className="break-inside-avoid space-y-1">
          <h3 className="border-b border-black font-bold">
            {a.nome}
            <span className="font-normal">
              {a.areaM2 ? ` — ${n(a.areaM2)} m²` : ""}
              {a.perimetroM ? `, ${n(a.perimetroM)} m` : ""}
            </span>
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left">
                <th className="py-1">Ponto</th>
                <th className="text-right">Qtd</th>
                <th className="text-right">Pot.</th>
                <th className="pl-2">Altura</th>
                <th className="pl-2">Circuito / disjuntor</th>
              </tr>
            </thead>
            <tbody>
              {a.pontos.map((p) => (
                <tr key={p.chave} className="border-t border-gray-300 align-top">
                  <td className="py-1 pr-2">{p.descricao}</td>
                  <td className="text-right">{p.quantidade}</td>
                  <td className="whitespace-nowrap text-right">{p.potencia ? `${n(p.potencia)} ${p.tipo === "tue" ? "W" : "VA"}` : "—"}</td>
                  <td className="pl-2">{p.altura}</td>
                  <td className="pl-2">{p.circuito ? `${p.circuito.numero} · ${p.circuito.disjuntor}${p.circuito.dr ? " · DR" : ""}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {a.avisos.map((t, i) => (
            <p key={i} className="text-xs">⚠ {t}</p>
          ))}
          <p className="text-xs">
            <b>Material:</b> {a.materiais.map((m) => `${n(m.quantidade)} ${m.unidade} ${m.descricao}`).join("; ")}
          </p>
          <p className="text-xs">
            <b>Checklist:</b> {a.checklist.map((c) => `${feitos.has(c.id) ? "☑" : "☐"} ${c.texto}`).join("  ")}
          </p>
        </section>
      ))}
      <section className="break-inside-avoid">
        <h3 className="border-b border-black font-bold">Material total (pontos)</h3>
        <Materiais itens={lista.materiais} />
      </section>
    </div>
  );
}
