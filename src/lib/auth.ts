import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "eletric_sessao";
const DURACAO_DIAS = 30;

function segredo() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não configurado.");
  return new TextEncoder().encode(s);
}

export async function criarSessao() {
  const token = await new SignJWT({ sub: "dono" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_DIAS}d`)
    .sign(segredo());
  return { token, maxAge: DURACAO_DIAS * 24 * 60 * 60 };
}

export async function sessaoValida(token: string | undefined) {
  if (!token) return false;
  try {
    await jwtVerify(token, segredo());
    return true;
  } catch {
    return false;
  }
}
