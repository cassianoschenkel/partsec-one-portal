import type { getCustomerZabbixSnapshotOverview } from "@/lib/queries/customer-zabbix-snapshot";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MonitorCheck,
  Server,
  ShieldAlert,
} from "lucide-react";

type ZabbixSnapshotOverviewProps = {
  snapshot: Awaited<ReturnType<typeof getCustomerZabbixSnapshotOverview>>;
};

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

function getProblemStatusLabel(problem: {
  status?: string | null;
  acknowledged: string;
}) {
  if (problem.status === "RESOLVED") {
    return "Resolvido";
  }

  if (problem.acknowledged === "1") {
    return "Reconhecido";
  }

  return "Aberto";
}

export function ZabbixSnapshotOverview({
  snapshot,
}: ZabbixSnapshotOverviewProps) {
  const lastSync = snapshot.lastSync;

  if (!snapshot.ok) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5" />
          <div>
            <h3 className="font-bold">
              Monitoramento ainda não sincronizado
            </h3>
            <p className="mt-1 text-sm leading-6">
              Ainda não há dados de snapshot do Zabbix para este tenant.
            </p>
            {snapshot.errorMessage && (
              <p className="mt-2 text-xs leading-5 text-amber-800">
                Último erro: {snapshot.errorMessage}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  const generalStatus =
    snapshot.summary.openProblems === 0
      ? "Ambiente sem alertas ativos"
      : snapshot.summary.criticalOpenProblems > 0
        ? "Ambiente com alertas críticos"
        : snapshot.summary.highOpenProblems > 0
          ? "Ambiente com alertas altos"
          : "Ambiente com alertas ativos";

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Resumo operacional
          </h2>
          <p className="mt-2 text-slate-600">
            {generalStatus}. Dados consolidados a partir da última
            sincronização com o Zabbix.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
          <div className="flex items-center justify-end gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Clock className="h-4 w-4" />
            Última sync
          </div>
          <div className="mt-1 text-sm font-bold text-slate-900">
            {formatDate(lastSync?.finishedAt ?? lastSync?.startedAt)}
          </div>
          {lastSync?.status && (
            <div className="mt-1 text-xs text-slate-500">
              Status: {lastSync.status}
            </div>
          )}
        </div>
      </div>

      {snapshot.errorMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          A última sincronização retornou erro, mas o dashboard está exibindo os
          dados mais recentes disponíveis no banco. Erro:{" "}
          <span className="font-semibold">{snapshot.errorMessage}</span>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <Server className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Total de ativos
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {snapshot.summary.totalHosts}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-emerald-50 p-3">
            <MonitorCheck className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Monitorados
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">
            {snapshot.summary.monitoredHosts}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-red-50 p-3">
            <ShieldAlert className="h-6 w-6 text-red-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Críticos abertos
          </div>
          <div className="mt-2 text-3xl font-bold text-red-700">
            {snapshot.summary.criticalOpenProblems}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-orange-50 p-3">
            <AlertTriangle className="h-6 w-6 text-orange-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Altos abertos
          </div>
          <div className="mt-2 text-3xl font-bold text-orange-700">
            {snapshot.summary.highOpenProblems}
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
            {snapshot.summary.openProblems}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-emerald-50 p-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Resolvidos 24h
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">
            {snapshot.summary.resolvedLast24h}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Server className="h-6 w-6 text-slate-800" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Ativos monitorados</h3>
              <p className="text-sm text-slate-500">
                Primeiros hosts sincronizados do grupo Zabbix do cliente.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {snapshot.hosts.slice(0, 8).map((host) => {
              const interfaceLabel = host.interfaceIp || host.interfaceDns || "-";

              return (
                <div
                  key={host.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {host.name}
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-500">
                      {interfaceLabel}
                    </div>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {getHostStatusLabel(host.status)}
                  </span>
                </div>
              );
            })}

            {snapshot.hosts.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                Nenhum host sincronizado.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-red-50 p-3">
              <ShieldAlert className="h-6 w-6 text-red-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">
                Alertas recentes
              </h3>
              <p className="text-sm text-slate-500">
                Eventos abertos ou resolvidos nas últimas 24h.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {snapshot.problems.slice(0, 8).map((problem) => (
              <div
                key={problem.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-red-700">
                      {getSeverityLabel(problem.severity)}
                    </div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {problem.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {problem.status === "RESOLVED" && problem.resolvedAt
                        ? `Resolvido em ${formatDate(problem.resolvedAt)}`
                        : formatZabbixDate(problem.clock)}
                    </div>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {getProblemStatusLabel(problem)}
                  </span>
                </div>
              </div>
            ))}

            {snapshot.problems.length === 0 && (
              <div className="rounded-2xl bg-emerald-50 p-6 text-center text-sm font-semibold text-emerald-700">
                Nenhum alerta recente no período.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
