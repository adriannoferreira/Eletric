import { PaginaChat } from "@/components/chat/pagina-chat";
import { SUGESTOES_VENDAS } from "@/components/vendas/sugestoes";

export const metadata = { title: "Consultor de Vendas" };

export default function ConsultorPage() {
  return (
    <PaginaChat
      assistente="vendas"
      basePath="/vendas/consultor"
      titulo="Consultor de Vendas"
      subtitulo="Preço, WhatsApp e redes"
      sugestoes={SUGESTOES_VENDAS}
    />
  );
}
