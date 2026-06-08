import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  FileBarChart,
  FileText,
  Gauge,
  LineChart,
  Lock,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

const reportTypes = [
  {
    title: "Relatório Executivo Mensal",
    description:
      "Resumo gerencial do ambiente, principais indicadores, alertas relevantes, evolução operacional e pontos de atenção.",
    icon: FileBarChart,
    status: "Planejado",
  },
  {
    title: "Relatório de Disponibilidade",
    description:
      "Consolidação de disponibilidade dos ativos monitorados, eventos de indisponibilidade e histórico de recuperação.",
    icon: Gauge,
    status: "Planejado",
  },
  {
    title: "Relatório de Alertas",
    description:
      "Visão de alertas por severidade, período, ativo afetado, status de resolução e volume de recorrências.",
    icon: ShieldAlert,
    status: "Planejado",
  },
  {
    title: "Relatório de Segurança",
    description:
      "Base futura para eventos do SIEM/Wazuh, incidentes relevantes, agentes monitorados e ocorrências de segurança.",
    icon: Lock,
    status: "Futuro",
  },
];

const roadmapItems = [
  {
    phase: "Fase 1",
    title: "Relatórios baseados em snapshots",
    description:
      "Usar os dados já sincronizados do Zabbix no PostgreSQL para gerar visões executivas por período.",
  },
  {
    phase: "Fase 2",
    title: "Exportação em PDF",
    description:
      "Permitir geração de PDFs com identidade visual Partsec para envio recorrente aos clientes.",
  },
  {
    phase: "Fase 3",
    title: "Agendamento mensal",
    description:
      "Automatizar geração mensal de relatórios executivos por tenant, com histórico dentro do portal.",
  },
  {
    phase: "Fase 4",
    title: "Relatórios integrados",
    description:
      "Combinar dados de Zabbix, Zammad e Wazuh para uma visão completa de operação, suporte e segurança.",
  },
];

const previewMetrics = [
  {
    label: "Ativos monitorados",
    value: "Zabbix",
    description: "Fonte operacional já integrada ao portal.",
    icon: BarChart3,
  },
  {
    label: "Alertas por período",
    value: "Disponível",
    description: "Base já existente na página de alertas.",
    icon: LineChart,
  },
  {
    label: "Chamados/SLA",
    value: "Planejado",
    description: "Será habilitado com a integração Zammad.",
    icon: CalendarClock,
  },
  {
    label: "Segurança/SIEM",
    value: "Futuro",
    description: "Será habilitado com a integração Wazuh.",
    icon: Lock,
  },
];

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "PARTSEC_ADMIN") {
    redirect("/admin/tenants");
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[#071426] p-8 text-white shadow-sm">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100">
              <FileText className="h-4 w-4" />
              Módulo em implantação
            </div>

            <h2 className="text-3xl font-bold tracking-tight">
              Relatórios Partsec One
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
              Esta área será dedicada à geração de relatórios executivos e
              técnicos do ambiente monitorado, consolidando indicadores de
              disponibilidade, alertas, suporte e segurança.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-400/20 p-3">
                <Clock className="h-6 w-6 text-amber-200" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Status
                </div>
                <div className="mt-1 text-lg font-bold text-white">
                  Preparado para geração futura
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {previewMetrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
                <Icon className="h-6 w-6 text-slate-800" />
              </div>
              <div className="text-sm font-medium text-slate-500">
                {metric.label}
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-950">
                {metric.value}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {metric.description}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <Sparkles className="h-6 w-6 text-slate-800" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Modelos de relatórios previstos
            </h3>
            <p className="text-sm text-slate-500">
              A geração será evoluída gradualmente a partir dos dados já
              sincronizados no portal.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;

            return (
              <div
                key={report.title}
                className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <Icon className="h-5 w-5 text-slate-800" />
                  </div>

                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-bold",
                      report.status === "Planejado"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    {report.status}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900">{report.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {report.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Download className="h-6 w-6 text-slate-800" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Relatórios disponíveis
              </h3>
              <p className="text-sm text-slate-500">
                Os relatórios gerados futuramente ficarão disponíveis nesta
                área, com histórico por período.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
            <FileText className="h-7 w-7 text-slate-700" />
          </div>

          <h4 className="text-lg font-bold text-slate-900">
            Nenhum relatório gerado ainda
          </h4>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Esta seção será habilitada após a implementação da geração de
            relatórios por tenant. A proposta é permitir exportação em PDF,
            histórico mensal e consolidação executiva dos principais
            indicadores.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <CalendarClock className="h-6 w-6 text-slate-800" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Roadmap de geração
            </h3>
            <p className="text-sm text-slate-500">
              Etapas previstas para transformar os dados do portal em entregas
              executivas recorrentes.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Fase</th>
                <th className="px-4 py-3 font-semibold">Entrega</th>
                <th className="px-4 py-3 font-semibold">Descrição</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {roadmapItems.map((item) => (
                <tr key={item.title}>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {item.phase}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-bold text-slate-900">
                    {item.title}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {item.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 text-emerald-950 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-800" />
          <div>
            <div className="font-bold">Base técnica já preparada</div>
            <p className="mt-1 text-sm leading-6">
              O portal já possui snapshots internos de Zabbix para hosts,
              problemas, status, resolução e períodos filtráveis. Essa base
              será usada como primeiro insumo para relatórios executivos e
              técnicos.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
