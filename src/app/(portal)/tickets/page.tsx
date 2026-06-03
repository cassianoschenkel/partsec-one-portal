import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Headphones,
  LifeBuoy,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Ticket,
  TimerReset,
} from "lucide-react";

const plannedCapabilities = [
  {
    title: "Chamados centralizados",
    description:
      "Visualização dos chamados vinculados ao ambiente do cliente, com status, prioridade e histórico.",
    icon: Ticket,
  },
  {
    title: "Acompanhamento de SLA",
    description:
      "Indicadores de tempo de resposta, tempo de resolução e chamados próximos do vencimento.",
    icon: TimerReset,
  },
  {
    title: "Integração com operações Partsec",
    description:
      "Conexão com a central de atendimento para acompanhamento de demandas técnicas e tratativas.",
    icon: Headphones,
  },
  {
    title: "Relacionamento com alertas",
    description:
      "Possibilidade de vincular alertas de monitoramento a chamados operacionais ou incidentes.",
    icon: ShieldCheck,
  },
];

const roadmapItems = [
  {
    status: "Planejado",
    title: "Sincronização de chamados",
    description:
      "Importação periódica dos chamados do Zammad para snapshots internos no PostgreSQL.",
  },
  {
    status: "Planejado",
    title: "Visão por status e prioridade",
    description:
      "Filtros por aberto, em atendimento, pendente, resolvido, prioridade e responsável.",
  },
  {
    status: "Planejado",
    title: "Indicadores de SLA",
    description:
      "Cards executivos com volume de chamados, SLA cumprido, SLA em risco e backlog.",
  },
  {
    status: "Futuro",
    title: "Abertura de chamados pelo portal",
    description:
      "Permitir que usuários autorizados registrem solicitações diretamente pelo Partsec One Portal.",
  },
];

export default async function TicketsPage() {
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
              <LifeBuoy className="h-4 w-4" />
              Módulo em implantação
            </div>

            <h2 className="text-3xl font-bold tracking-tight">
              Suporte Partsec
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
              Esta área será dedicada ao acompanhamento de chamados técnicos,
              solicitações, tratativas operacionais e indicadores de atendimento
              vinculados ao ambiente monitorado.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-400/20 p-3">
                <Clock className="h-6 w-6 text-amber-200" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Status da integração
                </div>
                <div className="mt-1 text-lg font-bold text-white">
                  Aguardando integração Zammad
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <Ticket className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Chamados abertos
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">—</div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Será preenchido após a ativação da integração com a central de
            atendimento.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-amber-50 p-3">
            <AlertCircle className="h-6 w-6 text-amber-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            SLA em atenção
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-700">—</div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Indicador previsto para chamados próximos do vencimento de SLA.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-emerald-50 p-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Resolvidos no mês
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">—</div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Futuro acompanhamento executivo da produtividade operacional.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-blue-50 p-3">
            <MessageSquareText className="h-6 w-6 text-blue-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Última atualização
          </div>
          <div className="mt-2 text-3xl font-bold text-blue-700">—</div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Será exibida a última sincronização com a base de chamados.
          </p>
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
              A página de suporte será evoluída para consolidar a jornada de
              atendimento do cliente dentro do Partsec One Portal.
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
            <TimerReset className="h-6 w-6 text-slate-800" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Roadmap do módulo
            </h3>
            <p className="text-sm text-slate-500">
              Evolução prevista para transformar esta área em uma visão real de
              atendimento e SLA.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Entrega</th>
                <th className="px-4 py-3 font-semibold">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {roadmapItems.map((item) => (
                <tr key={item.title}>
                  <td className="px-4 py-4">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold",
                        item.status === "Planejado"
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-600",
                      ].join(" ")}
                    >
                      {item.status}
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
            <div className="font-bold">Próxima etapa técnica</div>
            <p className="mt-1 text-sm leading-6">
              A próxima evolução deste módulo será implementar a integração com
              o Zammad usando o mesmo padrão já adotado para o Zabbix: coleta
              via API, gravação em snapshots internos no PostgreSQL e exibição
              no portal sem dependência de consulta em tempo real.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
