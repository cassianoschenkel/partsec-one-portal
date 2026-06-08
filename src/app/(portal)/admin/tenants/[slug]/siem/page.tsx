import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clock,
  DatabaseZap,
  MonitorCog,
  Server,
  ShieldCheck,
  ShieldQuestion,
  WifiOff,
} from "lucide-react";
import { auth } from "@/../auth";
import { getTenantSiemAgentsOverview } from "@/lib/queries/admin-siem";

type TenantSiemPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type TenantSiemAgentsOverview = NonNullable<
  Awaited<ReturnType<typeof getTenantSiemAgentsOverview>>
>;

type TenantSiemAgent = TenantSiemAgentsOverview["agents"][number];

function formatDateTime(date?: Date | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    active: "Ativo",
    disconnected: "Desconectado",
    never_connected: "Nunca conectado",
    pending: "Pendente",
  };

  return labels[status ?? ""] ?? "Desconhecido";
}

function getStatusBadgeClass(status?: string | null) {
  const classes: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    disconnected: "bg-red-50 text-red-700",
    never_connected: "bg-amber-50 text-amber-700",
    pending: "bg-blue-50 text-blue-700",
  };

  return classes[status ?? ""] ?? "bg-slate-100 text-slate-600";
}

export default async function TenantSiemPage({
  params,
}: TenantSiemPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "PARTSEC_ADMIN") {
    redirect("/dashboard");
  }

  const { slug } = await params;
  const data = await getTenantSiemAgentsOverview(slug);

  if (!data) {
    notFound();
  }

  const integration = data.tenant.integrations[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href={`/admin/tenants/${data.tenant.slug}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o tenant
          </Link>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
            <ShieldCheck className="h-4 w-4" />
            Integração interna
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
            Agentes SIEM
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Visão técnica dos agentes sincronizados para{" "}
            <span className="font-semibold text-slate-800">
              {data.tenant.name}
            </span>
            . Esta área ajuda a validar coleta, status dos agentes e vínculo
            futuro com os ativos do portal.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Última sincronização
          </div>
          <div className="mt-2 text-lg font-bold text-slate-900">
            {formatDateTime(data.summary.lastSyncedAt)}
          </div>
        </div>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <Server className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">Total</div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {data.summary.total}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-emerald-50 p-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">Ativos</div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">
            {data.summary.active}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-red-50 p-3">
            <WifiOff className="h-6 w-6 text-red-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Desconectados
          </div>
          <div className="mt-2 text-3xl font-bold text-red-700">
            {data.summary.disconnected}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-amber-50 p-3">
            <Clock className="h-6 w-6 text-amber-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Nunca conectados
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-700">
            {data.summary.neverConnected}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <ShieldQuestion className="h-6 w-6 text-slate-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Desconhecidos
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-700">
            {data.summary.unknown}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <DatabaseZap className="h-6 w-6 text-slate-800" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Configuração da integração
              </h2>
              <p className="text-sm text-slate-500">
                Dados técnicos cadastrados para sincronização dos agentes.
              </p>
            </div>
          </div>

          <Link
            href={`/admin/tenants/${data.tenant.slug}/integrations`}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Editar integração
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Status
            </div>
            <div className="mt-2 font-bold text-slate-900">
              {integration?.status ?? "Não configurado"}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Base URL
            </div>
            <div className="mt-2 break-all font-mono text-xs text-slate-700">
              {integration?.baseUrl ?? "—"}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Atualizada em
            </div>
            <div className="mt-2 font-bold text-slate-900">
              {formatDateTime(integration?.updatedAt)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <MonitorCog className="h-6 w-6 text-slate-800" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Agentes sincronizados
              </h2>
              <p className="text-sm text-slate-500">
                Lista técnica dos agentes retornados pela API do SIEM.
              </p>
            </div>
          </div>
        </div>

        {data.agents.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Activity className="h-7 w-7 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Nenhum agente sincronizado
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Execute o script de sincronização ou verifique a configuração da
              integração SIEM para este tenant.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Agente</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">IP</th>
                  <th className="px-4 py-3 font-semibold">Sistema</th>
                  <th className="px-4 py-3 font-semibold">Versão</th>
                  <th className="px-4 py-3 font-semibold">Node</th>
                  <th className="px-4 py-3 font-semibold">Último keepalive</th>
                  <th className="px-4 py-3 font-semibold">ID técnico</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
		  {data.agents.map((agent: TenantSiemAgent) => (
                  <tr key={agent.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900">
                        {agent.name}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-bold",
                          getStatusBadgeClass(agent.status),
                        ].join(" ")}
                      >
                        {getStatusLabel(agent.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 font-mono text-xs text-slate-600">
                      {agent.ip ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {agent.operatingSystem ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {agent.version ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {agent.nodeName ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {formatDateTime(agent.lastKeepAlive)}
                    </td>

                    <td className="px-4 py-4 font-mono text-xs text-slate-500">
                      {agent.wazuhAgentId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
