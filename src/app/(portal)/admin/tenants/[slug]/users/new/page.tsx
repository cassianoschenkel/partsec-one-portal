import Link from "next/link";
import { notFound } from "next/navigation";
import { createTenantUserAction } from "@/app/actions/tenant-actions";
import { getAdminTenantBySlug } from "@/lib/queries/admin";
import { ArrowLeft, UserPlus, Users } from "lucide-react";

type NewTenantUserPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewTenantUserPage({
  params,
}: NewTenantUserPageProps) {
  const { slug } = await params;
  const tenant = await getAdminTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const createUserForTenant = createTenantUserAction.bind(null, tenant.slug);

  return (
    <div className="space-y-8">
      <section>
        <Link
          href={`/admin/tenants/${tenant.slug}`}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o tenant
        </Link>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          <UserPlus className="h-4 w-4" />
          Novo usuário
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Adicionar usuário
        </h2>

        <p className="mt-2 text-slate-600">
          Cadastre um novo usuário vinculado ao tenant{" "}
          <span className="font-semibold text-slate-900">{tenant.name}</span>.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <form
          action={createUserForTenant}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Users className="h-6 w-6 text-slate-800" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">Dados do usuário</h3>
              <p className="text-sm text-slate-500">
                Informações básicas e perfil de acesso.
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nome
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Ex: João Silva"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="usuario@empresa.com.br"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Perfil
              </label>
              <select
                id="role"
                name="role"
                defaultValue="TENANT_USER"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="TENANT_ADMIN">Administrador do cliente</option>
                <option value="TENANT_USER">Usuário do cliente</option>
                <option value="READ_ONLY">Somente leitura</option>
              </select>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                O perfil define o nível de acesso dentro do tenant. O admin
                global da Partsec será controlado separadamente pelo perfil
                PARTSEC_ADMIN.
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <Link
              href={`/admin/tenants/${tenant.slug}`}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-2xl bg-[#071426] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544]"
            >
              Criar usuário
            </button>
          </div>
        </form>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900">Observação</h3>

          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <p>
              Neste momento o usuário será criado sem senha, pois ainda não
              implementamos autenticação real.
            </p>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">
                Fluxo futuro recomendado:
              </div>
              <ul className="mt-2 list-inside list-disc">
                <li>criar usuário;</li>
                <li>gerar token de convite;</li>
                <li>enviar e-mail;</li>
                <li>usuário define a própria senha;</li>
                <li>login passa a validar sessão e permissões.</li>
              </ul>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
