import type {
  ZabbixHost,
  ZabbixProblem,
} from "@/lib/integrations/zabbix-client";
import {
  AlertTriangle,
  MonitorCheck,
  Server,
  ShieldAlert,
} from "lucide-react";

type ZabbixCustomerOverviewProps = {
  zabbix:
    | {
        ok: true;
        version: string;
        hosts: ZabbixHost[];
        problems: ZabbixProblem[];
      }
    | {
        ok: false;
        errorMessage: string;
        version: null;
        hosts: [];
        problems: [];
      };
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

function formatZabbixDate(clock: string) {
  const timestamp = Number(clock) * 1000;

  if (!Number.isFinite(timestamp)) {
    return "-";
  }

  return new Date(timestamp).toLocaleString("pt-BR");
}

function getHostStatusLabel(status: string) {
  return status === "0" ? "Monitorado" : "Não monitorado";
}

export function ZabbixCustomerOverview({
  zabbix,
}: ZabbixCustomerOverviewProps) {
  if (!zabbix.ok) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5" />
          <div>
            <h3 className="font-bold">
              Monitoramento temporariamente indisponível
            </h3>
            <p className="mt-1 text-sm leading-6">
              Não foi possível consultar os dados do Zabbix neste momento.
            </p>
            <p className="mt-2 text-xs leading-5 text-amber-800">
              Detalhe técnico: {zabbix.errorMessage}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const monitoredHosts = zabbix.hosts.filter((host) => host.status === "0");

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Monitoramento Zabbix
        </h2>
        <p className="mt-2 text-slate-600">
          Visão operacional de disponibilidade e problemas recentes.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <Server className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Versão Zabbix
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-950">
            {zabbix.version}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <MonitorCheck className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Hosts monitorados
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {monitoredHosts.length}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <Server className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Total de hosts
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {zabbix.hosts.length}
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
            {zabbix.problems.length}
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
              <h3 className="font-bold text-slate-900">Hosts monitorados</h3>
              <p className="text-sm text-slate-500">
                Primeiros hosts retornados pelo grupo Zabbix do cliente.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {zabbix.hosts.slice(0, 8).map((host) => {
              const firstInterface = host.interfaces?.[0];
              const interfaceLabel =
                firstInterface?.useip === "1"
                  ? firstInterface.ip
                  : firstInterface?.dns || firstInterface?.ip || "-";

              return (
                <div
                  key={host.hostid}
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

            {zabbix.hosts.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                Nenhum host retornado pelo Zabbix.
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
                Problemas recentes
              </h3>
              <p className="text-sm text-slate-500">
                Eventos recentes retornados pelo Zabbix.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {zabbix.problems.slice(0, 8).map((problem) => (
              <div
                key={problem.eventid}
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
                      {formatZabbixDate(problem.clock)}
                    </div>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {problem.acknowledged === "1" ? "Reconhecido" : "Aberto"}
                  </span>
                </div>
              </div>
            ))}

            {zabbix.problems.length === 0 && (
              <div className="rounded-2xl bg-emerald-50 p-6 text-center text-sm font-semibold text-emerald-700">
                Nenhum problema recente retornado pelo Zabbix.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
