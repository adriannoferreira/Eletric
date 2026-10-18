import { notFound } from "next/navigation";
import { PaginaChat } from "@/components/chat/pagina-chat";
import { SUGESTOES_VENDAS } from "@/components/vendas/sugestoes";

export const metadata = { title: "Consultor de Vendas" };

export default async function ConversaConsultorPage({ params }: PageProps<"/vendas/consultor/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <PaginaChat
      assistente="vendas"
      basePath="/vendas/consultor"
      conversaId={id}
      titulo="Consultor de Vendas"
      subtitulo="Preço, WhatsApp, Google, Instagram e parcerias"
      sugestoes={SUGESTOES_VENDAS}
    />
  );
}
