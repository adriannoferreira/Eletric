import { Zap } from "lucide-react";
import type { Perfil } from "@/db/schema";

/** Cabeçalho com os dados do eletricista para documentos impressos. */
export function CabecalhoDoc({ perfil, titulo, numero, data }: { perfil: Perfil | null; titulo: string; numero: string; data: string }) {
  const nome = perfil?.empresa || perfil?.nome || "Serviços Elétricos";
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#111827] pb-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-[#fbbf24] text-[#1a1400] print:border print:border-black">
          <Zap className="size-6" strokeWidth={2.5} />
        </span>
        <div>
          <p className="text-lg font-bold">{nome}</p>
          {perfil?.empresa && perfil.nome && <p className="text-sm">{perfil.nome}</p>}
          <p className="text-xs text-gray-600">
            {[perfil?.telefone, perfil?.email, perfil?.cidade].filter(Boolean).join(" · ")}
          </p>
          {(perfil?.documento || perfil?.registroProfissional) && (
            <p className="text-xs text-gray-600">
              {[perfil?.documento && `CPF/CNPJ ${perfil.documento}`, perfil?.registroProfissional].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs uppercase tracking-wider text-gray-600">{titulo}</p>
        <p className="text-xl font-bold">{numero}</p>
        <p className="text-sm text-gray-600">{data}</p>
      </div>
    </header>
  );
}
