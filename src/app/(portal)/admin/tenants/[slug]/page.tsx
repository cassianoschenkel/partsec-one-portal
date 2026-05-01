import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminTenantBySlug } from "@/lib/queries/admin";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  MonitorCheck,
  Plug,
  Users,
} from "lucide-react";

type AdminTenantDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AdminTenantDetailPage({
  params,
}: AdminTenantDetailPageProps) {
  const { slug } = await params;
  const tenant = await getAdminTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const activeUsers = tenant.users.filter((user) => user.isActive);
  const activeAssets = tenant.assets.filter((asset) => asset.isActive);
  const activeIntegrations = tenant.integrations.filter(
    (integration) => integration.status === "ACTIVE"
  );

  return (
    <div className="space-y-8">
      <section>
        <Link
          href="/admin/tenants"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para tenants
        </Link>

        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              <Building2 className="h-4 w-4" />
              Administração do tenant
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {tenant.name}
            </h2>

            <p className="mt-2 text-slate-600">
              Visão administrativa completa do cliente no Partsec One.
            </p>
          </div>

          <div>
            <span
              className={
                tenant.isActive
                  ? "rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700"
                  : "rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600"
              }
            >
              {tenant.isActive ? "Tenant ativo" : "Tenant inativo"}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <Users className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Usuários ativos
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {activeUsers.length}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <MonitorCheck className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Ativos ativos
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {activeAssets.length}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <Plug className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Integrações ativas
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {activeIntegrations.length}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-emerald-50 p-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Status geral
          </div>
          <div className="mt-2 text-xl font-bold text-slate-950">
            Em implantação
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Building2 className="h-6 w-6 text-slate-800" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Dados do tenant</h3>
              <p className="text-sm text-slate-500">Informações cadastrais</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold text-slate-700">Nome</div>
              <div className="text-slate-600">{tenant.name}</div>
            </div>

            <div>
              <div className="font-semibold text-slate-700">Slug</div>
              <div className="font-mono text-slate-600">{tenant.slug}</div>
            </div>

            <div>
              <div className="font-semibold text-slate-700">Documento</div>
              <div className="text-slate-600">
                {tenant.document ?? "Não informado"}
              </div>
            </div>

            <div>
              <div className="font-semibold text-slate-700">Criado em</div>
              <div className="text-slate-600">
                {tenant.createdAt.toLocaleDateString("pt-BR")}
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
                Usuários vinculados ao tenant.
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
                    <td className="px-4 py-3 text-slate-600">{user.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          user.isActive
                            ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                            : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                        }
                      >
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
            <MonitorCheck className="h-6 w-6 text-slate-800" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Ativos monitorados</h3>
            <p className="text-sm text-slate-500">
              Inventário técnico vinculado ao tenant.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Nome</th>
                <th className="px-4 py-3 font-semibold">Hostname</th>
                <th className="px-4 py-3 font-semibold">IP</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Zabbix</th>
                <th className="px-4 py-3 font-semibold">Wazuh</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {tenant.assets.map((asset) => (
                <tr key={asset.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {asset.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {asset.hostname ?? "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {asset.ipAddress ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {asset.assetType}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {asset.zabbixHostId ?? "não vinculado"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {asset.wazuhAgentId ?? "não vinculado"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              Mapeamento técnico com os pilares do Partsec One.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {tenant.integrations.map((integration) => (
            <div
              key={integration.id}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {integration.type}
              </div>

              <div className="mt-2 font-semibold text-slate-900">
                {integration.displayName}
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <div>Status: {integration.status}</div>
                <div>Base URL: {integration.baseUrl ?? "Não configurada"}</div>
                <div>
                  Grupo externo:{" "}
                  {integration.externalGroupId ??
                    integration.externalOrgId ??
                    "Não configurado"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
