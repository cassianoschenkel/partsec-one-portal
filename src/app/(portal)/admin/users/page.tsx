import Link from "next/link";
import {
  KeyRound,
  Plus,
  ShieldCheck,
  UserCog,
  UserX,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminGlobalUsers } from "@/lib/queries/admin-users";
import {
  resetGlobalAdminUserPasswordAction,
  toggleGlobalAdminUserStatusAction,
} from "@/app/actions/admin-user-actions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AdminUsersPage() {
  const users = await getAdminGlobalUsers();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        backHref="/admin/tenants"
        backLabel="Voltar para tenants"
        badgeLabel="Usuários"
        badgeIcon={UserCog}
        title="Administradores globais"
        description="Gerencie os usuários com acesso administrativo global ao Partsec One Portal."
      />

      <section className="flex justify-end">
        <Link
          href="/admin/users/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#071426] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544]"
        >
          <Plus className="h-4 w-4" />
          Novo administrador global
        </Link>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-950">
            Usuários PARTSEC_ADMIN
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Usuários com permissão administrativa global no portal.
          </p>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
              <UserCog className="h-6 w-6 text-amber-700" />
            </div>

            <h3 className="text-base font-bold text-slate-950">
              Nenhum administrador global encontrado
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Crie pelo menos um usuário administrativo global.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((user) => {
              const toggleUserStatus =
                toggleGlobalAdminUserStatusAction.bind(null, user.id);

              const resetPassword =
                resetGlobalAdminUserPasswordAction.bind(null, user.id);

              return (
                <div
                  key={user.id}
                  className="grid gap-6 p-6 xl:grid-cols-[1fr_360px]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-bold text-slate-950">
                        {user.name}
                      </h3>

                      <span
                        className={
                          user.isActive
                            ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                            : "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                        }
                      >
                        {user.isActive ? "Ativo" : "Inativo"}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {user.role}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">
                      {user.email}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      Criado em {formatDate(user.createdAt)} · Atualizado em{" "}
                      {formatDate(user.updatedAt)}
                    </p>

                    <form action={toggleUserStatus} className="mt-5">
                      <button
                        type="submit"
                        className={
                          user.isActive
                            ? "inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
                            : "inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
                        }
                      >
                        {user.isActive ? (
                          <>
                            <UserX className="h-4 w-4" />
                            Desativar usuário
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4" />
                            Ativar usuário
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  <form
                    action={resetPassword}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-2xl bg-white p-3">
                        <KeyRound className="h-5 w-5 text-slate-800" />
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-950">
                          Redefinir senha
                        </h4>
                        <p className="text-xs text-slate-500">
                          Define uma nova senha temporária.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <input
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Nova senha temporária"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                      />

                      <input
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Confirmar nova senha"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                      />
                    </div>

                    <button
                      type="submit"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                    >
                      <KeyRound className="h-4 w-4" />
                      Redefinir senha
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
