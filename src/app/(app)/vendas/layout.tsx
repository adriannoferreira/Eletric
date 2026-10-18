import { AbasVendas } from "@/components/vendas/abas";

export default function VendasLayout({ children }: LayoutProps<"/vendas">) {
  return (
    <>
      <AbasVendas />
      {children}
    </>
  );
}
