import { Calculator, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { ChecklistCampo } from "@/components/servicos/checklist-campo";
import { Cabecalho } from "@/components/ui";

export const metadata = { title: "Energia solar" };

export default function SolarPage() {
  return (
    <>
      <Cabecalho titulo="Energia solar fotovoltaica" subtitulo="Visita técnica e manutenção" voltar="/servicos" />
      <div className="mb-4 flex gap-3 rounded-2xl bg-warn-soft p-4 text-sm text-warn">
        <ShieldAlert className="size-5 shrink-0" />
        <p>
          <strong>Exige responsável técnico.</strong> Projeto, ART/TRT e homologação na Equatorial são feitos por profissional
          habilitado. Módulos geram tensão contínua alta sempre que há luz: não existe “desligar o painel”. Siga NR-10 e NR-35.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
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
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href="/calculadoras" className="btn btn-secondary"><Calculator className="size-4" /> Estimar sistema</Link>
        <Link href="/os/nova?guia=solar" className="btn btn-primary"><Plus className="size-4" /> Criar OS</Link>
      </div>
      <p className="mt-3 text-xs text-muted">Normas de referência: ABNT NBR 16690 (instalações FV) e NBR 16274 (comissionamento) — conferir edições vigentes.</p>
    </>
  );
}
