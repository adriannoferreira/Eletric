import { AlertTriangle, ClipboardList, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { ChecklistCampo } from "@/components/servicos/checklist-campo";
import { Cabecalho } from "@/components/ui";

export const metadata = { title: "Padrão de entrada — Equatorial Pará" };

const TIPOS = [
  { t: "Monofásico", d: "1 fase + neutro. Para cargas menores, sem equipamentos trifásicos ou fase-fase." },
  { t: "Bifásico", d: "2 fases + neutro. Permite chuveiros e ar-condicionado em fase-fase." },
  { t: "Trifásico", d: "3 fases + neutro. Para cargas maiores, motores trifásicos e comércios." },
];

export default function PadraoEntradaPage() {
  return (
    <>
      <Cabecalho titulo="Padrão de entrada" subtitulo="Equatorial Pará — ligação nova e aumento de carga" voltar="/servicos" />

      <div className="mb-4 flex gap-3 rounded-2xl bg-warn-soft p-4 text-sm text-warn">
        <AlertTriangle className="size-5 shrink-0" />
        <p>
          <strong>Conferir na norma vigente da Equatorial.</strong> Limites de carga por categoria, tipo de caixa de medição,
          bitolas, disjuntores, alturas, aterramento e documentos mudam entre edições. Este guia organiza o serviço; os números
          você confere na norma técnica de fornecimento em baixa tensão da Equatorial Pará e nos canais oficiais dela antes de
          comprar material. Não mexa no ramal, no medidor nem na rede: isso é da concessionária.
        </p>
      </div>

      <section className="card mb-4 p-4">
        <h2 className="mb-2 font-semibold">Tipos de fornecimento</h2>
        <ul className="space-y-2 text-sm">
          {TIPOS.map((x) => (
            <li key={x.t}><strong>{x.t}:</strong> {x.d}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">
          A categoria sai da carga instalada/demanda e das faixas da norma da Equatorial (conferir). Tensões de baixa tensão na
          região: confirmar com a concessionária para o endereço (conferir).
        </p>
        <Link href="/quadros" className="btn btn-secondary mt-3 w-full">
          <LayoutGrid className="size-4" /> Calcular carga e demanda no gerador de projeto
        </Link>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChecklistCampo
          id="padrao-ligacao-nova"
          titulo="Ligação nova — passo a passo"
          grupos={[
            {
              titulo: "Antes",
              itens: [
                "Levantar a carga do imóvel e definir a categoria (conferir faixas na norma)",
                "Conferir na norma: tipo de padrão (poste/pontalete/muro), caixa de medição homologada e posição",
                "Conferir distância e travessia do ramal até a rede (afastamentos e alturas da norma)",
                "Combinar com o cliente a documentação para o pedido na Equatorial (conferir lista nos canais oficiais)",
              ],
            },
            {
              titulo: "Montagem",
              itens: [
                "Poste/pontalete prumado e engastado conforme a norma",
                "Caixa de medição na altura e posição da norma, com visor acessível para leitura",
                "Eletroduto e condutores de entrada com a bitola da norma para a categoria",
                "Disjuntor geral do padrão com a corrente da categoria",
                "Haste(s) de aterramento e condutor de aterramento conforme a norma; neutro aterrado no padrão",
                "Conexões apertadas e protegidas contra oxidação (maresia em Salinópolis)",
              ],
            },
            {
              titulo: "Vistoria e ligação",
              itens: [
                "Cliente faz o pedido de ligação/vistoria na Equatorial",
                "Acompanhar a vistoria e corrigir pendências apontadas",
                "Após a ligação: medir tensões no padrão e no quadro e testar DRs",
              ],
            },
          ]}
        />
        <ChecklistCampo
          id="padrao-aumento-carga"
          titulo="Aumento de carga / mudança de categoria"
          grupos={[
            {
              titulo: "Levantamento",
              itens: [
                "Somar a carga atual + nova (ar, chuveiro, forno, carregador de carro, solar)",
                "Recalcular a demanda e verificar a nova categoria na norma",
                "Verificar se o padrão atual comporta (caixa, bitola, disjuntor) ou precisa ser refeito",
              ],
            },
            {
              titulo: "Execução",
              itens: [
                "Cliente solicita o aumento de carga na Equatorial (conferir procedimento atual)",
                "Adequar o padrão conforme a norma",
                "Adequar o quadro interno: disjuntor geral, DR, DPS, novos circuitos",
                "Balancear as fases após a mudança",
              ],
            },
          ]}
        />
      </div>

      <section className="card mt-4 p-4">
        <h2 className="mb-2 font-semibold">Lista de materiais típica (conferir especificação na norma)</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Poste de concreto ou aço / pontalete (conforme o tipo de padrão)</li>
          <li>Caixa de medição homologada pela concessionária (mono, bi ou tri)</li>
          <li>Disjuntor termomagnético geral do padrão</li>
          <li>Eletroduto de entrada, curvas, buchas, arruelas e armação secundária/isolador</li>
          <li>Condutores de entrada (fases e neutro) e condutor de aterramento</li>
          <li>Haste(s) de aterramento cobreada(s), conector e caixa de inspeção</li>
          <li>Cabo de saída até o quadro de distribuição</li>
        </ul>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href="/os/nova?guia=padrao-entrada" className="btn btn-primary"><Plus className="size-4" /> Criar OS</Link>
        <Link href="/servicos/padrao-entrada" className="btn btn-secondary"><ClipboardList className="size-4" /> Ficha do serviço</Link>
      </div>
    </>
  );
}
