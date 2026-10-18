import { CalcPadraoEquatorial } from "@/components/normas/calc-padrao";
import { Cabecalho } from "@/components/ui";
import { AVISO_REVISAO } from "@/lib/normas/equatorial-pa";

export const metadata = { title: "Padrão de entrada — Equatorial PA" };

export default async function CalculadoraPadraoPage({ searchParams }: PageProps<"/normas/calculadora">) {
  const { quadro } = await searchParams;
  const quadroInicial = Number(quadro) || undefined;
  return (
    <>
      <Cabecalho
        titulo="Padrão de entrada"
        subtitulo="Equatorial Pará"
        voltar="/normas"
        ajuda={
          <>
            <p>Calcula a categoria pela carga instalada (Tabela 2 da NT.00001 rev. 09) e lista disjuntor, cabos, aterramento, materiais e checklist.</p>
            <p>{AVISO_REVISAO}</p>
          </>
        }
      />
      <CalcPadraoEquatorial quadroInicial={quadroInicial} />
    </>
  );
}
