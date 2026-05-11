import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminTenantBySlug } from "@/lib/queries/admin";
import { getTenantZabbixOverview } from "@/lib/queries/zabbix";
import {
  AlertTriangle,
  MonitorCheck,
  Server,
  ShieldAlert,
} from "lucide-react";

type TenantZabbixPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatZabbixDate(clock: string) {
  const timestamp = Number(clock) * 1000;

  if (!Number.isFinite(timestamp)) {
    return "-";
  }

  return new Date(timestamp).toLocaleString("pt-BR");
}

function getSeverityLabel(severity: string) {
  const labels: Record<string, string> = {
    "0": "Não classificado",
    "1": "Informação",
    "2": "Atenção",
    "3": "Médio",
    "4": "Alto",
    "5": "Desastre",
  };

  return labels[severity] ?? severity;
}

function getHostStatusLabel(status: string) {
  return status === "0" ? "Monitorado" : "Não monitorado";
}

export default async function TenantZabbixPage({
  params,
}: TenantZabbixPageProps) {
  const { slug } = await params;

  const tenant = await getAdminTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  let zabbixData:
    | Awaited<ReturnType<typeof getTenantZabbixOverview>>
    | null = null;

  let errorMessage: string | null = null;

  try {
    zabbixData = await getTenantZabbixOverview(tenant.slug);
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Erro desconhecido ao consultar Zabbix.";
  }

  const hosts = zabbixData?.hosts ?? [];
  const problems = zabbixData?.problems ?? [];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        backHref={`/admin/tenants/${tenant.slug}`}
        backLabel="Voltar para o tenant"
        badgeLabel="Zabbix"
        badgeIcon={MonitorCheck}
        title="Visão Zabbix"
        description={
          <>
            Consulta real ao Zabbix para o tenant{" "}
            <span className="font-semibold text-slate-900">{tenant.name}</span>.
          </>
        }
      />

      {errorMessage && (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            <div>
              <div className="font-bold">Falha ao consultar Zabbix</div>
              <p className="mt-1 text-sm leading-6">{errorMessage}</p>
            </div>
          </div>
        </section>
      )}

      {!errorMessage && zabbixData && (
        <>
          <section className="grid gap-5 md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
                <Server className="h-6 w-6 text-slate-800" />
              </div>
              <div className="text-sm font-medium text-slate-500">
                Versão Zabbix
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-950">
                {zabbixData.version}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
                <MonitorCheck className="h-6 w-6 text-slate-800" />
              </div>
              <div className="text-sm font-medium text-slate-500">
                Hosts no grupo
              </div>
              <div className="mt-2 text-3xl font-bold text-slate-950">
                {hosts.length}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 w-fit rounded-2xl bg-red-50 p-3">
                <ShieldAlert className="h-6 w-6 text-red-700" />
              </div>
              <div className="text-sm font-medium text-slate-500">
                Problemas recentes
              </div>
              <div className="mt-2 text-3xl font-bold text-red-700">
                {problems.length}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-slate-500">
                Grupo Zabbix
              </div>
              <div className="mt-2 break-all font-mono text-sm font-bold text-slate-950">
                {zabbixData.integration.externalGroupId}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <Server className="h-6 w-6 text-slate-800" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Hosts do grupo</h3>
                <p className="text-sm text-slate-500">
                  Dados retornados por host.get no Zabbix.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Host ID</th>
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Host técnico</th>
                    <th className="px-4 py-3 font-semibold">Interface</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {hosts.map((host) => {
                    const firstInterface = host.interfaces?.[0];
                    const interfaceLabel =
                      firstInterface?.useip === "1"
                        ? firstInterface.ip
                        : firstInterface?.dns || firstInterface?.ip || "-";

                    return (
                      <tr key={host.hostid}>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {host.hostid}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {host.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {host.host}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {interfaceLabel}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {getHostStatusLabel(host.status)}
                        </td>
                      </tr>
                    );
                  })}

                  {hosts.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Nenhum host retornado para o grupo configurado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-red-50 p-3">
                <ShieldAlert className="h-6 w-6 text-red-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">
                  Problemas recentes
                </h3>
                <p className="text-sm text-slate-500">
                  Dados retornados por problem.get no Zabbix.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Evento</th>
                    <th className="px-4 py-3 font-semibold">Problema</th>
                    <th className="px-4 py-3 font-semibold">Severidade</th>
                    <th className="px-4 py-3 font-semibold">Reconhecido</th>
                    <th className="px-4 py-3 font-semibold">Horário</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {problems.map((problem) => (
                    <tr key={problem.eventid}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {problem.eventid}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {problem.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {getSeverityLabel(problem.severity)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {problem.acknowledged === "1" ? "Sim" : "Não"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatZabbixDate(problem.clock)}
                      </td>
                    </tr>
                  ))}

                  {problems.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-slate-500"
                      >
                        Nenhum problema recente retornado para o grupo
                        configurado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
