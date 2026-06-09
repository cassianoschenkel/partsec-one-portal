import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { KeyRound, Plug, Save, ServerCog } from "lucide-react";
import { notFound } from "next/navigation";
import {
  testZabbixIntegrationAction,
  updateTenantIntegrationAction,
  updateTenantIntegrationCredentialAction,
} from "@/app/actions/tenant-actions";
import { getAdminTenantBySlug } from "@/lib/queries/admin";
import { IntegrationType } from "@/generated/prisma/client";

type TenantIntegrationsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const integrationLabels: Record<string, string> = {
  ZABBIX: "Zabbix",
  WAZUH: "SIEM",
  ZAMMAD: "Central de Suporte",
};

const integrationDescriptions: Record<string, string> = {
  ZABBIX:
    "Configuração para consulta de hosts, disponibilidade, métricas e problemas do monitoramento.",
  WAZUH:
    "Configuração para consulta de agentes, eventos de segurança e alertas do SIEM.",
  ZAMMAD:
    "Configuração para consulta de organizações, tickets e histórico de atendimento da Central de Suporte.",
};

function getCredentialStatusLabel({
  integrationType,
  hasApiToken,
  hasSiemUsername,
  hasSiemPassword,
}: {
  integrationType: string;
  hasApiToken: boolean;
  hasSiemUsername: boolean;
  hasSiemPassword: boolean;
}) {
  if (integrationType === IntegrationType.WAZUH) {
    if (hasSiemUsername && hasSiemPassword) {
      return "Usuário e senha cadastrados";
    }

    if (hasSiemUsername || hasSiemPassword) {
      return "Credencial SIEM incompleta";
    }

    return "Usuário/senha pendentes";
  }

  return hasApiToken ? "API token cadastrado" : "Nenhum API token cadastrado";
}

function hasCredentialConfigured({
  integrationType,
  hasApiToken,
  hasSiemUsername,
  hasSiemPassword,
}: {
  integrationType: string;
  hasApiToken: boolean;
  hasSiemUsername: boolean;
  hasSiemPassword: boolean;
}) {
  if (integrationType === IntegrationType.WAZUH) {
    return hasSiemUsername && hasSiemPassword;
  }

  return hasApiToken;
}

