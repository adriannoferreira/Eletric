import { AlertTriangle, Calculator, ClipboardList, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { ChecklistCampo } from "@/components/servicos/checklist-campo";
import { Cabecalho } from "@/components/ui";

export const metadata = { title: "Padrão de entrada — Equatorial Pará" };

const TIPOS = [
  { t: "Monofásico 127 V", d: "1 fase + neutro, até 10 kW de carga instalada; sem motor acima de 3 cv nem aparelho acima de 5 kVA (NT.00001 item 6.2.1.1)." },
  { t: "Bifásico 220/127 V", d: "2 fases + neutro, de 10 a 15 kW; sem motor acima de 5 cv nem aparelho acima de 7 kVA (item 6.2.1.2)." },
  { t: "Trifásico 220/127 V", d: "3 fases + neutro, até 75 kW; obrigatório com qualquer equipamento trifásico (item 6.2.1.3, Notas 6 e 9)." },
];

export default function PadraoEntradaPage() {
  return (
    <>
      <Cabecalho titulo="Padrão de entrada" subtitulo="Equatorial Pará — ligação nova e aumento de carga" voltar="/servicos" />

      <div className="mb-4 flex gap-3 rounded-2xl bg-warn-soft p-4 text-sm text-warn">
        <AlertTriangle className="size-5 shrink-0" />
        <p>
          <strong>Baseado na NT.00001.EQTL rev. 09 (2025) da Equatorial.</strong> Os valores oficiais (Tabela 2, alturas,
          aterramento, documentos) estão em <Link href="/normas" className="underline">Normas Equatorial</Link> e na{" "}
          <Link href="/normas/calculadora" className="underline">calculadora do padrão</Link>. Confira se há revisão mais nova no
          site da Equatorial. Não mexa no ramal, no medidor nem na rede: isso é da concessionária.
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
          O padrão é dimensionado pela carga instalada (Tabela 2 da NT.00001). Acima de 75 kW, média tensão.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Link href="/normas/calculadora" className="btn btn-primary">
            <Calculator className="size-4" /> Calcular o padrão de entrada
          </Link>
          <Link href="/quadros" className="btn btn-secondary">
            <LayoutGrid className="size-4" /> Gerador de projeto
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChecklistCampo
          id="padrao-ligacao-nova"
          titulo="Ligação nova — passo a passo"
          grupos={[
            {
              titulo: "Antes",
              itens: [
                "Levantar a carga do imóvel e definir a categoria pela Tabela 2 (calculadora do padrão)",
                "Medição no limite da via: muro (mín. 2,10 m), parede frontal ou poste auxiliar; caixa homologada a 1,30 m ± 0,10 m",
                "Ramal até 30 m, sem atravessar terceiros, 3,5 m de altura (pedestres) / 5,5 m (veículos), 1,20 m de janelas",
                "Separar documentos do titular, relação de cargas e nº do poste mais próximo para o pedido (item 5.4.3)",
              ],
            },
            {
              titulo: "Montagem",
              itens: [
                "Poste auxiliar prumado: 5 m (engaste 1,10 m) mesmo lado da rede, 7 m (engaste 1,30 m) lado oposto",
                "Caixa de medição a 1,30 m (± 0,10 m) do piso, visor acessível para leitura",
                "Eletroduto de entrada em aço galvanizado com capacete e cabo de cobre 1 kV / 90 °C da Tabela 2",
                "Disjuntor geral da Tabela 2 (nunca maior — é reprovado na vistoria)",
                "Haste aço cobreado Ø 16 × 1.500 mm, conector cunha, condutor de aço cobreado; neutro aterrado na caixa de medição",
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
                "Cliente comunica o aumento de carga à Equatorial antes de ligar as novas cargas (item 5.6)",
                "Adequar o padrão à nova faixa da Tabela 2 (disjuntor, condutores, caixa polifásica)",
                "Adequar o quadro interno: disjuntor geral, DR, DPS, novos circuitos",
                "Balancear as fases após a mudança",
              ],
            },
          ]}
        />
      </div>

      <section className="card mt-4 p-4">
        <h2 className="mb-2 font-semibold">Lista de materiais típica (quantidades exatas na calculadora do padrão)</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Caixa de medição e proteção homologada pela Equatorial (mono ou polifásica; metálica no trifásico a partir de 100 A)</li>
          <li>Disjuntor termomagnético geral pela Tabela 2 da NT.00001</li>
          <li>Eletroduto de entrada de aço galvanizado (2.400 ou 4.000 mm), capacete, curva, luva, bucha e arruela</li>
          <li>Cabo de cobre isolado 1 kV / 90 °C (fase e neutro) pela Tabela 2</li>
          <li>Condutor de aço cobreado (2,5 m) em eletroduto de PVC rígido 1/2&quot; ou 1&quot;, haste Ø 16 × 1.500 mm e conector cunha</li>
          <li>Poste auxiliar de aço (mono/bi) ou concreto, quando a medição não ficar no muro/fachada</li>
          <li>Abraçadeiras tipo D (mín. 3) e terminais pré-isolados tipo ilhós</li>
        </ul>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href="/os/nova?guia=padrao-entrada" className="btn btn-primary"><Plus className="size-4" /> Criar OS</Link>
        <Link href="/servicos/padrao-entrada" className="btn btn-secondary"><ClipboardList className="size-4" /> Ficha do serviço</Link>
      </div>
    </>
  );
}
