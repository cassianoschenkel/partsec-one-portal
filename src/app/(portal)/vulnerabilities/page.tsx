import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import {
  AlertTriangle,
  BarChart3,
  Bug,
  CheckCircle2,
  Clock,
  DatabaseZap,
  FileWarning,
  Gauge,
  Layers,
  PackageSearch,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const severityCards = [
  {
    label: "Críticas",
    value: "—",
    description: "Vulnerabilidades de maior prioridade para correção.",
    icon: ShieldAlert,
    className: "text-red-700",
    iconClassName: "bg-red-50 text-red-700",
  },
  {
    label: "Altas",
    value: "—",
    description: "Exposições relevantes que exigem plano de remediação.",
    icon: AlertTriangle,
    className: "text-orange-700",
    iconClassName: "bg-orange-50 text-orange-700",
  },
  {
    label: "Médias",
    value: "—",
    description: "Riscos que devem ser acompanhados e priorizados.",
    icon: Gauge,
    className: "text-amber-700",
    iconClassName: "bg-amber-50 text-amber-700",
  },
  {
    label: "Baixas",
    value: "—",
    description: "Vulnerabilidades de menor criticidade operacional.",
    icon: CheckCircle2,
    className: "text-emerald-700",
    iconClassName: "bg-emerald-50 text-emerald-700",
  },
];

const plannedCapabilities = [
  {
    title: "Exposição por criticidade",
    description:
      "Consolidação de vulnerabilidades por severidade, permitindo priorização por risco.",
    icon: BarChart3,
  },
  {
    title: "Ativos mais afetados",
    description:
      "Identificação dos servidores, endpoints e ativos com maior concentração de vulnerabilidades.",
    icon: Server,
  },
  {
    title: "Pacotes vulneráveis",
    description:
      "Ranking de pacotes, softwares e componentes com maior recorrência de exposição.",
    icon: PackageSearch,
  },
  {
    title: "Ciclo de remediação",
    description:
      "Acompanhamento de vulnerabilidades abertas, mitigadas e resolvidas ao longo do tempo.",
    icon: ShieldCheck,
  },
];

const roadmapItems = [
  {
    phase: "Fase 1",
    title: "Sincronização de agentes de segurança",
    description:
      "Coletar os agentes vinculados aos ativos monitorados e relacioná-los ao inventário do portal.",
  },
  {
    phase: "Fase 2",
    title: "Snapshots de vulnerabilidades",
    description:
      "Persistir vulnerabilidades detectadas pelo SIEM em snapshots internos no PostgreSQL.",
  },
  {
    phase: "Fase 3",
    title: "Dashboard de exposição",
    description:
      "Exibir totais por criticidade, ativos afetados, pacotes vulneráveis e histórico de detecção.",
  },
  {
    phase: "Fase 4",
    title: "Relatórios executivos",
    description:
      "Incluir exposição de vulnerabilidades nos relatórios mensais do Partsec One.",
  },
];

const exampleRows = [
  {
    severity: "Crítica",
    asset: "Servidor de aplicação",
    packageName: "Sistema operacional / componente base",
    cve: "CVE-XXXX-0001",
    status: "Aberta",
  },
  {
    severity: "Alta",
    asset: "Servidor de banco de dados",
    packageName: "Componente de banco de dados",
    cve: "CVE-XXXX-0002",
    status: "Aberta",
  },
  {
    severity: "Média",
    asset: "Endpoint administrativo",
    packageName: "Pacote de sistema",
    cve: "CVE-XXXX-0003",
    status: "Em análise",
  },
];

function getSeverityBadgeClass(severity: string) {
  if (severity === "Crítica") {
    return "bg-red-50 text-red-700";
  }

  if (severity === "Alta") {
    return "bg-orange-50 text-orange-700";
  }

  if (severity === "Média") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default async function VulnerabilitiesPage() {
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
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-red-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100">
              <Bug className="h-4 w-4" />
              Módulo em implantação
            </div>

            <h2 className="text-3xl font-bold tracking-tight">
              Vulnerabilidades
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
              Esta área será dedicada à consolidação da exposição de
              vulnerabilidades identificadas pelos agentes de segurança
              vinculados aos ativos monitorados.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-400/20 p-3">
                <Clock className="h-6 w-6 text-amber-200" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Origem planejada
                </div>
                <div className="mt-1 text-lg font-bold text-white">
                  SIEM / Agentes de segurança
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {severityCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div
                className={[
                  "mb-4 w-fit rounded-2xl p-3",
                  card.iconClassName,
                ].join(" ")}
              >
                <Icon className="h-6 w-6" />
              </div>

              <div className="text-sm font-medium text-slate-500">
                {card.label}
              </div>

              <div className={["mt-2 text-3xl font-bold", card.className].join(" ")}>
                {card.value}
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                {card.description}
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <PackageSearch className="h-6 w-6 text-slate-800" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Top pacotes vulneráveis
              </h3>
              <p className="text-sm text-slate-500">
                Visão planejada dos pacotes e componentes com maior recorrência
                de vulnerabilidades.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Layers className="h-7 w-7 text-slate-700" />
            </div>

            <h4 className="text-lg font-bold text-slate-900">
              Dados aguardando integração
            </h4>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Após a ativação do módulo, esta área exibirá os pacotes mais
              afetados, quantidade de ocorrências e distribuição por
              criticidade.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Server className="h-6 w-6 text-slate-800" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Ativos mais afetados
              </h3>
              <p className="text-sm text-slate-500">
                Visão planejada dos ativos com maior exposição.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">
                Servidores críticos
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Priorização por criticidade e função do ativo.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">
                Endpoints administrativos
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Exposição relacionada a estações e notebooks sensíveis.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">
                Serviços expostos
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Correlação futura com serviços e sistemas monitorados.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <Sparkles className="h-6 w-6 text-slate-800" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Capacidades previstas
            </h3>
            <p className="text-sm text-slate-500">
              A página será evoluída para transformar detecções técnicas em
              priorização executiva de risco.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plannedCapabilities.map((capability) => {
            const Icon = capability.icon;

            return (
              <div
                key={capability.title}
                className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
              >
                <div className="mb-4 w-fit rounded-2xl bg-white p-3 shadow-sm">
                  <Icon className="h-5 w-5 text-slate-800" />
                </div>
                <h4 className="font-bold text-slate-900">
                  {capability.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {capability.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <FileWarning className="h-6 w-6 text-slate-800" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Exemplo de visão detalhada
            </h3>
            <p className="text-sm text-slate-500">
              Estrutura prevista para consulta e priorização das
              vulnerabilidades detectadas.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Severidade</th>
                <th className="px-4 py-3 font-semibold">Ativo afetado</th>
                <th className="px-4 py-3 font-semibold">Pacote</th>
                <th className="px-4 py-3 font-semibold">CVE</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {exampleRows.map((row) => (
                <tr key={row.cve}>
                  <td className="px-4 py-4">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold",
                        getSeverityBadgeClass(row.severity),
                      ].join(" ")}
                    >
                      {row.severity}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-900">
                    {row.asset}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {row.packageName}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-600">
                    {row.cve}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <DatabaseZap className="h-6 w-6 text-slate-800" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Roadmap técnico
            </h3>
            <p className="text-sm text-slate-500">
              Etapas previstas para ativação do módulo de vulnerabilidades.
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

      <section className="rounded-3xl border border-cyan-100 bg-cyan-50 p-6 text-cyan-950 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 h-5 w-5 text-cyan-800" />
          <div>
            <div className="font-bold">Próxima etapa</div>
            <p className="mt-1 text-sm leading-6">
              A ativação real deste módulo dependerá da integração com o SIEM,
              do vínculo entre agentes de segurança e ativos do portal, e da
              criação dos snapshots internos de vulnerabilidades.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
