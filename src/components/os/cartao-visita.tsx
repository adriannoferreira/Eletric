"use client";

import { AlertTriangle, MapPin, MessageCircle, Navigation, Phone, Play } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { mudarStatusOS } from "@/app/(app)/os/actions";
import { Badge } from "@/components/ui";
import { linkWhatsApp } from "@/lib/formato";
import { hora, STATUS_OS, type StatusOS } from "@/lib/servicos/os";

export type VisitaAgenda = {
  id: number;
  inicio: Date;
  duracaoMin: number;
  status: string;
  osId: number;
  osStatus: string;
  titulo: string;
  cliente: string;
  telefone: string;
  endereco: string;
};

export function CartaoVisita({ v, conflito, atrasada }: { v: VisitaAgenda; conflito: boolean; atrasada: boolean }) {
  const [pendente, iniciar] = useTransition();
  const fim = new Date(v.inicio.getTime() + v.duracaoMin * 60_000);
  const st = STATUS_OS[v.osStatus as StatusOS] ?? STATUS_OS.agendada;
  const cancelada = v.status === "cancelada";

  return (
    <div className={`card flex gap-3 p-3.5 ${cancelada ? "opacity-50" : ""}`}>
      <div className="w-14 shrink-0 text-center">
        <p className="text-lg font-bold leading-tight">{hora(v.inicio)}</p>
        <p className="text-xs text-muted">{hora(fim)}</p>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Link href={`/os/${v.osId}`} className="block">
          <p className={`truncate font-semibold ${cancelada ? "line-through" : ""}`}>{v.titulo}</p>
          <p className="truncate text-sm text-muted">{v.cliente}</p>
        </Link>
        {v.endereco && <p className="flex items-start gap-1 text-xs text-muted"><MapPin className="mt-0.5 size-3 shrink-0" />{v.endereco}</p>}
        <div className="flex flex-wrap items-center gap-1.5">
          {v.status === "realizada" ? <Badge tom="ok">Realizada</Badge> : cancelada ? <Badge>Cancelada</Badge> : <Badge tom={st.tom}>{st.rotulo}</Badge>}
          {conflito && <Badge tom="perigo"><AlertTriangle className="mr-1 size-3" />Conflito</Badge>}
          {atrasada && <Badge tom="perigo">Atrasada</Badge>}
        </div>
        {!cancelada && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {v.osStatus === "agendada" && v.status === "agendada" && (
              <button
                disabled={pendente}
                onClick={() => iniciar(async () => void (await mudarStatusOS(v.osId, "em_andamento")))}
                className="btn btn-primary px-3 py-1.5 text-xs"
              >
                <Play className="size-3.5" /> Iniciar
              </button>
            )}
            {v.osStatus !== "agendada" && (
              <Link href={`/os/${v.osId}`} className="btn btn-secondary px-3 py-1.5 text-xs">Abrir OS</Link>
            )}
            {v.telefone && (
              <>
                <a href={`tel:${v.telefone.replace(/\D/g, "")}`} className="btn btn-secondary p-2" aria-label="Ligar"><Phone className="size-3.5" /></a>
                <a href={linkWhatsApp(v.telefone)} target="_blank" className="btn btn-secondary p-2 text-[#25d366]" aria-label="WhatsApp"><MessageCircle className="size-3.5" /></a>
              </>
            )}
            {v.endereco && (
              <>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.endereco)}`} target="_blank" className="btn btn-secondary p-2" aria-label="Abrir no mapa"><MapPin className="size-3.5" /></a>
                <a href={`https://waze.com/ul?q=${encodeURIComponent(v.endereco)}&navigate=yes`} target="_blank" className="btn btn-secondary p-2" aria-label="Abrir no Waze"><Navigation className="size-3.5" /></a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
