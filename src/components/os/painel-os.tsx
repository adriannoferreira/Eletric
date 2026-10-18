"use client";

import { CalendarDays, CheckCircle2, ChevronLeft, ClipboardCheck, Clock, ExternalLink, FileText, Gauge, Image as ImageIcon, Images, MapPin, MessageCircle, Navigation, Package, Pause, Pencil, Phone, Play, Receipt, RotateCcw, Save, Star, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { excluirOS, mudarStatusOS, salvarAssinatura, salvarCamposOS, salvarConfigServicos } from "@/app/(app)/os/actions";
import { Ajuda, MaisOpcoes, MenuAcoes } from "@/components/divulgacao";
import { Badge, Campo } from "@/components/ui";
import type { Cliente } from "@/db/schema";
import type { Medicao, OrdemServico, OsHora, OsMaterial, Visita } from "@/db/schema-servicos";
import { linkWhatsApp, reais } from "@/lib/formato";
import { dataCurta } from "@/lib/formato";
import { fimGarantia, formatarDuracao, STATUS_OS, type StatusOS, totalMinutos } from "@/lib/servicos/os";
import { PadAssinatura } from "./assinatura";
import { type Instrumento, Medicoes } from "./medicoes";
import { Checklist, Fotos, Horas, Materiais, Secao, Visitas } from "./secoes";

type Props = {
  os: OrdemServico;
  cliente: Cliente;
  visitas: Visita[];
  outrasVisitas: { id: number; inicio: Date; duracaoMin: number }[];
  materiais: OsMaterial[];
  horas: OsHora[];
  fotos: { id: number; etapa: string; legenda: string }[];
  catalogo: { id: number; nome: string; unidade: string; preco: number; tipo: string }[];
  linkAvaliacao: string;
  garantiaPadrao: number;
  nomeProfissional: string;
  orcamento: { id: number; token: string } | null;
  medicoes: Medicao[];
  instrumentos: Instrumento[];
};

const ABAS = [
  { v: "execucao", r: "Execução" },
  { v: "fotos", r: "Fotos" },
  { v: "medicoes", r: "Medições" },
  { v: "conclusao", r: "Conclusão" },
] as const;
type Aba = (typeof ABAS)[number]["v"];

export function PainelOS(p: Props) {
  const { os, cliente } = p;
  const [pendente, iniciar] = useTransition();
  const [aba, setAba] = useState<Aba>(os.status === "concluida" ? "conclusao" : "execucao");
  const contagem: Partial<Record<Aba, number>> = { fotos: p.fotos.length, medicoes: p.medicoes.length };
  const [erro, setErro] = useState<string | null>(null);
  const st = STATUS_OS[os.status as StatusOS] ?? STATUS_OS.agendada;
  const endereco = os.endereco || [cliente.endereco, cliente.bairro, cliente.cidade].filter(Boolean).join(", ");

  const status = (s: StatusOS) =>
    iniciar(async () => {
      setErro(await mudarStatusOS(os.id, s));
    });

  return (
    <div className="space-y-4 pb-6">
      <header className="flex items-start gap-2">
        <Link href="/os" className="btn btn-ghost -ml-2 p-2" aria-label="Voltar">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>OS {os.id}</span>
            <Badge tom={st.tom}>{st.rotulo}</Badge>
          </div>
          <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">{os.titulo}</h1>
          <Link href={`/clientes/${cliente.id}`} className="block truncate text-sm text-muted hover:underline">
            {cliente.nome}
            {endereco ? ` · ${endereco}` : ""}
          </Link>
        </div>
        <MenuAcoes
          acoes={[
            ...(p.orcamento ? [{ rotulo: "Ver orçamento", icone: <FileText />, href: `/orcamentos/${p.orcamento.id}` }] : []),
            ...(os.quadroId ? [{ rotulo: "Ver quadro", icone: <ExternalLink />, href: `/quadros/${os.quadroId}` }] : []),
            ...(os.status !== "cancelada" && os.status !== "concluida"
              ? [{ rotulo: "Cancelar OS", icone: <XCircle />, onClick: () => confirm("Cancelar esta OS?") && status("cancelada") }]
              : []),
            {
              rotulo: "Excluir OS",
              icone: <Trash2 />,
              perigo: true,
              onClick: () => confirm("Excluir esta OS e tudo o que foi registrado nela?") && iniciar(() => excluirOS(os.id)),
            },
          ]}
        />
      </header>

      {/* Contato rápido */}
      <div className="grid grid-cols-4 gap-2">
        <a href={cliente.telefone ? linkWhatsApp(cliente.telefone, `Olá ${cliente.nome.split(" ")[0]}, aqui é ${p.nomeProfissional}.`) : undefined} target="_blank" className={`btn btn-whatsapp px-2 ${cliente.telefone ? "" : "pointer-events-none opacity-40"}`}>
          <MessageCircle className="size-4" /> <span className="hidden sm:inline">WhatsApp</span>
        </a>
        <a href={cliente.telefone ? `tel:${cliente.telefone.replace(/\D/g, "")}` : undefined} className={`btn btn-secondary px-2 ${cliente.telefone ? "" : "pointer-events-none opacity-40"}`}>
          <Phone className="size-4" /> <span className="hidden sm:inline">Ligar</span>
        </a>
        <a href={endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}` : undefined} target="_blank" className={`btn btn-secondary px-2 ${endereco ? "" : "pointer-events-none opacity-40"}`}>
          <MapPin className="size-4" /> <span className="hidden sm:inline">Mapa</span>
        </a>
        <a href={endereco ? `https://waze.com/ul?q=${encodeURIComponent(endereco)}&navigate=yes` : undefined} target="_blank" className={`btn btn-secondary px-2 ${endereco ? "" : "pointer-events-none opacity-40"}`}>
          <Navigation className="size-4" /> <span className="hidden sm:inline">Waze</span>
        </a>
      </div>

      {/* Ações de status */}
      <div className="flex flex-wrap gap-2">
        {os.status === "agendada" && (
          <button disabled={pendente} onClick={() => status("em_andamento")} className="btn btn-primary flex-1">
            <Play className="size-4" /> Iniciar serviço
          </button>
        )}
        {os.status === "em_andamento" && (
          <>
            <button disabled={pendente} onClick={() => status("pausada")} className="btn btn-secondary flex-1">
              <Pause className="size-4" /> Pausar
            </button>
            <button disabled={pendente} onClick={() => status("concluida")} className="btn bg-ok text-white flex-1">
              <CheckCircle2 className="size-4" /> Concluir
            </button>
          </>
        )}
        {os.status === "pausada" && (
          <>
            <button disabled={pendente} onClick={() => status("em_andamento")} className="btn btn-primary flex-1">
              <Play className="size-4" /> Retomar
            </button>
            <button disabled={pendente} onClick={() => status("concluida")} className="btn bg-ok text-white flex-1">
              <CheckCircle2 className="size-4" /> Concluir
            </button>
          </>
        )}
        {os.status === "concluida" && (
          <button disabled={pendente} onClick={() => status("em_andamento")} className="btn btn-secondary flex-1">
            <RotateCcw className="size-4" /> Reabrir
          </button>
        )}
        {os.status === "cancelada" && (
          <p className="flex-1 rounded-xl bg-surface-2 p-3 text-sm text-muted">OS cancelada.</p>
        )}
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}

      {os.descricao && (
        <details className="group rounded-2xl bg-surface-2 p-3 text-sm">
          <summary className="cursor-pointer list-none truncate [&::-webkit-details-marker]:hidden group-open:whitespace-pre-wrap">
            {os.descricao}
          </summary>
        </details>
      )}

      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.v}
            role="tab"
            aria-selected={aba === a.v}
            onClick={() => setAba(a.v)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${aba === a.v ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"}`}
          >
            {a.r}
            {contagem[a.v] ? <span className="ml-1 opacity-70">{contagem[a.v]}</span> : null}
          </button>
        ))}
      </nav>

      {aba === "execucao" && (
      <div className="grid gap-4 lg:grid-cols-2">
        <Secao titulo="Agenda" icone={CalendarDays}>
          <Visitas osId={os.id} visitas={p.visitas} outras={p.outrasVisitas} />
        </Secao>
        <Secao titulo="Checklist de execução" icone={ClipboardCheck}>
          <Checklist osId={os.id} inicial={os.checklist} />
        </Secao>
        <Secao titulo="Horas trabalhadas" icone={Clock}>
          <Horas osId={os.id} horas={p.horas} />
        </Secao>
        <Secao titulo="Materiais usados" icone={Package}>
          <Materiais osId={os.id} materiais={p.materiais} catalogo={p.catalogo} />
        </Secao>
      </div>
      )}

      {aba === "fotos" && (
        <Secao titulo="Fotos" icone={ImageIcon}>
          <Fotos osId={os.id} fotos={p.fotos} />
        </Secao>
      )}

      {aba === "medicoes" && (
        <Secao titulo="Medições elétricas" icone={Gauge}>
          <Medicoes osId={os.id} titulo={os.titulo} medicoes={p.medicoes} instrumentos={p.instrumentos} analise={os.analiseMedicoes} />
        </Secao>
      )}

      {aba === "conclusao" && (
        <>
          <Conclusao {...p} />
          <DadosPagamento os={os} />
        </>
      )}
    </div>
  );
}

