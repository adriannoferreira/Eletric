import { asc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListaAlertas } from "@/components/quadro/alertas";
import {
  Assinaturas,
  CabecalhoDoc,
  ListaInstrumentos,
  RelatorioInspecao,
  RelatorioManutencao,
  ResumoFases,
  RodapeDoc,
  Secao,
  TabelaInspecao,
  TabelaMateriais,
} from "@/components/quadro/documentos";
import { Etiquetas } from "@/components/quadro/etiquetas";
import { AutoImprimir, BotaoImprimir, FotosLocais } from "@/components/quadro/impressao-cliente";
import { TabelaCompras } from "@/components/quadro/lista-compras";
import { BlocoDemanda, demandaDoQuadro, ListaSeguranca, TabelaCargas } from "@/components/quadro/projeto-blocos";
import { QuadroVisual } from "@/components/quadro/quadro-visual";
import { Unifilar } from "@/components/quadro/unifilar";
import { TextoIA } from "@/components/texto-ia";
import { catalogo, clientes, db, equipamentos, perfil, quadros } from "@/db";
import { analisarQuadro, listaMateriais } from "@/lib/eletrica/calculo";
import { montarListaCompras } from "@/lib/eletrica/compras";
import { concessionaria } from "@/lib/eletrica/concessionarias";
import { gerarChecklist } from "@/lib/eletrica/inspecao";
import { laudoPadrao } from "@/lib/eletrica/laudo";
import { fasesDisponiveis, lerQuadro } from "@/lib/eletrica/tipos";

export const metadata = { title: "Imprimir quadro" };

const DOCS = {
  completo: "Projeto do quadro",
  unifilar: "Diagrama unifilar",
  compras: "Lista de compras",
  etiquetas: "Etiquetas do quadro",
  inspecao: "Relatório de inspeção",
  laudo: "Laudo técnico",
  manutencao: "Relatório de manutenção preventiva",
} as const;
type Doc = keyof typeof DOCS;

const RISCO = { alto: "ALTO", medio: "MÉDIO", baixo: "BAIXO" } as const;
const CONCLUSAO = { conforme: "CONFORME", ressalvas: "CONFORME COM RESSALVAS", nao_conforme: "NÃO CONFORME" } as const;

