"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { criarSessao, SESSION_COOKIE } from "@/lib/auth";

function senhaConfere(digitada: string) {
  const certa = process.env.APP_PASSWORD ?? "";
  const a = Buffer.from(digitada);
  const b = Buffer.from(certa);
  return certa.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export async function entrar(_: string | null, form: FormData) {
  const senha = String(form.get("senha") ?? "");
  if (!senhaConfere(senha)) return "Senha incorreta.";

  const { token, maxAge } = await criarSessao();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  const destino = String(form.get("de") ?? "/");
  redirect(destino.startsWith("/") && !destino.startsWith("//") ? destino : "/");
}

export async function sair() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
