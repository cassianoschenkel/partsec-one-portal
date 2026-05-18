import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { syncTenantZabbixNowAction } from "@/app/actions/sync-actions";
import { getAdminTenantSyncOverview } from "@/lib/queries/admin-sync";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Play,
  RefreshCcw,
  XCircle,
} from "lucide-react";

type AdminTenantSyncPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    syncStatus?: string;
    message?: string;
  }>;
};

function formatDate(date?: Date | null) {
  if (!date) {
    return "Nunca executado";
  }

  return date.toLocaleString("pt-BR");
}

function formatDuration(durationMs?: number | null) {
  if (!durationMs) {
    return "-";
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function getStatusClass(status?: string | null) {
  if (status === "SUCCESS") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "ERROR") {
    return "bg-red-50 text-red-700";
  }

  if (status === "RUNNING") {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getStatusIcon(status?: string | null) {
  if (status === "SUCCESS") {
    return CheckCircle2;
  }

  if (status === "ERROR") {
    return XCircle;
  }

  if (status === "RUNNING") {
    return RefreshCcw;
  }

  return Clock;
}

export default async function AdminTenantSyncPage({
  params,
  searchParams,
}: AdminTenantSyncPageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};

  const data = await getAdminTenantSyncOverview(slug);

  if (!data) {
    notFound();
  }

  const syncZabbixForTenant = syncTenantZabbixNowAction.bind(
    null,
    data.tenant.slug
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        backHref={`/admin/tenants/${data.tenant.slug}`}
        backLabel="Voltar para o tenant"
        badgeLabel="Sincronizações"
        badgeIcon={RefreshCcw}
        title="Status das sincronizações"
        description={
          <>
            Acompanhe a execução dos processos de sincronização do tenant{" "}
            <span className="font-semibold text-slate-900">
              {data.tenant.name}
            </span>
            .
          </>
        }
        actions={
          <form action={syncZabbixForTenant}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#071426] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544]"
            >
              <Play className="h-4 w-4" />
              Sincronizar Zabbix agora
            </button>
          </form>
        }
      />

    {query.syncStatus === "success" && (
	  <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
		<div className="flex items-start gap-3">
		  <CheckCircle2 className="mt-0.5 h-5 w-5" />
		  <div>
			<div className="font-bold">Sincronização executada</div>
			<p className="mt-1 text-sm">
			  {query.message ??
				"A sincronização Zabbix foi executada com sucesso."}
			</p>
		  </div>
		</div>
	  </section>
	)}

      {query.syncStatus === "error" && (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            <div>
              <div className="font-bold">Falha na sincronização</div>
              <p className="mt-1 text-sm">
                {query.message ?? "Erro desconhecido ao sincronizar Zabbix."}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-3">
        {data.latestByIntegration.map(({ integration, latestLog }) => {
          const StatusIcon = getStatusIcon(latestLog?.status);

          return (
            <div
              key={integration.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-slate-100 p-3">
                  <StatusIcon className="h-6 w-6 text-slate-800" />
                </div>

                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-bold",
                    getStatusClass(latestLog?.status),
                  ].join(" ")}
                >
                  {latestLog?.status ?? "SEM SYNC"}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                {integration.type}
              </h3>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div>
                  <span className="font-semibold text-slate-800">
                    Integração:
                  </span>{" "}
                  {integration.status}
                </div>

                <div>
                  <span className="font-semibold text-slate-800">
                    Última execução:
                  </span>{" "}
                  {formatDate(latestLog?.startedAt)}
                </div>

                <div>
                  <span className="font-semibold text-slate-800">
                    Duração:
                  </span>{" "}
                  {formatDuration(latestLog?.durationMs)}
                </div>

                <div>
                  <span className="font-semibold text-slate-800">
                    Mensagem:
                  </span>{" "}
                  {latestLog?.message ?? "Nenhuma execução registrada."}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900">
            Último snapshot de hosts
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {data.latestHostSnapshot
              ? `Último host sincronizado em ${formatDate(
                  data.latestHostSnapshot.syncedAt
                )}.`
              : "Nenhum snapshot de host encontrado."}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900">
            Último snapshot de problemas
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            {data.latestProblemSnapshot
              ? `Último problema sincronizado em ${formatDate(
                  data.latestProblemSnapshot.syncedAt
                )}.`
              : "Nenhum snapshot de problema encontrado."}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Histórico recente
            </h3>
            <p className="text-sm text-slate-500">
              Últimas 50 execuções registradas para este tenant.
            </p>
          </div>

          <Link
            href={`/admin/tenants/${data.tenant.slug}/integrations`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Integrações
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Integração</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Início</th>
                <th className="px-4 py-3 font-semibold">Fim</th>
                <th className="px-4 py-3 font-semibold">Duração</th>
                <th className="px-4 py-3 font-semibold">Mensagem</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {data.logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {log.integrationType}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold",
                        getStatusClass(log.status),
                      ].join(" ")}
                    >
                      {log.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(log.startedAt)}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(log.finishedAt)}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {formatDuration(log.durationMs)}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {log.message ?? "-"}
                  </td>
                </tr>
              ))}

              {data.logs.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Nenhum log de sincronização registrado para este tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