export default async function ImprimirPage({ params, searchParams }: PageProps<"/quadros/[id]/imprimir">) {
  const id = Number((await params).id);
  const sp = await searchParams;
  const doc: Doc = typeof sp.doc === "string" && sp.doc in DOCS ? (sp.doc as Doc) : "completo";
  const auto = sp.auto === "1";
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [[q], [p], cat, instrumentos] = await Promise.all([
    db.select().from(quadros).where(eq(quadros.id, id)),
    db.select().from(perfil).limit(1),
    db.select({ tipo: catalogo.tipo, nome: catalogo.nome, unidade: catalogo.unidade, preco: catalogo.preco }).from(catalogo).where(eq(catalogo.ativo, true)),
    db
      .select({
        id: equipamentos.id,
        nome: equipamentos.nome,
        marca: equipamentos.marca,
        modelo: equipamentos.modelo,
        numeroSerie: equipamentos.numeroSerie,
        proximaVerificacao: equipamentos.proximaVerificacao,
      })
      .from(equipamentos)
      .where(eq(equipamentos.categoria, "instrumento"))
      .orderBy(asc(equipamentos.nome)),
  ]);
  if (!q) notFound();
  const [c] = q.clienteId ? await db.select().from(clientes).where(eq(clientes.id, q.clienteId)) : [];
  const cliente = c
    ? { nome: c.nome, documento: c.documento, endereco: c.endereco, bairro: c.bairro, cidade: c.cidade, telefone: c.telefone, email: c.email }
    : null;
  const perfilR = {
    nome: p?.nome ?? "",
    empresa: p?.empresa ?? "",
    documento: p?.documento ?? "",
    telefone: p?.telefone ?? "",
    email: p?.email ?? "",
    cidade: p?.cidade ?? "",
    registroProfissional: p?.registroProfissional ?? "",
  };
  const dados = lerQuadro(q.dados);
  const analise = analisarQuadro(dados);
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const selo = {
    eletricista: [perfilR.nome || perfilR.empresa, perfilR.registroProfissional].filter(Boolean).join(" — "),
    cliente: cliente?.nome ?? "",
    obra: q.nome,
    data: hoje,
  };
  const todosAlertas = [
    ...analise.alertas,
    ...analise.circuitos.flatMap((r, i) => r.alertas.map((a) => ({ ...a, mensagem: `Circuito ${i + 1} (${r.circuito.nome}): ${a.mensagem}` }))),
  ].filter((a) => a.nivel !== "info");
  const habilitado = Boolean(perfilR.registroProfissional.trim());
  const cab = (titulo: string, subtitulo?: string) => (
    <CabecalhoDoc titulo={titulo} subtitulo={subtitulo} perfil={perfilR} cliente={cliente} nome={q.nome} dados={dados} data={hoje} />
  );

  let conteudo: React.ReactNode;
  if (doc === "unifilar") {
    conteudo = (
      <div className="[&_svg]:h-auto [&_svg]:max-h-[180mm] [&_svg]:w-full [&_svg]:text-black">
        <Unifilar dados={dados} analise={analise} selo={selo} />
      </div>
    );
  } else if (doc === "compras") {
    const lista = montarListaCompras(dados, cat, analise);
    conteudo = (
      <>
        {cab("Lista de compras")}
        <Secao titulo="Materiais">
          <TabelaCompras lista={lista} compradas={dados.compras} />
        </Secao>
        <RodapeDoc extra="Quantidades estimadas; confira na obra antes de comprar." />
      </>
    );
  } else if (doc === "etiquetas") {
    conteudo = (
      <Etiquetas
        nome={q.nome}
        dados={dados}
        analise={analise}
        contato={[perfilR.empresa || perfilR.nome, perfilR.telefone].filter(Boolean).join(" · ")}
        data={hoje}
      />
    );
  } else if (doc === "inspecao") {
    const insp = dados.inspecoes.find((i) => i.id === sp.insp) ?? dados.inspecoes.at(-1);
    conteudo = insp ? (
      <>
        {cab("Relatório de inspeção", "NBR 5410 — verificação final (seção 7)")}
        <RelatorioInspecao id={id} dados={dados} insp={insp} instrumentos={instrumentos} />
        <Assinaturas campos={[`${insp.responsavel || perfilR.nome || "Responsável"}${perfilR.registroProfissional ? ` — ${perfilR.registroProfissional}` : ""}`, "Cliente / contratante"]} />
        <RodapeDoc />
      </>
    ) : (
      <p>Nenhuma inspeção registrada neste quadro.</p>
    );
  } else if (doc === "manutencao") {
    const visitas = dados.manutencao?.visitas ?? [];
    const visita = visitas.find((v) => v.id === sp.visita) ?? visitas.at(-1);
    conteudo = visita ? (
      <>
        {cab("Relatório de manutenção preventiva", `Visita nº ${visita.numero} — ${new Date(visita.data).toLocaleDateString("pt-BR")}`)}
        <RelatorioManutencao id={id} dados={dados} visita={visita} proxima={dados.manutencao?.proximaVisita ?? ""} />
        <Assinaturas campos={[`Técnico: ${visita.tecnico || perfilR.nome || "—"}`, "Ciente do cliente"]} />
        <RodapeDoc />
      </>
    ) : (
      <p>Nenhuma visita de manutenção registrada.</p>
    );
  } else if (doc === "laudo") {
    const l = dados.laudo ?? laudoPadrao(dados);
    const insp = dados.inspecoes.find((i) => i.id === l.inspecaoId) ?? null;
    const itens = gerarChecklist(dados);
    const conc = dados.projeto ? concessionaria(dados.projeto.obra.concessionaria) : null;
    const temDPS = dados.componentes.some((x) => x.pecaId.startsWith("dps-"));
    conteudo = (
      <div className="relative">
        {!habilitado && (
          <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center print:fixed" aria-hidden>
            <p className="-rotate-30 text-center text-5xl font-black text-black/10">
              RASCUNHO
              <br />
              <span className="text-2xl">requer responsável técnico habilitado</span>
            </p>
          </div>
        )}
        <div className="relative z-10">
          {cab(habilitado ? "Laudo técnico da instalação elétrica" : "Relatório de inspeção (rascunho)")}
          {!habilitado && (
            <p className="mt-3 border-2 border-black p-2 text-sm font-bold">
              RASCUNHO — este documento só tem validade quando emitido e assinado por profissional legalmente habilitado
              (técnico com registro no CFT/CRT ou engenheiro no CREA), acompanhado da TRT/ART.
            </p>
          )}
          <Secao titulo="1. Identificação">
            <div className="grid gap-1 text-sm sm:grid-cols-2">
              <p>
                <b>Contratante:</b> {cliente?.nome ?? "—"} {cliente?.documento ? `(${cliente.documento})` : ""}
              </p>
              <p>
                <b>Endereço:</b> {dados.art?.enderecoObra || [cliente?.endereco, cliente?.bairro, cliente?.cidade].filter(Boolean).join(", ") || "—"}
              </p>
              <p>
                <b>Responsável técnico:</b> {perfilR.nome || "—"}
              </p>
              <p>
                <b>Registro:</b> {perfilR.registroProfissional || "não informado"}
              </p>
              <p>
                <b>Data:</b> {insp ? new Date(insp.data).toLocaleDateString("pt-BR") : hoje}
              </p>
              <p>
                <b>{dados.art?.tipo ?? "ART/TRT"}:</b> {dados.art?.numero ? `nº ${dados.art.numero}` : "a informar pelo responsável"}
              </p>
            </div>
          </Secao>
          <Secao titulo="2. Objetivo e escopo">
            <p className="whitespace-pre-wrap text-sm">{l?.objetivo || "—"}</p>
          </Secao>
          <Secao titulo="3. Normas de referência">
            <ul className="list-disc pl-5 text-sm">
              <li>ABNT NBR 5410 — Instalações elétricas de baixa tensão (edição vigente)</li>
              <li>NR-10 — Segurança em instalações e serviços em eletricidade</li>
              {temDPS && <li>ABNT NBR 5419 — Proteção contra descargas atmosféricas (DPS/SPDA), quando aplicável</li>}
              <li>{conc ? `${conc.nome} — ${conc.norma}` : "Norma de fornecimento em baixa tensão da concessionária local"}</li>
            </ul>
          </Secao>
          <Secao titulo="4. Metodologia">
            <p className="text-sm">
              Inspeção visual e ensaios conforme a NBR 5410 seção 7 (continuidade dos condutores de proteção, resistência de
              isolamento{insp ? ` em ${insp.tensaoEnsaioV} V cc` : ""}, funcionamento dos dispositivos DR, resistência de aterramento,
              tensões e polaridade).
            </p>
            <p className="mt-1 text-sm font-semibold">Instrumentos:</p>
            <ListaInstrumentos ids={insp?.instrumentos ?? []} instrumentos={instrumentos} />
          </Secao>
          <Secao titulo="5. Descrição da instalação">
            <p className="text-sm">
              Alimentação {dados.alimentacao.tipo} {dados.alimentacao.tensaoFN}/{dados.alimentacao.tensaoFF} V, esquema de aterramento{" "}
              {dados.alimentacao.esquema}. Quadro de distribuição de {dados.modelo.instalacao} com {dados.modelo.fileiras * dados.modelo.modulosPorFileira}{" "}
              módulos DIN, {analise.circuitos.length} circuitos terminais, potência instalada de{" "}
              {(analise.potenciaTotalW / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kW.
            </p>
            <div className="mt-2">
              <TabelaCargas dados={dados} analise={analise} />
            </div>
          </Secao>
          <Secao titulo="6. Resultados da inspeção e das medições">
            {insp ? <TabelaInspecao itens={itens} insp={insp} /> : <p className="text-sm">Nenhuma inspeção vinculada.</p>}
            {l?.analise && <p className="mt-2 whitespace-pre-wrap text-sm">{l.analise}</p>}
          </Secao>
          <Secao titulo="7. Não conformidades e recomendações">
            {l?.naoConformidades.length ? (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-black text-left">
                    <th className="py-1 pr-2">Risco</th>
                    <th className="pr-2">Não conformidade</th>
                    <th>Recomendação</th>
                  </tr>
                </thead>
                <tbody>
                  {l.naoConformidades.map((n, i) => (
                    <tr key={i} className="border-b border-border align-top">
                      <td className="py-1 pr-2 font-bold">{RISCO[n.risco]}</td>
                      <td className="pr-2">{n.descricao}</td>
                      <td>{n.recomendacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm">Nenhuma não conformidade registrada.</p>
            )}
          </Secao>
          <Secao titulo="8. Conclusão">
            <p className="text-base font-bold">{l ? CONCLUSAO[l.conclusao] : "—"}</p>
            {l?.textoConclusao && <p className="whitespace-pre-wrap text-sm">{l.textoConclusao}</p>}
          </Secao>
          <Secao titulo="9. Validade e próxima inspeção">
            <p className="whitespace-pre-wrap text-sm">{l?.periodicidade || "—"}</p>
          </Secao>
          <Secao titulo="10. Anexos" quebra>
            <p className="mb-2 text-sm font-semibold">Diagrama unifilar</p>
            <div className="[&_svg]:h-auto [&_svg]:w-full [&_svg]:text-black">
              <Unifilar dados={dados} analise={analise} />
            </div>
            <p className="mb-2 mt-4 text-sm font-semibold">Fotos</p>
            {insp && <FotosLocais chaves={itens.map((i) => ({ chave: `eletric:foto:${id}:${insp.id}:${i.id}`, legenda: i.titulo }))} />}
          </Secao>
          <Secao titulo="11. Responsável técnico">
            <Assinaturas
              campos={[
                `${perfilR.nome || "Nome do responsável"} — ${perfilR.registroProfissional || "Registro CFT/CRT ou CREA"}${dados.art?.numero ? ` — ${dados.art.tipo} nº ${dados.art.numero}` : " — nº ART/TRT: ________"}`,
                "Contratante",
              ]}
            />
          </Secao>
          <RodapeDoc />
        </div>
      </div>
    );
  } else {
    const lista = montarListaCompras(dados, cat, analise);
    conteudo = (
      <>
        {cab("Projeto do quadro de distribuição")}
        <Secao titulo="Quadro de distribuição">
          <div className="flex justify-center overflow-hidden">
            <QuadroVisual dados={dados} nome={q.nome} escala={0.75} />
          </div>
        </Secao>
        <Secao titulo="Demanda e entrada de energia">
          <BlocoDemanda dados={dados} demanda={demandaDoQuadro(dados)} />
        </Secao>
        <Secao titulo="Diagrama unifilar" quebra>
          <div className="[&_svg]:h-auto [&_svg]:w-full [&_svg]:text-black">
            <Unifilar dados={dados} analise={analise} selo={selo} />
          </div>
        </Secao>
        <Secao titulo="Quadro de cargas" quebra>
          <TabelaCargas dados={dados} analise={analise} />
          <div className="mt-2">
            <ResumoFases analise={analise} fases={fasesDisponiveis(dados.alimentacao)} />
          </div>
        </Secao>
        <Secao titulo="Verificação NBR 5410">
          <ListaAlertas alertas={todosAlertas} vazio="Nenhuma pendência encontrada pelo verificador automático." />
        </Secao>
        <Secao titulo="Aterramento e segurança">
          <ListaSeguranca dados={dados} />
        </Secao>
        <Secao titulo="Lista de materiais">
          <TabelaMateriais itens={listaMateriais(dados, analise)} />
        </Secao>
        <Secao titulo="Lista de compras" quebra>
          <TabelaCompras lista={lista} compradas={dados.compras} />
        </Secao>
        {dados.memorial && (
          <Secao titulo="Memorial descritivo" quebra>
            <TextoIA>{dados.memorial.texto}</TextoIA>
          </Secao>
        )}
        {sp.etiquetas === "1" && (
          <Secao titulo="Etiquetas" quebra>
            <Etiquetas nome={q.nome} dados={dados} analise={analise} contato={[perfilR.empresa || perfilR.nome, perfilR.telefone].filter(Boolean).join(" · ")} data={hoje} />
          </Secao>
        )}
        <RodapeDoc />
      </>
    );
  }

  return (
    <div className="doc-impressao">
      <style>{`
        @page { size: A4 ${doc === "unifilar" ? "landscape" : "portrait"}; margin: 12mm; }
        .doc-impressao {
          --bg: #ffffff; --surface: #ffffff; --surface-2: #f1f2f4; --border: #c9cdd3; --fg: #111111; --muted: #4b5563;
          --accent: #f5b301; --accent-fg: #1a1400; --accent-soft: #fff4cc;
          --danger: #b91c1c; --danger-soft: #fee2e2; --ok: #15803d; --ok-soft: #dcfce7;
          --info: #1d4ed8; --info-soft: #dbeafe; --warn: #b45309; --warn-soft: #fef3c7;
          color: #111; background: #fff;
        }
        @media print {
          html, body { background: #fff !important; }
          main { padding: 0 !important; }
          main > div { max-width: none !important; padding: 0 !important; }
          .doc-impressao { font-size: 11pt; }
          .break-before-page { break-before: page; }
          tr, li, figure { break-inside: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <AutoImprimir ativo={auto} />
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/quadros/${id}`} className="btn btn-ghost">
          <ChevronLeft className="size-4" /> Voltar ao quadro
        </Link>
        <span className="mr-auto font-semibold">{DOCS[doc]}</span>
        {doc === "completo" && (
          <Link href={`/quadros/${id}/imprimir?etiquetas=${sp.etiquetas === "1" ? "0" : "1"}`} className="btn btn-secondary">
            {sp.etiquetas === "1" ? "Sem etiquetas" : "Incluir etiquetas"}
          </Link>
        )}
        <BotaoImprimir />
      </div>
      <p className="no-print mb-3 text-xs text-muted">
        No celular: toque em “Imprimir / Salvar PDF” e escolha “Salvar como PDF” (Android) ou, no iPhone, use Compartilhar → Imprimir
        e amplie a prévia para salvar o PDF.
      </p>
      <article className="rounded-xl bg-white p-4 text-black shadow-sm sm:p-8 print:rounded-none print:p-0 print:shadow-none">{conteudo}</article>
    </div>
  );
}
