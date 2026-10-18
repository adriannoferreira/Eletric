const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const num = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const data = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });

export const reais = (v: number) => brl.format(v || 0);
export const numero = (v: number) => num.format(v || 0);
export const dataCurta = (d: Date | string | null | undefined) =>
  d ? data.format(typeof d === "string" ? new Date(d) : d) : "—";

/** Link wa.me a partir de um telefone brasileiro em qualquer formato. */
export function linkWhatsApp(telefone: string, texto?: string) {
  let digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) digitos = "55" + digitos;
  const q = texto ? `?text=${encodeURIComponent(texto)}` : "";
  return digitos ? `https://wa.me/${digitos}${q}` : `https://wa.me/${q}`;
}

export function diasDesde(d: Date | string | null | undefined) {
  if (!d) return null;
  const t = typeof d === "string" ? new Date(d) : d;
  return Math.floor((Date.now() - t.getTime()) / 86_400_000);
}
