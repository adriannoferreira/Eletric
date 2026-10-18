"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renderiza a resposta da IA (Markdown) com estilos legíveis no celular. */
export function TextoIA({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed [&_a]:text-info [&_a]:underline [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_table]:w-full [&_table]:text-sm [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-surface-2 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-5">
      <div className="overflow-x-auto">
        <Markdown remarkPlugins={[remarkGfm]}>{children}</Markdown>
      </div>
    </div>
  );
}

/** Lê uma resposta em streaming de /api/ia/* chamando `aoReceber` com o texto acumulado. */
export async function lerStream(res: Response, aoReceber: (acumulado: string) => void) {
  if (!res.body) {
    aoReceber(await res.text());
    return;
  }
  const leitor = res.body.getReader();
  const dec = new TextDecoder();
  let acumulado = "";
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    acumulado += dec.decode(value, { stream: true });
    aoReceber(acumulado);
  }
}
