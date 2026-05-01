import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MonitorCheck,
  ShieldAlert,
  TicketCheck,
} from "lucide-react";

const summaryCards = [
  {
    title: "Ativos monitorados",
    value: "23",
    description: "21 online, 2 com atenção",
    icon: MonitorCheck,
  },
  {
    title: "Alertas críticos",
    value: "4",
    description: "Nas últimas 24 horas",
    icon: ShieldAlert,
  },
  {
    title: "Chamados abertos",
    value: "3",
    description: "1 aguardando cliente",
    icon: TicketCheck,
  },
  {
    title: "SLA operacional",
    value: "98,7%",
    description: "Disponibilidade consolidada",
    icon: CheckCircle2,
  },
];

const securityAlerts = [
  {
    severity: "Crítico",
    title: "Tentativas de autenticação inválidas",
    source: "SRV-AD-01",
    time: "há 18 min",
  },
  {
    severity: "Alto",
    title: "Alteração sensível em grupo administrativo",
    source: "SRV-AD-02",
    time: "há 42 min",
  },
  {
    severity: "Médio",
    title: "Agente sem comunicação recente",
    source: "NOTE-034",
    time: "há 1h 12min",
  },
];

const monitoringAlerts = [
  {
    title: "Uso de CPU elevado",
    source: "SRV-SQL-01",
    status: "Em análise",
  },
  {
    title: "Espaço em disco abaixo do limite",
    source: "SRV-FILE-01",
    status: "Atenção",
  },
  {
    title: "Serviço de backup com falha",
    source: "SRV-BKP-01",
    status: "Crítico",
  },
];

export function DashboardOverview() {
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Dashboard Executivo
          </h2>
          <p className="mt-2 text-slate-600">
            Visão consolidada do ambiente monitorado pelo Partsec One.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-2xl bg-slate-100 p-3">
                    <Icon className="h-6 w-6 text-slate-800" />
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm font-medium text-slate-500">
                    {card.title}
                  </div>
                  <div className="mt-2 text-3xl font-bold text-slate-950">
                    {card.value}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {card.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Segurança
              </h3>
              <p className="text-sm text-slate-500">
                Eventos relevantes identificados pelo Wazuh.
              </p>
            </div>
            <ShieldAlert className="h-6 w-6 text-slate-700" />
          </div>

          <div className="space-y-4">
            {securityAlerts.map((alert) => (
              <div
                key={`${alert.title}-${alert.source}`}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-red-700">
                      {alert.severity}
                    </div>
                    <div className="mt-1 font-semibold text-slate-900">
                      {alert.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Origem: {alert.source}
                    </div>
                  </div>

                  <div className="whitespace-nowrap text-xs font-medium text-slate-500">
                    {alert.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Monitoramento
              </h3>
              <p className="text-sm text-slate-500">
                Alertas técnicos identificados pelo Zabbix.
              </p>
            </div>
            <AlertTriangle className="h-6 w-6 text-slate-700" />
          </div>

          <div className="space-y-4">
            {monitoringAlerts.map((alert) => (
              <div
                key={`${alert.title}-${alert.source}`}
                className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div>
                  <div className="font-semibold text-slate-900">
                    {alert.title}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Host: {alert.source}
                  </div>
                </div>

                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  {alert.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Clock className="h-6 w-6 text-slate-700" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Linha do tempo operacional
            </h3>
            <p className="text-sm text-slate-500">
              Eventos recentes consolidados do ambiente.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            "Chamado #1042 atualizado pela equipe Partsec",
            "SRV-SQL-01 voltou ao estado normal",
            "Novo alerta de segurança classificado como alto",
            "Relatório diário de disponibilidade gerado",
          ].map((event) => (
            <div
              key={event}
              className="border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              {event}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
