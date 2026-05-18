import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { getTenantZabbixAlertsOverview } from "@/lib/queries/alerts";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Siren,
} from "lucide-react";

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

function getSeverityClass(severity: string) {
  if (severity === "5") {
    return "bg-red-100 text-red-800";
  }

  if (severity === "4") {
    return "bg-orange-100 text-orange-800";
  }

  if (severity === "3") {
    return "bg-amber-100 text-amber-800";
  }

  if (severity === "2") {
    return "bg-yellow-100 text-yellow-800";
  }

  return "bg-slate-100 text-slate-700";
}

function formatZabbixDate(clock: string) {
  const timestamp = Number(clock) * 1000;

  if (!Number.isFinite(timestamp)) {
    return "-";
  }

  return new Date(timestamp).toLocaleString("pt-BR");
}

function formatDate(date?: Date | null) {
  if (!date) {
    return "Sem sincronização";
  }

  return date.toLocaleString("pt-BR");
}

export default async function AlertsPage() {
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

  const data = await getTenantZabbixAlertsOverview(session.user.tenantId);

  if (!data) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800">
        Tenant não encontrado.
      </div>
    );
  }

  const hasSyncError = data.lastSync?.status === "ERROR";

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Alertas
            </h2>
            <p className="mt-2 text-slate-600">
              Alertas reais de disponibilidade e performance sincronizados do
              Zabbix para{" "}
              <span className="font-semibold text-slate-900">
                {data.tenant.name}
              </span>
              .
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
            <div className="flex items-center justify-end gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Clock className="h-4 w-4" />
              Última sync
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {formatDate(data.lastSync?.finishedAt ?? data.lastSync?.startedAt)}
            </div>
            {data.lastSync?.status && (
              <div className="mt-1 text-xs text-slate-500">
                Status: {data.lastSync.status}
              </div>
            )}
          </div>
        </div>
      </section>

      {hasSyncError && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            <div>
              <h3 className="font-bold">
                Última sincronização Zabbix com erro
              </h3>
              <p className="mt-1 text-sm leading-6">
                A página está exibindo os últimos alertas disponíveis no banco.
              </p>
              {data.lastSync?.message && (
                <p className="mt-2 text-xs leading-5 text-amber-800">
                  Detalhe técnico: {data.lastSync.message}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-5 md:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <ShieldAlert className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Total
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {data.summary.total}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-red-50 p-3">
            <Siren className="h-6 w-6 text-red-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Desastre
          </div>
          <div className="mt-2 text-3xl font-bold text-red-700">
            {data.summary.critical}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-orange-50 p-3">
            <AlertTriangle className="h-6 w-6 text-orange-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Alto
          </div>
          <div className="mt-2 text-3xl font-bold text-orange-700">
            {data.summary.high}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-amber-50 p-3">
            <AlertTriangle className="h-6 w-6 text-amber-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Abertos
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-700">
            {data.summary.open}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-emerald-50 p-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Reconhecidos
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">
            {data.summary.acknowledged}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-red-50 p-3">
            <ShieldAlert className="h-6 w-6 text-red-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Problemas recentes do Zabbix
            </h3>
            <p className="text-sm text-slate-500">
              Dados sincronizados periodicamente via snapshot interno.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
			<tr>
			  <th className="px-4 py-3 font-semibold">Evento</th>
			  <th className="px-4 py-3 font-semibold">Severidade</th>
			  <th className="px-4 py-3 font-semibold">Ativo</th>
			  <th className="px-4 py-3 font-semibold">Problema</th>
			  <th className="px-4 py-3 font-semibold">Status</th>
			  <th className="px-4 py-3 font-semibold">Horário</th>
			  <th className="px-4 py-3 font-semibold">Sync</th>
			</tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {data.problems.map((problem) => (
                <tr key={problem.id}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {problem.eventId}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        getSeverityClass(problem.severity),
                      ].join(" ")}
                    >
                      {getSeverityLabel(problem.severity)}
                    </span>
                  </td>
				  
				  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">
                      {problem.asset?.name ??
                        problem.hostName ??
                        "Ativo não identificado"}
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-500">
                      {problem.asset?.ipAddress ??
                        problem.hostTechnicalName ??
                        problem.zabbixHostId ??
                        "-"}
                    </div>
                  </td>

                  <td className="px-4 py-3 font-medium text-slate-900">
                    {problem.name}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {problem.acknowledged === "1" ? "Reconhecido" : "Aberto"}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {formatZabbixDate(problem.clock)}
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(problem.syncedAt)}
                  </td>
                </tr>
              ))}

              {data.problems.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Nenhum problema ativo sincronizado do Zabbix.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-1 h-5 w-5 text-slate-700" />
          <div>
            <div className="font-bold text-slate-900">
              Origem dos alertas
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Esta tela exibe problemas sincronizados do Zabbix. A coleta é
              realizada por processo agendado, gravada no PostgreSQL e exibida
              ao cliente sem consultar a API do Zabbix em tempo real.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
