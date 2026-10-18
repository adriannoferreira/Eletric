import {
  Bot,
  Boxes,
  Calculator,
  FileText,
  Home,
  LayoutGrid,
  type LucideIcon,
  Megaphone,
  Package,
  UserCog,
  Users,
} from "lucide-react";

export type ItemNav = { href: string; rotulo: string; icone: LucideIcon };

/** Abas fixas na barra inferior do celular. */
export const NAV_PRINCIPAL: ItemNav[] = [
  { href: "/", rotulo: "Início", icone: Home },
  { href: "/orcamentos", rotulo: "Orçamentos", icone: FileText },
  { href: "/quadros", rotulo: "Quadros", icone: LayoutGrid },
  { href: "/ia", rotulo: "IA", icone: Bot },
];

/** Demais módulos (no celular ficam em "Mais"). */
export const NAV_SECUNDARIA: ItemNav[] = [
  { href: "/clientes", rotulo: "Clientes", icone: Users },
  { href: "/vendas", rotulo: "Vendas & Marketing", icone: Megaphone },
  { href: "/calculadoras", rotulo: "Calculadoras", icone: Calculator },
  { href: "/equipamentos", rotulo: "Equipamentos", icone: Boxes },
  { href: "/catalogo", rotulo: "Catálogo de preços", icone: Package },
  { href: "/perfil", rotulo: "Meu perfil", icone: UserCog },
];

export function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
