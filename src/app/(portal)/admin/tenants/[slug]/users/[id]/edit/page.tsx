import { notFound } from "next/navigation";
import {
  KeyRound,
  Save,
  ShieldCheck,
  UserCog,
  UserX,
  Trash2,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminTenantUserForEdit } from "@/lib/queries/admin-tenant-users";
import {
  deleteTenantUserAction,
  resetTenantUserPasswordAction,
  toggleTenantUserStatusAction,
  updateTenantUserAction,
} from "@/app/actions/admin-user-actions";

type EditTenantUserPageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    name?: string;
    email?: string;
    role?: string;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function EditTenantUserPage({
  params,
  searchParams,
}: EditTenantUserPageProps) {
  const { slug, id } = await params;
  const query = await searchParams;

  const data = await getAdminTenantUserForEdit({
    tenantSlug: slug,
    userId: id,
  });

  if (!data || !data.user) {
    notFound();
  }

  const { tenant, user } = data;

  const updateUser = updateTenantUserAction.bind(null, {
    tenantSlug: tenant.slug,
    userId: user.id,
  });

  const toggleUserStatus = toggleTenantUserStatusAction.bind(null, {
    tenantSlug: tenant.slug,
    userId: user.id,
  });

  const resetPassword = resetTenantUserPasswordAction.bind(null, {
    tenantSlug: tenant.slug,
    userId: user.id,
  });
  
  const deleteUser = deleteTenantUserAction.bind(null, {
  tenantSlug: tenant.slug,
  userId: user.id,
 });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        backHref={`/admin/tenants/${tenant.slug}`}
        backLabel="Voltar para o tenant"
        badgeLabel="Usuário do tenant"
        badgeIcon={UserCog}
        title={`Editar usuário — ${user.name}`}
        description={
          <>
            Edite o usuário vinculado ao tenant{" "}
            <span className="font-semibold text-slate-900">
              {tenant.name}
            </span>
            .
          </>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <form
          action={updateUser}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-950">
              Dados do usuário
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Atualize nome, e-mail e perfil de acesso dentro do tenant.
            </p>
          </div>
		  {query.error && (
		  <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
			{query.error}
		  </div>
		  )}

          <div className="grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Nome
              </label>
              <input
                name="name"
                type="text"
                required
                defaultValue={query.name ?? user.name}
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
                defaultValue={query.email ?? user.email}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Perfil
              </label>
              <select
                name="role"
                defaultValue={query.role ?? user.role}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="ADMIN_TENANT">Administrador do tenant</option>
                <option value="VIEWER_TENANT">Visualizador do tenant</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div>
                <span className="font-semibold text-slate-900">Status:</span>{" "}
                {user.isActive ? "Ativo" : "Inativo"}
              </div>
              <div className="mt-1">
                <span className="font-semibold text-slate-900">Criado em:</span>{" "}
                {formatDate(user.createdAt)}
              </div>
              <div className="mt-1">
                <span className="font-semibold text-slate-900">
                  Atualizado em:
                </span>{" "}
                {formatDate(user.updatedAt)}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#071426] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544]"
            >
              <Save className="h-4 w-4" />
              Salvar alterações
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-950">
                Status de acesso
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ative ou desative o acesso deste usuário ao portal.
              </p>
            </div>

            <form action={toggleUserStatus}>
              <button
                type="submit"
                className={
                  user.isActive
                    ? "inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
                    : "inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
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
          </section>
		  
		  <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
		  <div className="mb-4">
			<h2 className="text-lg font-bold text-red-800">
			  Excluir usuário
			</h2>
			<p className="mt-1 text-sm leading-6 text-red-700">
			  Remove definitivamente este usuário do tenant. Esta ação não deve ser
			  usada para bloqueios temporários; nesse caso, prefira desativar o acesso.
			</p>
		  </div>

		  <form action={deleteUser}>
			<button
			  type="submit"
			  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-300 bg-white px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
			>
			  <Trash2 className="h-4 w-4" />
			  Excluir usuário
			</button>
		  </form>
		  </section>

          <form
            action={resetPassword}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-white p-3">
                <KeyRound className="h-5 w-5 text-slate-800" />
              </div>

              <div>
                <h2 className="font-bold text-slate-950">Redefinir senha</h2>
                <p className="text-xs text-slate-500">
                  Define uma nova senha temporária e reativa o usuário.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <input
                name="password"
                type="password"
                minLength={10}
                autoComplete="new-password"
                placeholder="Nova senha temporária"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />

              <input
                name="confirmPassword"
                type="password"
                minLength={10}
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
      </section>
    </div>
  );
}
