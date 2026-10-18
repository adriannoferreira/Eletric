import { notFound } from "next/navigation";
import { BarraImpressao } from "@/components/os/barra-impressao";
import { CabecalhoDoc } from "@/components/os/cabecalho-doc";
import { dataCurta, numero, reais } from "@/lib/formato";
import { carregarOSCompleta } from "@/lib/servicos/carregar-os";
import { dataHora, fimGarantia, formatarDuracao, STATUS_OS, type StatusOS, totalMinutos } from "@/lib/servicos/os";

export const metadata = { title: "Relatório de serviço" };

export default async function RelatorioOS({ params, searchParams }: PageProps<"/os/[id]/relatorio">) {
  const d = await carregarOSCompleta(Number((await params).id));
  if (!d) notFound();
  const { auto } = await searchParams;
  const { os, cliente, materiais, horas, fotos, perfil, visitas } = d;
  const minutos = totalMinutos(horas, os.concluidaEm ?? os.atualizadoEm);
  const totalMat = materiais.reduce((s, m) => s + m.quantidade * m.precoUnitario, 0);
  const endereco = os.endereco || [cliente.endereco, cliente.bairro, cliente.cidade].filter(Boolean).join(", ");
  const realizadas = visitas.filter((v) => v.status === "realizada");
  const st = STATUS_OS[os.status as StatusOS] ?? STATUS_OS.agendada;

  return (
    <>
      <BarraImpressao voltar={`/os/${os.id}`} auto={auto === "1"} />
      <main className="mx-auto max-w-[210mm] space-y-6 p-6 text-sm print:p-0">
        <CabecalhoDoc perfil={perfil} titulo="Relatório de serviço" numero={`OS ${os.id}`} data={dataCurta(os.concluidaEm ?? os.criadoEm)} />

        <section className="grid gap-4 sm:grid-cols-2">
          <Bloco r="Cliente" v={cliente.nome} sub={[cliente.telefone, cliente.documento && `CPF/CNPJ ${cliente.documento}`].filter(Boolean).join(" · ")} />
          <Bloco r="Local do serviço" v={endereco || "—"} />
          <Bloco r="Serviço" v={os.titulo} sub={os.categoria !== "Geral" ? os.categoria : undefined} />
          <Bloco
            r="Situação"
            v={st.rotulo}
            sub={[
              realizadas.length ? `Visitas: ${realizadas.map((v) => dataHora(v.inicio)).join(", ")}` : "",
              minutos ? `Tempo total: ${formatarDuracao(minutos)}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        </section>

        {os.descricao && (
          <Sec t="Descrição do serviço">
            <p className="whitespace-pre-wrap">{os.descricao}</p>
          </Sec>
        )}

        {os.checklist.length > 0 && (
          <Sec t="Checklist de execução">
            <ul className="grid gap-1 sm:grid-cols-2">
              {os.checklist.map((i) => (
                <li key={i.id} className="flex gap-2">
                  <span className="font-bold">{i.feito ? "☑" : "☐"}</span>
                  <span>{i.texto}</span>
                </li>
              ))}
            </ul>
          </Sec>
        )}

        {materiais.length > 0 && (
          <Sec t="Materiais utilizados">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-300 text-left text-gray-600">
                  <th className="py-1.5 font-medium">Descrição</th>
                  <th className="py-1.5 text-right font-medium">Qtd</th>
                  <th className="py-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {materiais.map((m) => (
                  <tr key={m.id} className="border-b border-gray-200">
                    <td className="py-1.5 pr-2">{m.descricao}</td>
                    <td className="whitespace-nowrap py-1.5 text-right">{numero(m.quantidade)} {m.unidade}</td>
                    <td className="whitespace-nowrap py-1.5 text-right">{reais(m.quantidade * m.precoUnitario)}</td>
                  </tr>
                ))}
              </tbody>
              {totalMat > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={2} className="py-1.5 text-right font-medium">Total materiais</td>
                    <td className="py-1.5 text-right font-semibold">{reais(totalMat)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </Sec>
        )}

        {os.observacoes && (
          <Sec t="Observações">
            <p className="whitespace-pre-wrap">{os.observacoes}</p>
          </Sec>
        )}

        {fotos.length > 0 && (
          <Sec t="Registro fotográfico">
            {(["antes", "durante", "depois"] as const).map((et) => {
              const l = fotos.filter((f) => f.etapa === et);
              if (!l.length) return null;
              return (
                <div key={et} className="mb-3 break-inside-avoid">
                  <p className="mb-1 font-medium capitalize">{et}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {l.map((f) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={f.id} src={`/api/os/foto/${f.id}`} alt={`Foto ${et}`} className="aspect-[4/3] w-full rounded border border-gray-200 object-cover" />
                    ))}
                  </div>
                </div>
              );
            })}
          </Sec>
        )}

        <section className="grid gap-4 break-inside-avoid sm:grid-cols-2">
          <div className="rounded-lg border border-gray-300 p-3">
            <p className="font-semibold">Termo de garantia</p>
            <p className="mt-1">
              {os.garantiaDias > 0
                ? `Garantia de ${os.garantiaDias} dias sobre a mão de obra${os.concluidaEm ? `, válida até ${dataCurta(fimGarantia(os.concluidaEm, os.garantiaDias))}` : ", contados da conclusão"}. Não cobre mau uso, sobrecarga, alterações feitas por terceiros, danos por descargas atmosféricas ou defeitos de fabricação de materiais (garantia do fabricante).`
                : "Serviço sem garantia de mão de obra acordada."}
            </p>
            {os.valor != null && (
              <p className="mt-2">
                <span className="font-semibold">Valor do serviço:</span> {reais(os.valor)}
                {os.formaPagamento && ` · ${os.formaPagamento}`} · {os.pagamento === "pago" ? "Pago" : "A receber"}
              </p>
            )}
          </div>
          <div className="flex flex-col justify-end rounded-lg border border-gray-300 p-3">
            {os.assinatura ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={os.assinatura} alt="Assinatura do cliente" className="mx-auto h-24 object-contain" />
            ) : (
              <div className="h-24" />
            )}
            <div className="border-t border-gray-400 pt-1 text-center">
              <p className="font-medium">{os.assinadoPor || cliente.nome}</p>
              <p className="text-xs text-gray-600">Cliente — declaro que o serviço foi executado e conferido</p>
            </div>
          </div>
        </section>

        <footer className="border-t border-gray-300 pt-3 text-center text-xs text-gray-500">
          Serviço executado conforme ABNT NBR 5410 e procedimentos de segurança da NR-10.
        </footer>
      </main>
    </>
  );
}

function Bloco({ r, v, sub }: { r: string; v: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{r}</p>
      <p className="font-semibold">{v}</p>
      {sub && <p className="text-gray-600">{sub}</p>}
    </div>
  );
}

function Sec({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-2 border-b border-gray-300 pb-1 text-base font-bold">{t}</h2>
      {children}
    </section>
  );
}
