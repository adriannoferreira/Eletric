"use client";

import { Check, Copy, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { lerStream, TextoIA } from "@/components/texto-ia";
import { Campo } from "@/components/ui";

const TIPOS = {
  instagram: {
    rotulo: "Post de Instagram",
    instrucao:
      "Crie um post de Instagram: (1) ideia da imagem/carrossel (o que fotografar ou mostrar em cada slide), (2) legenda pronta com gancho forte na primeira linha, conteúdo útil, chamada para ação para o WhatsApp, e (3) 8 a 12 hashtags locais e do nicho.",
  },
  reels: {
    rotulo: "Roteiro de Reels / TikTok",
    instrucao:
      "Crie um roteiro de vídeo curto (30–45 s) para Reels/TikTok gravado com celular na obra: gancho nos 3 primeiros segundos, cenas numeradas com o que filmar e o que falar (fala natural), texto na tela, legenda e chamada para ação. Mostre o eletricista como profissional seguro e caprichoso.",
  },
  google: {
    rotulo: "Post do Google Meu Negócio",
    instrucao:
      "Crie um post para o Perfil da Empresa no Google (Google Meu Negócio): texto de até 1.200 caracteres, com palavras que as pessoas buscam na cidade (ex.: 'eletricista em <bairro/cidade>'), benefício claro, sugestão de foto e botão de ação recomendado (Ligar / WhatsApp).",
  },
  whatsapp: {
    rotulo: "1º contato no WhatsApp",
    instrucao:
      "Escreva a resposta ideal para o primeiro contato de um cliente que pediu orçamento pelo WhatsApp: cumprimente, mostre profissionalismo, faça 3–4 perguntas de qualificação (o que precisa, local, fotos/vídeo, urgência, melhor horário para visita) e proponha o próximo passo. Dê 2 versões: uma mais curta e uma mais completa.",
  },
  objecao: {
    rotulo: "Resposta a objeção",
    instrucao:
      "Escreva respostas de WhatsApp para a objeção informada no tema (ex.: 'tá caro', 'vou pensar', 'outro faz mais barato'). Dê 3 opções de resposta com abordagens diferentes (valor/segurança, flexibilidade de pagamento, escopo alternativo), sem baixar o preço de cara e sem desmerecer concorrentes. Depois, 2 dicas curtas do que NÃO fazer.",
  },
  avaliacao: {
    rotulo: "Pedido de avaliação no Google",
    instrucao:
      "Escreva a mensagem de pós-serviço para enviar no WhatsApp 1 dia depois do serviço: agradeça, confirme que está tudo funcionando, lembre da garantia e peça uma avaliação no Google com um lugar para o link [LINK DA AVALIAÇÃO]. Dê também uma versão para pedir indicação de amigos/vizinhos.",
  },
  parceiros: {
    rotulo: "Abordagem a parceiros",
    instrucao:
      "Escreva uma abordagem de parceria para o público informado (arquiteto, síndico/administradora de condomínio, loja de material elétrico, construtora ou corretor). Inclua: mensagem inicial curta de WhatsApp, roteiro de conversa presencial de 1 minuto com a proposta de valor, e uma proposta concreta de parceria (ex.: comissão, prioridade de atendimento, manutenção preventiva mensal).",
  },
} as const;

type Tipo = keyof typeof TIPOS;

const TONS = ["Profissional e próximo", "Descontraído", "Técnico e confiável", "Urgente / promoção"];

export function GeradorConteudo() {
  const [tipo, setTipo] = useState<Tipo>("instagram");
  const [tema, setTema] = useState("");
  const [publico, setPublico] = useState("");
  const [tom, setTom] = useState(TONS[0]);
  const [resultado, setResultado] = useState("");
  const [gerando, setGerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function gerar(outraVersao = false) {
    if (gerando) return;
    setGerando(true);
    setCopiado(false);
    const anterior = resultado;
    setResultado("");
    const pedido = [
      `Tipo de conteúdo: ${TIPOS[tipo].rotulo}.`,
      TIPOS[tipo].instrucao,
      tema && `Tema / serviço: ${tema}`,
      publico && `Público-alvo: ${publico}`,
      `Tom: ${tom}`,
      outraVersao && anterior
        ? `\nJá gerei esta versão antes; faça uma versão BEM diferente (outro gancho, outra estrutura):\n---\n${anterior}\n---`
        : "",
      "\nEntregue o material pronto para copiar e usar, em Markdown simples.",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      const res = await fetch("/api/ia/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistente: "vendas", pedido, esforco: "medium" }),
      });
      await lerStream(res, setResultado);
    } catch {
      setResultado("⚠️ Sem conexão. Verifique a internet e tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  async function copiar() {
    await navigator.clipboard.writeText(resultado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
      <form
        className="card h-fit space-y-4 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          gerar();
        }}
      >
        <div>
          <span className="label">O que você quer criar?</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(Object.keys(TIPOS) as Tipo[]).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTipo(t)}
                className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${
                  tipo === t ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2"
                }`}
              >
                {TIPOS[t].rotulo}
              </button>
            ))}
          </div>
        </div>
        <Campo rotulo={tipo === "objecao" ? "Qual objeção?" : "Tema ou serviço"}>
          <input
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder={
              tipo === "objecao"
                ? "Ex.: “tá caro, o outro cobra R$ 80”"
                : "Ex.: troca de quadro antigo por disjuntores + DR"
            }
            className="input"
          />
        </Campo>
        <Campo rotulo="Público (opcional)">
          <input
            value={publico}
            onChange={(e) => setPublico(e.target.value)}
            placeholder={tipo === "parceiros" ? "Ex.: síndicos de prédios do bairro" : "Ex.: donos de casa antiga no bairro X"}
            className="input"
          />
        </Campo>
        <Campo rotulo="Tom">
          <select value={tom} onChange={(e) => setTom(e.target.value)} className="input">
            {TONS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <button className="btn btn-primary w-full" disabled={gerando}>
          {gerando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {gerando ? "Criando…" : "Gerar conteúdo"}
        </button>
      </form>

      <section className="card min-h-64 p-4">
        {resultado ? (
          <>
            <div className="mb-3 flex flex-wrap justify-end gap-2">
              <button onClick={copiar} disabled={gerando} className="btn btn-secondary">
                {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copiado ? "Copiado" : "Copiar"}
              </button>
              <button onClick={() => gerar(true)} disabled={gerando} className="btn btn-secondary">
                <RefreshCw className="size-4" /> Outra versão
              </button>
            </div>
            <TextoIA>{resultado}</TextoIA>
          </>
        ) : gerando ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" /> Criando seu conteúdo…
          </p>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center text-muted">
            <Sparkles className="size-8" />
            <p className="text-sm">Escolha o tipo, diga o tema e toque em “Gerar conteúdo”.</p>
          </div>
        )}
      </section>
    </div>
  );
}
