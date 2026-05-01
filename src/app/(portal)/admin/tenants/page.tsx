import Link from "next/link";
import { getAdminTenantsOverview } from "@/lib/queries/admin";
import {
  Building2,
  CheckCircle2,
  Database,
  Plug,
  Users,
} from "lucide-react";

export default async function AdminTenantsPage() {
  const tenants = await getAdminTenantsOverview();

  const activeTenants = tenants.filter((tenant) => tenant.isActive).length;
  const totalUsers = tenants.reduce(
    (total, tenant) => total + tenant._count.users,
    0
  );
  const totalAssets = tenants.reduce(
    (total, tenant) => total + tenant._count.assets,
    0
  );

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            <Database className="h-4 w-4" />
            Administração Partsec
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Tenants
          </h2>

          <p className="mt-2 text-slate-600">
            Visão administrativa dos clientes configurados no Partsec One.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 rounded-2xl bg-slate-100 p-3 w-fit">
            <Building2 className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Total de tenants
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {tenants.length}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 rounded-2xl bg-emerald-50 p-3 w-fit">
            <CheckCircle2 className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Tenants ativos
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {activeTenants}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 rounded-2xl bg-slate-100 p-3 w-fit">
            <Users className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Usuários
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {totalUsers}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 rounded-2xl bg-slate-100 p-3 w-fit">
            <Plug className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Ativos monitorados
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {totalAssets}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-900">
            Clientes cadastrados
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Lista de tenants configurados na base multi-tenant.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Usuários</th>
                <th className="px-4 py-3 font-semibold">Ativos</th>
                <th className="px-4 py-3 font-semibold">Integrações</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-4 py-3 font-semibold text-slate-900">
		    <Link
		    href={`/admin/tenants/${tenant.slug}`}
		    className="transition hover:text-[#0f3b73] hover:underline"
		    >
		    {tenant.name}
		  </Link>
                  </td>

                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {tenant.slug}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {tenant._count.users}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {tenant._count.assets}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {tenant._count.integrations}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={
                        tenant.isActive
                          ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                          : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                      }
                    >
                      {tenant.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
