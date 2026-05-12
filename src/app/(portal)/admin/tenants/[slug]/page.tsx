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
  searchParams?: Promise<{
    createdUserEmail?: string;
    setupToken?: string;
    inviteSent?: string;
  }>;
};

  export default async function AdminTenantDetailPage({
  params,
  searchParams,
  }: AdminTenantDetailPageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};

  const tenant = await getAdminTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const setupToken = query.setupToken;
  const createdUserEmail = query.createdUserEmail;
  const inviteSent = query.inviteSent;

  const appUrl = process.env.APP_URL?.replace(/\/+$/, "") ?? "";

  const setupPasswordUrl =
  setupToken && createdUserEmail
    ? `${appUrl}/set-password?token=${setupToken}`
    : null;

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
      </section>
	  {setupPasswordUrl && (
	  <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
		<div className="font-bold">Usuário criado com sucesso</div>
		<p className="mt-1 text-sm leading-6">
		  {inviteSent === "true"
		    ? "O convite de acesso foi enviado por e-mail. O link abaixo também pode ser usado como fallback operacional."
		    : "Não foi possível enviar o convite por e-mail. Envie o link abaixo manualmente para o usuário definir a senha inicial."}
		</p>
		
		<div className="mt-4 rounded-2xl bg-white p-4">
		  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
			Usuário
		  </div>
		  <div className="mt-1 font-mono text-sm text-slate-800">
			{createdUserEmail}
		  </div>

		  <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-700">
			Link de definição de senha
		  </div>
		  <div className="mt-1 break-all font-mono text-sm text-slate-800">
			{setupPasswordUrl}
		  </div>
		</div>

		<p className="mt-3 text-xs leading-5 text-emerald-800">
		  Este token expira em 24 horas e só pode ser usado uma vez.
		</p>
		
	  </section>
	)}

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
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
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

            <Link
              href={`/admin/tenants/${tenant.slug}/users/new`}
              className="rounded-2xl bg-[#071426] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0f2544]"
            >
              Adicionar usuário
            </Link>
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

                {tenant.users.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Nenhum usuário cadastrado para este tenant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
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

          <Link
            href={`/admin/tenants/${tenant.slug}/assets/new`}
            className="rounded-2xl bg-[#071426] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0f2544]"
          >
            Adicionar ativo
          </Link>
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

              {tenant.assets.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Nenhum ativo cadastrado para este tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
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
  	  <div className="flex items-center gap-2">
	    <Link
	      href={`/admin/tenants/${tenant.slug}/zabbix`}
  	      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-100"
  >
	    Ver Zabbix
	    </Link>

	    <Link
	      href={`/admin/tenants/${tenant.slug}/integrations`}
	      className="rounded-2xl bg-[#071426] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0f2544]"
	  >
    Configurar integrações
  </Link>
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