export default async function TenantIntegrationsPage({
  params,
}: TenantIntegrationsPageProps) {
  const { slug } = await params;
  const tenant = await getAdminTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        backHref={`/admin/tenants/${tenant.slug}`}
        backLabel="Voltar para o tenant"
        badgeLabel="Integrações"
        badgeIcon={Plug}
        title="Configurar integrações"
        description={
          <>
            Configure os vínculos técnicos e credenciais do tenant{" "}
            <span className="font-semibold text-slate-900">
              {tenant.name}
            </span>{" "}
            com os pilares do Partsec One.
          </>
        }
      />

      <section className="grid gap-6">
        {tenant.integrations.map((integration) => {
          const updateIntegrationForTenant =
            updateTenantIntegrationAction.bind(
              null,
              tenant.slug,
              integration.type as IntegrationType
            );

          const updateCredentialForTenant =
            updateTenantIntegrationCredentialAction.bind(
              null,
              tenant.slug,
              integration.type as IntegrationType
            );

          const hasApiToken = integration.credentials.some(
            (credential) => credential.key === "api_token"
          );

          const hasSiemUsername = integration.credentials.some(
            (credential) => credential.key === "api_username"
          );

          const hasSiemPassword = integration.credentials.some(
            (credential) => credential.key === "api_password"
          );

          const hasCredential = hasCredentialConfigured({
            integrationType: integration.type,
            hasApiToken,
            hasSiemUsername,
            hasSiemPassword,
          });

          const credentialStatusLabel = getCredentialStatusLabel({
            integrationType: integration.type,
            hasApiToken,
            hasSiemUsername,
            hasSiemPassword,
          });

          const testZabbixForTenant =
            integration.type === IntegrationType.ZABBIX
              ? testZabbixIntegrationAction.bind(null, tenant.slug)
              : null;

          return (
            <div
              key={integration.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-6 flex items-start justify-between gap-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-slate-100 p-3">
                    <ServerCog className="h-6 w-6 text-slate-800" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {integrationLabels[integration.type] ?? integration.type}
                    </h3>

                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                      {integrationDescriptions[integration.type] ??
                        "Configuração técnica da integração."}
                    </p>
                  </div>
                </div>

                <span
                  className={
                    integration.status === "ACTIVE"
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                      : integration.status === "ERROR"
                        ? "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                        : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                  }
                >
                  {integration.status}
                </span>
              </div>

              <div className="grid gap-6 xl:grid-cols-3">
                <form
                  action={updateIntegrationForTenant}
                  className="xl:col-span-2"
                >
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`${integration.type}-status`}
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Status
                      </label>
                      <select
                        id={`${integration.type}-status`}
                        name="status"
                        defaultValue={integration.status}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                      >
                        <option value="ACTIVE">Ativa</option>
                        <option value="INACTIVE">Inativa</option>
                        <option value="ERROR">Erro</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor={`${integration.type}-baseUrl`}
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Base URL
                      </label>
                      <input
                        id={`${integration.type}-baseUrl`}
                        name="baseUrl"
                        type="text"
                        defaultValue={integration.baseUrl ?? ""}
                        placeholder={
                          integration.type === IntegrationType.WAZUH
                            ? "Ex: https://siem.partsec.com.br:55000"
                            : "Ex: https://monitoramento.partsec.com.br"
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`${integration.type}-externalGroupId`}
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        {integration.type === IntegrationType.WAZUH
                          ? "Grupo técnico no SIEM"
                          : "External Group ID"}
                      </label>
                      <input
                        id={`${integration.type}-externalGroupId`}
                        name="externalGroupId"
                        type="text"
                        defaultValue={integration.externalGroupId ?? ""}
                        placeholder={
                          integration.type === IntegrationType.WAZUH
                            ? "Ex: Internal-Partsec ou SKA"
                            : "Ex: hostgroup-id ou agent-group"
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                      />
                      {integration.type === IntegrationType.WAZUH && (
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Informe exatamente o nome do grupo configurado no
                          SIEM. Este campo isola os agentes por tenant.
                        </p>
                      )}
                    </div>

					<div>
					  <label
						htmlFor={`${integration.type}-externalOrgId`}
						className="mb-2 block text-sm font-semibold text-slate-700"
					  >
						{integration.type === IntegrationType.WAZUH
						  ? "URL do SIEM Indexer"
						  : "External Org ID"}
					  </label>
					  <input
						id={`${integration.type}-externalOrgId`}
						name="externalOrgId"
						type="text"
						defaultValue={integration.externalOrgId ?? ""}
						placeholder={
						  integration.type === IntegrationType.WAZUH
							? "Ex: https://dash.partsec.com.br:9200"
							: "Ex: organization-id"
						}
						className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
					  />
					  {integration.type === IntegrationType.WAZUH && (
						<p className="mt-2 text-xs leading-5 text-slate-500">
						  URL da API do Indexer usada para consultar vulnerabilidades do SIEM.
						  Exemplo: https://dash.partsec.com.br:9200.
						</p>
					  )}
					</div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor={`${integration.type}-notes`}
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Observações
                      </label>
                      <textarea
                        id={`${integration.type}-notes`}
                        name="notes"
                        rows={3}
                        defaultValue={integration.notes ?? ""}
                        placeholder="Observações internas sobre esta integração"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#071426] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544]"
                    >
                      <Save className="h-4 w-4" />
                      Salvar configuração
                    </button>
                  </div>
                </form>

                <form
                  action={updateCredentialForTenant}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-2xl bg-white p-3">
                      <KeyRound className="h-5 w-5 text-slate-800" />
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900">
                        {integration.type === IntegrationType.WAZUH
                          ? "Credencial SIEM"
                          : "Credencial API"}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {integration.type === IntegrationType.WAZUH
                          ? "Usuário e senha criptografados no banco."
                          : "Token criptografado no banco."}
                      </p>
                    </div>
                  </div>

                  <div
                    className={
                      hasCredential
                        ? "mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
                        : "mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700"
                    }
                  >
                    {credentialStatusLabel}
                  </div>

                  {integration.type === IntegrationType.WAZUH ? (
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor={`${integration.type}-apiUsername`}
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Usuário da API SIEM
                        </label>
                        <input
                          id={`${integration.type}-apiUsername`}
                          name="apiUsername"
                          type="text"
                          autoComplete="off"
                          placeholder="Ex: portal.one"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`${integration.type}-apiPassword`}
                          className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                          Senha da API SIEM
                        </label>
                        <input
                          id={`${integration.type}-apiPassword`}
                          name="apiPassword"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Preencha apenas para cadastrar ou alterar"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                        />
                      </div>
					  
					  <div className="border-t border-slate-200 pt-4">
						  <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
							SIEM Indexer
						  </div>

						  <div className="space-y-4">
							<div>
							  <label
								htmlFor={`${integration.type}-indexerUsername`}
								className="mb-2 block text-sm font-semibold text-slate-700"
							  >
								Usuário do Indexer
							  </label>
							  <input
								id={`${integration.type}-indexerUsername`}
								name="indexerUsername"
								type="text"
								autoComplete="off"
								placeholder="Ex: portal.ska-indexer"
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
							  />
							</div>

							<div>
							  <label
								htmlFor={`${integration.type}-indexerPassword`}
								className="mb-2 block text-sm font-semibold text-slate-700"
							  >
								Senha do Indexer
							  </label>
							  <input
								id={`${integration.type}-indexerPassword`}
								name="indexerPassword"
								type="password"
								autoComplete="new-password"
								placeholder="Preencha apenas para cadastrar ou alterar"
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
							  />
							</div>
						  </div>
						</div>

                      <p className="text-xs leading-5 text-slate-500">
                        As credenciais não serão exibidas novamente após salvas.
                        Para trocar usuário ou senha, informe apenas os novos
                        valores e salve.
                      </p>
                    </div>
                  ) : (
                    <>
                      <label
                        htmlFor={`${integration.type}-apiToken`}
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        Novo API token
                      </label>

                      <input
                        id={`${integration.type}-apiToken`}
                        name="apiToken"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Cole o novo token para gravar/substituir"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                      />

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        O token não será exibido novamente após salvo. Para
                        trocar, informe um novo valor e salve.
                      </p>
                    </>
                  )}

                  <button
                    type="submit"
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                  >
                    <KeyRound className="h-4 w-4" />
                    {integration.type === IntegrationType.WAZUH
                      ? "Salvar credencial SIEM"
                      : "Salvar token"}
                  </button>

                </form>
		                {testZabbixForTenant && (
                  <form action={testZabbixForTenant} className="xl:col-start-3">
                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
                    >
                      Testar conexão Zabbix
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
