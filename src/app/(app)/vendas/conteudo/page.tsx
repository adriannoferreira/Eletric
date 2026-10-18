import { Cabecalho } from "@/components/ui";
import { GeradorConteudo } from "@/components/vendas/gerador-conteudo";

export const metadata = { title: "Conteúdo com IA" };

export default function ConteudoPage() {
  return (
    <>
      <Cabecalho titulo="Conteúdo com IA" subtitulo="Posts, roteiros e mensagens prontos para usar" />
      <GeradorConteudo />
    </>
  );
}
