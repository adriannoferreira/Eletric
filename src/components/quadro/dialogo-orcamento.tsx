"use client";

import { FileText, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Campo } from "@/components/ui";
import { Folha } from "./folha";

/**
 * Botão que cria um orçamento a partir do quadro (ou das pendências). Se o
 * quadro não tiver cliente, pede para escolher um ou cadastrar.
 */
export function BotaoOrcamento({
  rotulo = "Gerar orçamento",
  clienteId,
  clientes,
  aviso,
  acao,
  className = "btn btn-secondary",
}: {
  rotulo?: string;
  clienteId: number | null;
  clientes: { id: number; nome: string }[];
  aviso?: string;
  acao: (clienteId: number | null) => Promise<string | void>;
  className?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [escolhido, setEscolhido] = useState<number | null>(clienteId);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const executar = (cid: number | null) =>
    iniciar(async () => {
      setErro(null);
      const r = await acao(cid);
      if (r) setErro(r);
    });

  return (
    <>
      <button
        className={className}
        disabled={pendente}
        onClick={() => {
          if (aviso && !confirm(aviso)) return;
          if (clienteId) executar(clienteId);
          else setAberto(true);
        }}
      >
        {pendente ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} {rotulo}
      </button>
      {erro && !aberto && <p className="text-sm text-danger">{erro}</p>}
      <Folha titulo="Para qual cliente?" aberta={aberto} aoFechar={() => setAberto(false)}>
        <div className="space-y-4">
          <Campo rotulo="Cliente">
            <select value={escolhido ?? ""} onChange={(e) => setEscolhido(Number(e.target.value) || null)} className="input">
              <option value="">Escolha…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Link href="/clientes/novo" className="btn btn-ghost">
            <UserPlus className="size-4" /> Cadastrar novo cliente
          </Link>
          {erro && <p className="text-sm text-danger">{erro}</p>}
          <button className="btn btn-primary w-full" disabled={!escolhido || pendente} onClick={() => executar(escolhido)}>
            {pendente ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} Criar orçamento
          </button>
          <p className="text-xs text-muted">O cliente escolhido também fica vinculado ao quadro.</p>
        </div>
      </Folha>
    </>
  );
}
