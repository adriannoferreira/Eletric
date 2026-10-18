import { PaginaChat } from "@/components/chat/pagina-chat";
import { SUGESTOES_ELETRICA } from "./sugestoes";

export const metadata = { title: "IA Especialista" };

export default function IAPage() {
  return (
    <PaginaChat
      assistente="eletrica"
      basePath="/ia"
      titulo="IA Especialista em Elétrica"
      subtitulo="NBR 5410 e NR-10"
      sugestoes={SUGESTOES_ELETRICA}
    />
  );
}
