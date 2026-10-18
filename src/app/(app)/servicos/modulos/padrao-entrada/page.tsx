import { BookOpen, Calculator, ClipboardList, LayoutGrid, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { ChecklistCampo } from "@/components/servicos/checklist-campo";
import { Ajuda, Detalhes, MenuAcoes, Ref } from "@/components/divulgacao";
import { Cabecalho } from "@/components/ui";

export const metadata = { title: "Padrão de entrada — Equatorial Pará" };

const TIPOS = [
  { t: "Mono 127 V", lim: "até 10 kW", d: "1 fase + neutro; sem motor acima de 3 cv nem aparelho acima de 5 kVA.", item: "6.2.1.1" },
  { t: "Bi 220/127 V", lim: "10 a 15 kW", d: "2 fases + neutro; sem motor acima de 5 cv nem aparelho acima de 7 kVA.", item: "6.2.1.2" },
  { t: "Tri 220/127 V", lim: "até 75 kW", d: "3 fases + neutro; obrigatório com qualquer equipamento trifásico (Notas 6 e 9).", item: "6.2.1.3" },
];

const NT001 = "https://pa.equatorialenergia.com.br/wp-content/uploads/2025/12/NT.00001.EQTL-09-Fornecimento-de-Energia-Eletrica-em-Baixa-Tensao.pdf";

export default function PadraoEntradaPage() {
  return (
    <>
      <Cabecalho
        titulo="Padrão de entrada"
        subtitulo="Equatorial Pará"
        voltar="/servicos"
        acoes={
          <MenuAcoes
            acoes={[
              { rotulo: "Gerador de projeto", icone: <LayoutGrid />, href: "/quadros" },
              { rotulo: "Criar OS", icone: <Plus />, href: "/os/nova?guia=padrao-entrada" },
              { rotulo: "Ficha do serviço", icone: <ClipboardList />, href: "/servicos/padrao-entrada" },
              { rotulo: "Normas Equatorial", icone: <BookOpen />, href: "/normas" },
            ]}
          />
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Ref norma="NT.00001.EQTL" item="rev. 09" href={NT001}>
          <p>Valores oficiais da Equatorial Pará (Tabela 2, alturas, aterramento, documentos). Confira se há revisão mais nova no site da Equatorial.</p>
        </Ref>
      </div>
      <p className="mb-4 flex items-center gap-2 text-sm">
        <ShieldAlert className="size-4 shrink-0 text-warn" /> Ramal, medidor e rede são da Equatorial — não mexa.
      </p>

      <section className="card mb-4 divide-y divide-border">
        {TIPOS.map((x) => (
          <div key={x.t} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1 font-medium">{x.t}</span>
            <span className="text-sm text-muted">{x.lim}</span>
            <Ajuda titulo={x.t} alinhar="direita">
              <p>{x.d}</p>
              <p>NT.00001 item {x.item}.</p>
            </Ajuda>
          </div>
        ))}
      </section>

      <Link href="/normas/calculadora" className="btn btn-primary mb-4 w-full sm:w-auto">
        <Calculator className="size-4" /> Calcular o padrão
      </Link>

      <div className="grid gap-2 lg:grid-cols-2">
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

      <Detalhes titulo="Materiais típicos" className="mt-2">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Caixa de medição e proteção homologada pela Equatorial (mono ou polifásica; metálica no trifásico a partir de 100 A)</li>
          <li>Disjuntor termomagnético geral pela Tabela 2 da NT.00001</li>
          <li>Eletroduto de entrada de aço galvanizado (2.400 ou 4.000 mm), capacete, curva, luva, bucha e arruela</li>
          <li>Cabo de cobre isolado 1 kV / 90 °C (fase e neutro) pela Tabela 2</li>
          <li>Condutor de aço cobreado (2,5 m) em eletroduto de PVC rígido 1/2&quot; ou 1&quot;, haste Ø 16 × 1.500 mm e conector cunha</li>
          <li>Poste auxiliar de aço (mono/bi) ou concreto, quando a medição não ficar no muro/fachada</li>
          <li>Abraçadeiras tipo D (mín. 3) e terminais pré-isolados tipo ilhós</li>
        </ul>
        <p className="mt-2 text-xs text-muted">Quantidades exatas na calculadora do padrão.</p>
      </Detalhes>
    </>
  );
}
