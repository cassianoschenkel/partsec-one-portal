import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { getCustomerSettingsByTenantId } from "@/lib/queries/customer-settings";
import { toCustomerIntegrationView } from "@/lib/customer-settings-view";
import { Building2, Plug, Users } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "PARTSEC_ADMIN") {
    redirect("/admin/tenants");
  }

  if (!session.user.tenantId) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800">
        Usuário sem tenant vinculado.
      </div>
    );
  }

  const tenant = await getCustomerSettingsByTenantId(session.user.tenantId);

  if (!tenant) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800">
        Tenant não encontrado.
      </div>
    );
  }

  const integrations = tenant.integrations.map(toCustomerIntegrationView);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Configurações
        </h2>
        <p className="mt-2 text-slate-600">
          Dados do cliente, usuários autorizados e serviços disponíveis no
          Partsec One.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Building2 className="h-6 w-6 text-slate-800" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Tenant</h3>
              <p className="text-sm text-slate-500">Dados do cliente</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold text-slate-700">Nome</div>
              <div className="text-slate-600">{tenant.name}</div>
            </div>

            <div>
              <div className="font-semibold text-slate-700">Documento</div>
              <div className="text-slate-600">
                {tenant.document ?? "Não informado"}
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-700">Status</div>
              <div className="text-slate-600">
                {tenant.isActive ? "Ativo" : "Inativo"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Users className="h-6 w-6 text-slate-800" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Usuários</h3>
              <p className="text-sm text-slate-500">
                Usuários vinculados a este tenant.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome</th>
                  <th className="px-4 py-3 font-semibold">E-mail</th>
                  <th className="px-4 py-3 font-semibold">Perfil</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tenant.users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {user.role}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {user.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <Plug className="h-6 w-6 text-slate-800" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Integrações</h3>
            <p className="text-sm text-slate-500">
              Serviços de monitoramento, segurança e suporte do cliente.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="font-semibold text-slate-900">
                {integration.label}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {integration.description}
              </div>
              <div className="mt-3 text-xs font-semibold text-slate-600">
                {integration.statusLabel}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
