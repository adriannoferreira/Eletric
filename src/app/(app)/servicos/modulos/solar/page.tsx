import { Calculator, Plus, ShieldAlert } from "lucide-react";
import { Ajuda, Conferir, MenuAcoes, Ref } from "@/components/divulgacao";
import { ChecklistCampo } from "@/components/servicos/checklist-campo";
import { Cabecalho } from "@/components/ui";

export const metadata = { title: "Energia solar" };

export default function SolarPage() {
  return (
    <>
      <Cabecalho
        titulo="Energia solar"
        voltar="/servicos"
        acoes={
          <MenuAcoes
            acoes={[
              { rotulo: "Estimar sistema", icone: <Calculator />, href: "/calculadoras" },
              { rotulo: "Criar OS", icone: <Plus />, href: "/os/nova?guia=solar" },
            ]}
          />
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="flex items-center gap-1 font-medium text-warn">
          <ShieldAlert className="size-4 shrink-0" /> Exige responsável técnico
          <Ajuda titulo="Responsável técnico">
            <p>Projeto, ART/TRT e homologação na Equatorial são feitos por profissional habilitado.</p>
            <p>Módulos geram tensão contínua alta sempre que há luz: não existe “desligar o painel”. Siga NR-10 e NR-35.</p>
          </Ajuda>
        </span>
        <Ref norma="NBR 16690" />
        <Ref norma="NBR 16274" />
        <Conferir itens={["Edições vigentes da NBR 16690 (instalações FV) e NBR 16274 (comissionamento)."]} />
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <ChecklistCampo
          id="solar-visita"
          titulo="Visita técnica (pré-venda)"
          grupos={[
            {
              titulo: "Consumo e ligação",
              itens: [
                "Fotografar 12 contas de luz (ou histórico no app da Equatorial) e calcular a média",
                "Tipo de ligação (mono/bi/tri) e corrente do disjuntor do padrão",
                "Estado do padrão de entrada e do quadro (pode precisar de adequação)",
              ],
            },
            {
              titulo: "Telhado e local",
              itens: [
                "Orientação (ideal: norte) e inclinação do telhado",
                "Sombras (caixa d'água, árvores, prédios) ao longo do dia",
                "Tipo de telha e estado da estrutura (madeira/metálica)",
                "Área disponível (use a calculadora solar para estimar)",
                "Local do inversor: ventilado, sem sol direto e perto do quadro",
                "Trajeto dos cabos CC e CA e ponto de conexão no quadro",
              ],
            },
            {
              titulo: "Encaminhamento",
              itens: ["Fotos e medidas enviadas ao projetista/integrador", "Cliente orientado sobre prazos de homologação (conferir na Equatorial)"],
            },
          ]}
        />
        <ChecklistCampo
          id="solar-manutencao"
          titulo="Manutenção preventiva"
          grupos={[
            {
              titulo: "Inspeção",
              itens: [
                "Geração do mês x esperada (app de monitoramento)",
                "Alarmes/erros no inversor",
                "Sujeira, folhas ou fezes de pássaros nos módulos (limpar só com água e escova macia, cedo ou no fim da tarde)",
                "Trincas, pontos quentes ou descoloração nos módulos",
                "Fixações e estrutura (oxidação — atenção à maresia em Salinópolis)",
                "Conectores MC4 sem aquecimento e bem encaixados",
              ],
            },
            {
              titulo: "Medições (com instrumento CC adequado)",
              itens: [
                "Tensão de circuito aberto (Voc) de cada string comparada com o projeto",
                "Corrente das strings em funcionamento",
                "Isolação dos circuitos CC (conforme procedimento do fabricante)",
                "DPS CC e CA: janela de sinalização",
                "Aperto das conexões no quadro CA e aterramento da estrutura",
              ],
            },
          ]}
        />
      </div>
    </>
  );
}