function DadosPagamento({ os }: { os: OrdemServico }) {
  const [c, setC] = useState({
    titulo: os.titulo,
    descricao: os.descricao,
    endereco: os.endereco,
    categoria: os.categoria,
    observacoes: os.observacoes,
    garantiaDias: os.garantiaDias,
    valor: os.valor,
    formaPagamento: os.formaPagamento,
    pagamento: os.pagamento === "pago" ? ("pago" as const) : ("a_receber" as const),
  });
  const [sujo, setSujo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const set = <K extends keyof typeof c>(k: K, v: (typeof c)[K]) => {
    setC({ ...c, [k]: v });
    setSujo(true);
  };

  return (
    <Secao
      titulo="Pagamento e dados"
      icone={Pencil}
      extra={
        <button
          disabled={!sujo || pendente}
          onClick={() =>
            iniciar(async () => {
              const e = await salvarCamposOS(os.id, c);
              setMsg(e ?? "Salvo.");
              if (!e) setSujo(false);
            })
          }
          className="btn btn-primary px-3 py-1.5"
        >
          <Save className="size-4" /> Salvar
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Valor (R$)">
          <input
            inputMode="decimal"
            defaultValue={c.valor != null ? String(c.valor).replace(".", ",") : ""}
            onChange={(e) => {
              const v = e.target.value.trim();
              set("valor", v ? Number(v.replace(/\./g, "").replace(",", ".")) || 0 : null);
            }}
            className="input"
          />
        </Campo>
        <Campo rotulo="Situação">
          <select value={c.pagamento} onChange={(e) => set("pagamento", e.target.value as "pago" | "a_receber")} className="input">
            <option value="a_receber">A receber</option>
            <option value="pago">Pago</option>
          </select>
        </Campo>
      </div>
      <div className="mt-3">
        <MaisOpcoes>
          <div className="grid gap-3 md:grid-cols-2">
            <Campo rotulo="Forma de pagamento">
              <input value={c.formaPagamento} onChange={(e) => set("formaPagamento", e.target.value)} placeholder="PIX, dinheiro, cartão…" className="input" />
            </Campo>
            <Campo rotulo="Garantia (dias)">
              <input type="number" min={0} value={c.garantiaDias} onChange={(e) => set("garantiaDias", Math.max(0, Number(e.target.value) || 0))} className="input" />
            </Campo>
            <Campo rotulo="Título" className="md:col-span-2">
              <input value={c.titulo} onChange={(e) => set("titulo", e.target.value)} className="input" />
            </Campo>
            <Campo rotulo="Endereço do serviço" className="md:col-span-2">
              <input value={c.endereco} onChange={(e) => set("endereco", e.target.value)} className="input" />
            </Campo>
            <Campo rotulo="Descrição" className="md:col-span-2">
              <textarea value={c.descricao} onChange={(e) => set("descricao", e.target.value)} rows={3} className="input" />
            </Campo>
            <Campo rotulo="Observações" className="md:col-span-2">
              <textarea value={c.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} placeholder="Ex.: neutro com emenda derretida" className="input" />
            </Campo>
          </div>
        </MaisOpcoes>
      </div>
      {msg && <p className={`mt-2 text-sm ${msg === "Salvo." ? "text-ok" : "text-danger"}`}>{msg}</p>}
    </Secao>
  );
}

function Conclusao(p: Props) {
  const { os, cliente } = p;
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [nome, setNome] = useState(os.assinadoPor || cliente.nome);
  const [refazer, setRefazer] = useState(!os.assinatura);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [link, setLink] = useState(p.linkAvaliacao);
  const [editandoLink, setEditandoLink] = useState(false);

  const primeiro = cliente.nome.split(" ")[0];
  const minutos = totalMinutos(p.horas, os.concluidaEm ?? new Date());
  const garantiaAte = os.concluidaEm ? dataCurta(fimGarantia(os.concluidaEm, os.garantiaDias)) : null;
  const msgRelatorio = [
    `Olá ${primeiro}! Serviço concluído: *${os.titulo}*.`,
    os.checklist.length ? `✅ ${os.checklist.filter((i) => i.feito).length}/${os.checklist.length} itens do checklist conferidos` : "",
    minutos ? `⏱️ Tempo de serviço: ${formatarDuracao(minutos)}` : "",
    os.valor != null ? `💰 Valor: ${reais(os.valor)}${os.pagamento === "pago" ? " (pago — obrigado!)" : os.formaPagamento ? ` · ${os.formaPagamento}` : ""}` : "",
    os.garantiaDias ? `🛡️ Garantia de ${os.garantiaDias} dias${garantiaAte ? ` (até ${garantiaAte})` : ""} sobre a mão de obra.` : "",
    "Qualquer coisa, é só me chamar. 👍",
  ]
    .filter(Boolean)
    .join("\n");
  const msgAvaliacao = `Olá ${primeiro}! Obrigado pela confiança no serviço. 🙏 Se puder, deixe uma avaliação rapidinha no Google — ajuda muito meu trabalho:\n${link}`;

  return (
    <Secao titulo="Conclusão e pós-venda" icone={CheckCircle2}>
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium">Assinatura do cliente</p>
          {os.assinatura && !refazer ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={os.assinatura} alt="Assinatura do cliente" className="h-32 rounded-xl border border-border bg-white object-contain" />
              <p className="text-sm text-muted">Assinado por {os.assinadoPor || "—"}</p>
              <button onClick={() => setRefazer(true)} className="btn btn-ghost px-2 py-1 text-xs">Colher novamente</button>
            </div>
          ) : (
            <div className="space-y-2">
              <PadAssinatura aoMudar={setAssinatura} />
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome de quem assinou" className="input" />
              {erro && <p className="text-sm text-danger">{erro}</p>}
              <button
                disabled={!assinatura || pendente}
                onClick={() =>
                  iniciar(async () => {
                    const e = await salvarAssinatura(os.id, assinatura, nome);
                    setErro(e);
                    if (!e) setRefazer(false);
                  })
                }
                className="btn btn-primary w-full"
              >
                Salvar assinatura
              </button>
            </div>
          )}
        </div>

        <a
          href={cliente.telefone ? linkWhatsApp(cliente.telefone, msgRelatorio) : undefined}
          target="_blank"
          className={`btn btn-whatsapp w-full ${cliente.telefone ? "" : "pointer-events-none opacity-40"}`}
        >
          <MessageCircle className="size-4" /> Enviar resumo ao cliente
        </a>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/os/${os.id}/relatorio`} target="_blank" className="btn btn-secondary px-3 py-2">
            <FileText className="size-4" /> Relatório
          </a>
          <a href={`/os/${os.id}/recibo`} target="_blank" className="btn btn-secondary px-3 py-2">
            <Receipt className="size-4" /> Recibo
          </a>
          <a href={`/os/${os.id}/fotos`} target="_blank" className="btn btn-secondary px-3 py-2">
            <Images className="size-4" /> Fotos
          </a>
          {link && !editandoLink ? (
            <a
              href={cliente.telefone ? linkWhatsApp(cliente.telefone, msgAvaliacao) : undefined}
              target="_blank"
              className={`btn btn-secondary px-3 py-2 ${cliente.telefone ? "" : "pointer-events-none opacity-40"}`}
            >
              <Star className="size-4 text-accent" /> Avaliação
            </a>
          ) : (
            <button onClick={() => setEditandoLink(true)} className="btn btn-secondary px-3 py-2">
              <Star className="size-4 text-accent" /> Avaliação
            </button>
          )}
          <Ajuda titulo="Documentos para o cliente" alinhar="direita">
            <p>Os documentos só abrem para quem está logado no app. Para o cliente, abra o documento, toque em “Salvar PDF” e compartilhe o arquivo no WhatsApp.</p>
          </Ajuda>
        </div>

        {editandoLink && (
          <div className="space-y-2 rounded-xl border border-border p-3">
            <Campo rotulo="Link de avaliação do Google">
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://g.page/r/…" className="input" />
            </Campo>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn btn-secondary" onClick={() => setEditandoLink(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    const e = await salvarConfigServicos(link, p.garantiaPadrao);
                    setErro(e);
                    if (!e) setEditandoLink(false);
                  })
                }
              >
                Salvar link
              </button>
            </div>
          </div>
        )}
      </div>
    </Secao>
  );
}
