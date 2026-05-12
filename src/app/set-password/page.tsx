import { setPasswordAction } from "@/app/actions/password-actions";
import { KeyRound, ShieldCheck } from "lucide-react";

type SetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string;
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  if (error === "invalid_token") {
    return "Token inválido, expirado ou já utilizado.";
  }

  if (error === "password_too_short") {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }

  if (error === "password_mismatch") {
    return "As senhas informadas não conferem.";
  }

  return null;
}

export default async function SetPasswordPage({
  searchParams,
}: SetPasswordPageProps) {
  const params = searchParams ? await searchParams : {};
  const token = params.token ?? "";
  const errorMessage = getErrorMessage(params.error);

  return (
    <main className="min-h-screen bg-[#071426]">
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
              <img
                src="/images/partsec-logo.png"
                alt="Partsec"
                className="h-48 w-auto"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900">
                <KeyRound className="h-6 w-6 text-white" />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                Definir senha
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Crie sua senha de acesso ao Partsec One Portal.
              </p>
            </div>

            {!token && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                Link inválido. Solicite um novo convite à equipe Partsec.
              </div>
            )}

            {errorMessage && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errorMessage}
              </div>
            )}

            {token && (
              <form action={setPasswordAction} className="space-y-5">
                <input type="hidden" name="token" value={token} />

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Nova senha
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Digite sua nova senha"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="passwordConfirmation"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Confirmar senha
                  </label>
                  <input
                    id="passwordConfirmation"
                    name="passwordConfirmation"
                    type="password"
                    required
                    minLength={8}
                    placeholder="Confirme sua nova senha"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  className="flex w-full items-center justify-center rounded-2xl bg-[#071426] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544]"
                >
                  Definir senha
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="h-4 w-4" />
            Acesso restrito a clientes autorizados Partsec.
          </div>
        </div>
      </div>
    </main>
  );
}
