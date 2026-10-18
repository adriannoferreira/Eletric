import { notFound } from "next/navigation";
import { PaginaChat } from "@/components/chat/pagina-chat";
import { SUGESTOES_ELETRICA } from "../sugestoes";

export const metadata = { title: "IA Especialista" };

export default async function ConversaIAPage({ params }: PageProps<"/ia/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <PaginaChat
      assistente="eletrica"
      basePath="/ia"
      conversaId={id}
      titulo="IA Especialista em Elétrica"
      subtitulo="NBR 5410 e NR-10"
      sugestoes={SUGESTOES_ELETRICA}
    />
  );
}
