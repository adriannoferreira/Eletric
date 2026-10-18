import { AlertTriangle, Calculator, Plus } from "lucide-react";
import Link from "next/link";
import { DiagramaBomba, DiagramaForca, DiagramaPartidaDireta, DiagramaTimer } from "@/components/servicos/diagramas-comando";
import { Cabecalho } from "@/components/ui";

export const metadata = { title: "Bombas e comandos" };

function Bloco({ titulo, children, texto }: { titulo: string; children: React.ReactNode; texto: string[] }) {
  return (
    <section className="card space-y-3 p-4 break-inside-avoid">
      <h2 className="font-semibold">{titulo}</h2>
      {children}
      <ul className="list-disc space-y-1 pl-5 text-sm">{texto.map((t) => <li key={t}>{t}</li>)}</ul>
    </section>
  );
}

export default function ComandosPage() {
  return (
    <>
      <Cabecalho titulo="Bombas e comandos" subtitulo="Diagramas de comando prontos para consultar na obra" voltar="/servicos" />
      <div className="mb-4 flex gap-3 rounded-2xl bg-info-soft p-4 text-sm text-info">
        <AlertTriangle className="size-5 shrink-0" />
        <p>
          Diagramas de referência. Confira sempre o esquema do fabricante do contator, relé, boias e timer (numeração de bornes
          pode variar). Bloqueie o comando antes de mexer: com o automático ligado, o motor pode partir sozinho (NR-10).
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Bloco
          titulo="1. Força — partida direta trifásica"
          texto={[
            "Q1: disjuntor-motor (ou disjuntor + fusíveis) — proteção contra curto.",
            "K1: contatos principais do contator (categoria AC-3, corrente ≥ In do motor).",
            "F1: relé térmico ajustado na corrente nominal da placa do motor — proteção contra sobrecarga.",
            "Motor monofásico: mesma lógica com 1 fase + neutro (ou 2 fases em 220 V).",
          ]}
        >
          <DiagramaForca />
        </Bloco>
        <Bloco
          titulo="2. Comando — liga/desliga com selo"
          texto={[
            "S0 (NF) desliga; S1 (NA) liga. O contato auxiliar K1 13-14 em paralelo com S1 mantém (sela) o contator ligado.",
            "F1 95-96 (NF) abre o comando quando o térmico atua por sobrecarga.",
            "H1 indica motor ligado (em paralelo com a bobina).",
          ]}
        >
          <DiagramaPartidaDireta />
        </Bloco>
        <Bloco
          titulo="3. Bomba d'água com boias (Auto/Manual)"
          texto={[
            "B1 — boia do reservatório inferior/cisterna: só deixa ligar com água (protege a bomba contra funcionar a seco).",
            "B2 — boia da caixa superior: fecha com nível baixo e abre quando a caixa enche.",
            "No AUTO a bomba liga e desliga pelas boias; no MANUAL usa S1 com selo (S0 e F1 continuam protegendo).",
            "Use boias com contato para a corrente da bobina do contator, não do motor.",
          ]}
        >
          <DiagramaBomba />
        </Bloco>
        <Bloco
          titulo="4. Temporizador ou fotocélula acionando contator"
          texto={[
            "T1 (timer digital ou relé fotoelétrico) comanda a bobina de K1; os contatos principais de K1 ligam a carga (iluminação, bomba de piscina).",
            "Use contator quando a carga passar da capacidade do contato do timer/fotocélula.",
          ]}
        >
          <DiagramaTimer />
        </Bloco>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href="/calculadoras" className="btn btn-secondary"><Calculator className="size-4" /> Calcular motor</Link>
        <Link href="/os/nova?guia=bombas-agua" className="btn btn-primary"><Plus className="size-4" /> Criar OS</Link>
      </div>
    </>
  );
}
