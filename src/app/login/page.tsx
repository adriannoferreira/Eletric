import { Zap } from "lucide-react";
import { FormLogin } from "./form";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { de } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-fg shadow-lg">
            <Zap className="size-7" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Eletric</h1>
            <p className="text-sm text-muted">Seu auxiliar de eletricista</p>
          </div>
        </div>
        <FormLogin de={typeof de === "string" ? de : "/"} />
      </div>
    </main>
  );
}
