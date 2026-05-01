import { getDemoTenantWithRelations } from "@/lib/queries/tenant";
import { AlertTriangle, ShieldAlert } from "lucide-react";

export default async function AlertsPage() {
  const tenant = await getDemoTenantWithRelations();

  if (!tenant) {
    return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800">
          Tenant de demonstração não encontrado.
        </div>
    );
  }

  const alerts = [
    {
      source: "WAZUH",
      severity: "Crítico",
      title: "Tentativas de autenticação inválidas",
      asset: "SRV-AD-01",
      status: "Novo",
      time: "há 18 min",
    },
    {
      source: "ZABBIX",
      severity: "Alto",
      title: "Uso de CPU elevado",
      asset: "SRV-SQL-01",
      status: "Em análise",
      time: "há 35 min",
    },
    {
      source: "ZABBIX",
      severity: "Médio",
      title: "Espaço em disco abaixo do limite",
      asset: "SRV-FILE-01",
      status: "Atenção",
      time: "há 1h 05min",
    },
    {
      source: "WAZUH",
      severity: "Alto",
      title: "Alteração sensível em grupo administrativo",
      asset: "SRV-AD-01",
      status: "Em análise",
      time: "há 1h 22min",
    },
  ];

  return (
      <div className="space-y-8">
        <section>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Alertas
          </h2>
          <p className="mt-2 text-slate-600">
            Alertas de segurança, disponibilidade e performance consolidados
            para <span className="font-semibold">{tenant.name}</span>.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Total de alertas
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {alerts.length}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Críticos</div>
            <div className="mt-2 text-3xl font-bold text-red-700">
              {alerts.filter((alert) => alert.severity === "Crítico").length}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Wazuh</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {alerts.filter((alert) => alert.source === "WAZUH").length}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-500">Zabbix</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {alerts.filter((alert) => alert.source === "ZABBIX").length}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-slate-700" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Alertas recentes
              </h3>
              <p className="text-sm text-slate-500">
                Estrutura mockada para futura integração com Wazuh e Zabbix.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Origem</th>
                  <th className="px-4 py-3 font-semibold">Severidade</th>
                  <th className="px-4 py-3 font-semibold">Alerta</th>
                  <th className="px-4 py-3 font-semibold">Ativo</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {alerts.map((alert) => (
                  <tr key={`${alert.source}-${alert.title}-${alert.time}`}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {alert.source}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {alert.title}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {alert.asset}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {alert.status}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {alert.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5" />
            <div>
              <div className="font-bold">Observação de desenvolvimento</div>
              <p className="mt-1 text-sm leading-6">
                Esta tela já está preparada visualmente, mas os alertas ainda
                são mockados. A próxima evolução será criar tabelas internas de
                eventos normalizados ou consumir dados em cache das APIs do
                Wazuh e Zabbix.
              </p>
            </div>
          </div>
        </section>
      </div>
  );
}
