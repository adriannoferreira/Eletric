"use client";

import { CalendarDays, CheckCircle2, ChevronLeft, ClipboardCheck, Clock, ExternalLink, FileText, Gauge, Image as ImageIcon, Images, MapPin, MessageCircle, MoreVertical, Navigation, Package, Pause, Pencil, Phone, Play, Receipt, RotateCcw, Save, Star, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { excluirOS, mudarStatusOS, salvarAssinatura, salvarCamposOS, salvarConfigServicos } from "@/app/(app)/os/actions";
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

export function PainelOS(p: Props) {
  const { os, cliente } = p;
  const [pendente, iniciar] = useTransition();
  const [menu, setMenu] = useState(false);
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
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>OS {os.id}</span>
            <Badge tom={st.tom}>{st.rotulo}</Badge>
            {os.categoria !== "Geral" && <Badge>{os.categoria}</Badge>}
          </div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">{os.titulo}</h1>
          <Link href={`/clientes/${cliente.id}`} className="text-sm text-muted hover:underline">{cliente.nome}</Link>
        </div>
        <div className="relative">
          <button onClick={() => setMenu(!menu)} className="btn btn-ghost p-2" aria-label="Mais ações">
            <MoreVertical className="size-5" />
          </button>
          {menu && (
            <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-xl" onClick={() => setMenu(false)}>
              {p.orcamento && (
                <Link href={`/orcamentos/${p.orcamento.id}`} className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-surface-2">
                  <FileText className="size-4" /> Ver orçamento
                </Link>
              )}
              {os.quadroId && (
                <Link href={`/quadros/${os.quadroId}`} className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-surface-2">
                  <ExternalLink className="size-4" /> Ver quadro
                </Link>
              )}
              {os.status !== "cancelada" && os.status !== "concluida" && (
                <button onClick={() => confirm("Cancelar esta OS?") && status("cancelada")} className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-surface-2">
                  <XCircle className="size-4" /> Cancelar OS
                </button>
              )}
              <button onClick={() => confirm("Excluir esta OS e tudo o que foi registrado nela?") && iniciar(() => excluirOS(os.id))} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-surface-2">
                <Trash2 className="size-4" /> Excluir OS
              </button>
            </div>
          )}
        </div>
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
      {endereco && <p className="-mt-2 text-sm text-muted">📍 {endereco}</p>}

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
          <p className="flex-1 rounded-xl bg-surface-2 p-3 text-sm text-muted">OS cancelada. Agende uma visita para reativar.</p>
        )}
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}

      {os.descricao && (
        <p className="whitespace-pre-wrap rounded-2xl bg-surface-2 p-4 text-sm">{os.descricao}</p>
      )}

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

      <Secao titulo="Fotos" icone={ImageIcon}>
        <Fotos osId={os.id} fotos={p.fotos} />
      </Secao>

      <Secao titulo="Medições elétricas" icone={Gauge}>
        <Medicoes osId={os.id} titulo={os.titulo} medicoes={p.medicoes} instrumentos={p.instrumentos} analise={os.analiseMedicoes} />
      </Secao>

      <DadosPagamento os={os} />

      <Conclusao {...p} />
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
      titulo="Dados, garantia e pagamento"
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
      <div className="grid gap-3 md:grid-cols-2">
        <Campo rotulo="Título" className="md:col-span-2">
          <input value={c.titulo} onChange={(e) => set("titulo", e.target.value)} className="input" />
        </Campo>
        <Campo rotulo="Endereço do serviço" className="md:col-span-2">
          <input value={c.endereco} onChange={(e) => set("endereco", e.target.value)} className="input" />
        </Campo>
        <Campo rotulo="Descrição do serviço" className="md:col-span-2">
          <textarea value={c.descricao} onChange={(e) => set("descricao", e.target.value)} rows={3} className="input" />
        </Campo>
        <Campo rotulo="Observações / ocorrências" className="md:col-span-2">
          <textarea value={c.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} placeholder="Ex.: encontrado neutro com emenda derretida; cliente vai comprar tomada nova" className="input" />
        </Campo>
        <Campo rotulo="Garantia (dias)">
          <input type="number" min={0} value={c.garantiaDias} onChange={(e) => set("garantiaDias", Math.max(0, Number(e.target.value) || 0))} className="input" />
        </Campo>
        <Campo rotulo="Valor cobrado (R$)">
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
        <Campo rotulo="Forma de pagamento">
          <input value={c.formaPagamento} onChange={(e) => set("formaPagamento", e.target.value)} placeholder="PIX, dinheiro, cartão…" className="input" />
        </Campo>
        <Campo rotulo="Situação">
          <select value={c.pagamento} onChange={(e) => set("pagamento", e.target.value as "pago" | "a_receber")} className="input">
            <option value="a_receber">A receber</option>
            <option value="pago">Pago</option>
          </select>
        </Campo>
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

        <div className="grid gap-2 sm:grid-cols-2">
          <a href={`/os/${os.id}/relatorio`} target="_blank" className="btn btn-secondary">
            <FileText className="size-4" /> Relatório / PDF
          </a>
          <a href={`/os/${os.id}/recibo`} target="_blank" className="btn btn-secondary">
            <Receipt className="size-4" /> Recibo
          </a>
          <a href={`/os/${os.id}/fotos`} target="_blank" className="btn btn-secondary">
            <Images className="size-4" /> Relatório fotográfico
          </a>
          <a
            href={cliente.telefone ? linkWhatsApp(cliente.telefone, msgRelatorio) : undefined}
            target="_blank"
            className={`btn btn-whatsapp ${cliente.telefone ? "" : "pointer-events-none opacity-40"}`}
          >
            <MessageCircle className="size-4" /> Enviar resumo
          </a>
          {link && !editandoLink ? (
            <a href={cliente.telefone ? linkWhatsApp(cliente.telefone, msgAvaliacao) : undefined} target="_blank" className={`btn btn-secondary ${cliente.telefone ? "" : "pointer-events-none opacity-40"}`}>
              <Star className="size-4 text-accent" /> Pedir avaliação
            </a>
          ) : (
            <button onClick={() => setEditandoLink(true)} className="btn btn-secondary">
              <Star className="size-4 text-accent" /> Configurar avaliação
            </button>
          )}
        </div>
        <p className="text-xs text-muted">
          O relatório só abre para quem está logado no app. Para o cliente, mande o PDF: abra o relatório, toque em
          “Salvar PDF” e compartilhe o arquivo no WhatsApp.
        </p>

        {editandoLink && (
          <div className="space-y-2 rounded-xl border border-border p-3">
            <Campo rotulo="Link de avaliação do Google Meu Negócio" dica="No seu perfil do Google: Pedir avaliações → copiar link">
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
