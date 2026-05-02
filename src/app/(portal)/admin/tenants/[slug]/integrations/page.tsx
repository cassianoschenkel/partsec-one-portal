import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTenantIntegrationAction } from "@/app/actions/tenant-actions";
import { getAdminTenantBySlug } from "@/lib/queries/admin";
import { IntegrationType } from "@/generated/prisma/client";
import {
  ArrowLeft,
  Plug,
  Save,
  ServerCog,
} from "lucide-react";

type TenantIntegrationsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const integrationLabels: Record<string, string> = {
  ZABBIX: "Zabbix",
  WAZUH: "Wazuh",
  ZAMMAD: "Zammad",
};

const integrationDescriptions: Record<string, string> = {
  ZABBIX:
    "Configuração para consulta de hosts, disponibilidade, métricas e problemas do Zabbix.",
  WAZUH:
    "Configuração para consulta de agentes, eventos de segurança e alertas do Wazuh.",
  ZAMMAD:
    "Configuração para consulta de organizações, tickets e histórico de atendimento do Zammad.",
};

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
      <section>
        <Link
          href={`/admin/tenants/${tenant.slug}`}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o tenant
        </Link>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          <Plug className="h-4 w-4" />
          Integrações
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Configurar integrações
        </h2>

        <p className="mt-2 text-slate-600">
          Configure os vínculos técnicos do tenant{" "}
          <span className="font-semibold text-slate-900">{tenant.name}</span>{" "}
          com os pilares do Partsec One.
        </p>
      </section>

      <section className="grid gap-6">
        {tenant.integrations.map((integration) => {
          const updateIntegrationForTenant =
            updateTenantIntegrationAction.bind(
              null,
              tenant.slug,
              integration.type as IntegrationType
            );

          return (
            <form
              key={integration.id}
              action={updateIntegrationForTenant}
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
                    placeholder="Ex: https://zabbix.partsec.local"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${integration.type}-externalGroupId`}
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    External Group ID
                  </label>
                  <input
                    id={`${integration.type}-externalGroupId`}
                    name="externalGroupId"
                    type="text"
                    defaultValue={integration.externalGroupId ?? ""}
                    placeholder="Ex: zabbix-hostgroup-id ou wazuh-agent-group"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${integration.type}-externalOrgId`}
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    External Org ID
                  </label>
                  <input
                    id={`${integration.type}-externalOrgId`}
                    name="externalOrgId"
                    type="text"
                    defaultValue={integration.externalOrgId ?? ""}
                    placeholder="Ex: zammad-organization-id"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
                  />
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
                  Salvar {integrationLabels[integration.type] ?? integration.type}
                </button>
              </div>
            </form>
          );
        })}
      </section>
    </div>
  );
}
