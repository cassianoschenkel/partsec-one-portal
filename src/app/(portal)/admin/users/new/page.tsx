import { KeyRound, Save, UserCog } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createGlobalAdminUserAction } from "@/app/actions/admin-user-actions";

type NewAdminUserPageProps = {
  searchParams: Promise<{
    error?: string;
    name?: string;
    email?: string;
  }>;
};

export default async function NewAdminUserPage({
  searchParams,
}: NewAdminUserPageProps) {
  const params = await searchParams;
  return (
    <div className="space-y-8">
      <AdminPageHeader
        backHref="/admin/users"
        backLabel="Voltar para usuários"
        badgeLabel="Novo usuário"
        badgeIcon={UserCog}
        title="Criar administrador global"
        description="Crie um novo usuário com permissão administrativa global no Partsec One Portal."
      />
        {params.error && (
		  <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
			{params.error}
		  </div>
		)}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={createGlobalAdminUserAction} className="max-w-2xl">
          <div className="grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Nome
              </label>
              <input
                name="name"
                type="text"
                required
				defaultValue={params.name ?? ""}
                placeholder="Ex: Administrador Partsec"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                E-mail
              </label>
              <input
                name="email"
                type="email"
                required
				defaultValue={params.email ?? ""}
                placeholder="admin@partsec.com.br"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3">
                  <KeyRound className="h-5 w-5 text-slate-800" />
                </div>

                <div>
                  <h3 className="font-bold text-slate-950">
                    Senha temporária
                  </h3>
                  <p className="text-xs text-slate-500">
                    O usuário poderá trocar a senha posteriormente quando o
                    fluxo de alteração de senha estiver disponível.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Senha
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={10}
                    autoComplete="new-password"
                    placeholder="Mínimo 10 caracteres"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Confirmar senha
                  </label>
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={10}
                    autoComplete="new-password"
                    placeholder="Repita a senha"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#071426] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544]"
            >
              <Save className="h-4 w-4" />
              Criar administrador global
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
