import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#071426]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="hidden bg-[#071426] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex rounded-2xl bg-white px-5 py-4">
              <img
                src="/images/partsec-logo.png"
                alt="Partsec"
                className="h-52 w-auto"
              />
            </div>

            <div className="mt-16 max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                <ShieldCheck className="h-4 w-4" />
                Partsec One Customer Portal
              </div>

              <h1 className="text-5xl font-bold tracking-tight">
                Segurança, monitoramento e atendimento em uma única visão.
              </h1>

              <p className="mt-6 text-lg leading-8 text-slate-300">
                Acompanhe indicadores do seu ambiente, alertas relevantes,
                ativos monitorados, chamados e relatórios operacionais do
                serviço Partsec One.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-2xl font-bold text-white">24x7</div>
              <div className="mt-1 text-slate-300">Visibilidade</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-2xl font-bold text-white">SIEM</div>
              <div className="mt-1 text-slate-300">Segurança</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-2xl font-bold text-white">SLA</div>
              <div className="mt-1 text-slate-300">Operação</div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-100 px-6 py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center lg:hidden">
              <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
                <img
                  src="/images/partsec-logo.png"
                  alt="Partsec"
                  className="h-12 w-auto"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900">
                  <LockKeyhole className="h-6 w-6 text-white" />
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                  Acessar portal
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Entre com suas credenciais para acessar o ambiente do cliente.
                </p>
              </div>

              <form className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="seu.email@empresa.com.br"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Lembrar acesso
                  </label>

                  <a href="#" className="font-semibold text-slate-900">
                    Esqueci minha senha
                  </a>
                </div>

                <Link
                  href="/dashboard"
                  className="flex w-full items-center justify-center rounded-2xl bg-[#071426] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544]"
                >
                  Entrar
                </Link>
              </form>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              Acesso restrito a clientes autorizados do Partsec One.
              <br />
              © Partsec. Todos os direitos reservados.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

