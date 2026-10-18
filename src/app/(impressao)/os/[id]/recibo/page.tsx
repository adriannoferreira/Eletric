import { notFound } from "next/navigation";
import { BarraImpressao } from "@/components/os/barra-impressao";
import { CabecalhoDoc } from "@/components/os/cabecalho-doc";
import { dataCurta, reais } from "@/lib/formato";
import { carregarOSCompleta } from "@/lib/servicos/carregar-os";

export const metadata = { title: "Recibo" };

const fmtExtenso = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Belem", day: "numeric", month: "long", year: "numeric" });

export default async function ReciboOS({ params }: PageProps<"/os/[id]/recibo">) {
  const d = await carregarOSCompleta(Number((await params).id));
  if (!d) notFound();
  const { os, cliente, perfil } = d;
  const nomeProf = perfil?.empresa || perfil?.nome || "Prestador";
  const pago = os.pagamento === "pago";
  const data = os.pagoEm ?? os.concluidaEm ?? new Date();

  return (
    <>
      <BarraImpressao voltar={`/os/${os.id}`} />
      <main className="mx-auto max-w-[210mm] space-y-6 p-6 text-sm print:p-0">
        <CabecalhoDoc perfil={perfil} titulo={pago ? "Recibo" : "Comprovante de serviço"} numero={`OS ${os.id}`} data={dataCurta(data)} />
        {os.valor == null ? (
          <p className="no-print rounded-lg bg-amber-100 p-3 text-amber-800">
            Informe o valor cobrado na OS (seção “Dados, garantia e pagamento”) para o recibo sair completo.
          </p>
        ) : null}
        <p className="text-2xl font-bold">{os.valor != null ? reais(os.valor) : "R$ ____________"}</p>
        <p className="text-base leading-relaxed">
          {pago ? "Recebi de" : "Serviço prestado a"} <strong>{cliente.nome}</strong>
          {cliente.documento && <> (CPF/CNPJ {cliente.documento})</>}
          {pago ? <> a importância de <strong>{os.valor != null ? reais(os.valor) : "____________"}</strong></> : <> no valor de <strong>{os.valor != null ? reais(os.valor) : "____________"}</strong>, <strong>a receber</strong></>}
          , referente a: <strong>{os.titulo}</strong>
          {os.formaPagamento && <>, forma de pagamento: {os.formaPagamento}</>}.
        </p>
        {os.garantiaDias > 0 && <p>Garantia de {os.garantiaDias} dias sobre a mão de obra.</p>}
        <p className="pt-6">{perfil?.cidade || "Belém - PA"}, {fmtExtenso.format(data)}.</p>
        <div className="mx-auto mt-16 max-w-xs border-t border-gray-500 pt-1 text-center">
          <p className="font-medium">{nomeProf}</p>
          {perfil?.documento && <p className="text-xs text-gray-600">CPF/CNPJ {perfil.documento}</p>}
        </div>
      </main>
    </>
  );
}
