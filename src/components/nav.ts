import {
  BookOpen,
  Bot,
  Boxes,
  CalendarDays,
  Calculator,
  ClipboardList,
  Stethoscope,
  FileText,
  Home,
  LayoutGrid,
  type LucideIcon,
  Megaphone,
  Package,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

export type ItemNav = { href: string; rotulo: string; icone: LucideIcon; /** Rótulo curto da barra inferior. */ curto?: string };

/** Abas fixas na barra inferior do celular. */
export const NAV_PRINCIPAL: ItemNav[] = [
  { href: "/", rotulo: "Início", icone: Home },
  { href: "/agenda", rotulo: "Agenda", icone: CalendarDays },
  { href: "/orcamentos", rotulo: "Orçamentos", icone: FileText, curto: "Orçam." },
  { href: "/quadros", rotulo: "Quadros", icone: LayoutGrid },
  { href: "/ia", rotulo: "IA", icone: Bot },
];

/** Demais módulos, agrupados (no celular ficam em "Mais"). */
export const GRUPOS_NAV: { titulo: string; itens: ItemNav[] }[] = [
  {
    titulo: "Trabalho",
    itens: [
      { href: "/os", rotulo: "Ordens de serviço", icone: ClipboardList, curto: "OS" },
      { href: "/clientes", rotulo: "Clientes", icone: Users },
      { href: "/servicos", rotulo: "Serviços", icone: Wrench },
    ],
  },
  {
    titulo: "Ferramentas",
    itens: [
      { href: "/diagnostico", rotulo: "Diagnóstico IA", icone: Stethoscope, curto: "Diagnóstico" },
      { href: "/calculadoras", rotulo: "Calculadoras", icone: Calculator },
      { href: "/normas", rotulo: "Normas Equatorial", icone: BookOpen, curto: "Normas" },
    ],
  },
  {
    titulo: "Negócio",
    itens: [
      { href: "/vendas", rotulo: "Vendas & Marketing", icone: Megaphone, curto: "Vendas" },
      { href: "/catalogo", rotulo: "Catálogo de preços", icone: Package, curto: "Preços" },
      { href: "/equipamentos", rotulo: "Equipamentos", icone: Boxes },
    ],
  },
  {
    titulo: "Conta",
    itens: [{ href: "/perfil", rotulo: "Meu perfil", icone: UserCog, curto: "Perfil" }],
  },
];

export const NAV_SECUNDARIA: ItemNav[] = GRUPOS_NAV.flatMap((g) => g.itens);

export function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
