import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessaoValida } from "@/lib/auth";

/** Rotas que não exigem login: tela de login, link público do orçamento e cron (protegido por CRON_SECRET). */
const PUBLICAS = ["/login", "/o/", "/api/cron/"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLICAS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const ok = await sessaoValida(request.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("de", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sw.js|icons/).*)",
  ],
};
