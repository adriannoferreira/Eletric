export const dynamic = "force-dynamic";

/** Páginas próprias para imprimir/salvar em PDF (sem o menu do app). */
export default function LayoutImpressao({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-white text-[#111827] print:bg-white">{children}</div>;
}
