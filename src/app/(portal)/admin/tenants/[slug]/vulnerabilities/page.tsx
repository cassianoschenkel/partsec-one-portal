import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  Filter,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminTenantVulnerabilitiesOverview } from "@/lib/queries/admin-vulnerabilities";

type AdminTenantVulnerabilitiesPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    severity?: string;
    status?: string;
    asset?: string;
    q?: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getSeverityBadgeClass(severity: string | null) {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-100 text-red-800 border-red-200";
    case "HIGH":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "LOW":
      return "bg-sky-100 text-sky-800 border-sky-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getStatusBadgeClass(status: string | null) {
  switch (status) {
    case "OPEN":
      return "bg-red-50 text-red-700 border-red-100";
    case "RESOLVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function translateSeverity(severity: string | null) {
  switch (severity) {
    case "CRITICAL":
      return "Crítica";
    case "HIGH":
      return "Alta";
    case "MEDIUM":
      return "Média";
    case "LOW":
      return "Baixa";
    default:
      return "Não classificada";
  }
}

function translateStatus(status: string | null) {
  switch (status) {
    case "OPEN":
      return "Aberta";
    case "RESOLVED":
      return "Resolvida";
    default:
      return "Indefinido";
  }
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        </div>

        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon className="h-6 w-6 text-slate-800" />
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

export default async function AdminTenantVulnerabilitiesPage({
  params,
  searchParams,
}: AdminTenantVulnerabilitiesPageProps) {
  const { slug } = await params;
  const filters = await searchParams;

  const data = await getAdminTenantVulnerabilitiesOverview({
    tenantSlug: slug,
    filters,
  });

  if (!data) {
    notFound();
  }

  const { tenant, summary, vulnerabilities, assets } = data;

  const clearHref = `/admin/tenants/${tenant.slug}/vulnerabilities`;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        backHref={`/admin/tenants/${tenant.slug}`}
        backLabel="Voltar para o tenant"
        badgeLabel="Vulnerabilidades"
        badgeIcon={ShieldAlert}
        title={`Vulnerabilidades — ${tenant.name}`}
        description={
          <>
            Visão administrativa das vulnerabilidades identificadas nos ativos
            vinculados ao tenant{" "}
            <span className="font-semibold text-slate-900">
              {tenant.name}
            </span>
            .
          </>
        }
      />

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Críticas"
          value={summary.critical}
          description="Exigem priorização máxima."
          icon={ShieldAlert}
        />

        <SummaryCard
          title="Altas"
          value={summary.high}
          description="Devem entrar no próximo ciclo de correção."
          icon={AlertTriangle}
        />

        <SummaryCard
          title="Médias"
          value={summary.medium}
          description="Acompanhar por exposição e criticidade do ativo."
          icon={Bug}
        />

        <SummaryCard
          title="Baixas"
          value={summary.low}
          description="Risco reduzido, mas devem permanecer visíveis."
          icon={ShieldCheck}
        />

        <SummaryCard
          title="Resolvidas"
          value={summary.resolved}
          description="Itens que não aparecem mais no último ciclo."
          icon={CheckCircle2}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <div className="rounded-2xl bg-slate-100 p-3">
            <Filter className="h-5 w-5 text-slate-800" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-950">Filtros</h2>
            <p className="text-sm text-slate-500">
              Refine a visão por severidade, status, ativo ou termo de busca.
            </p>
          </div>
        </div>

        <form className="grid gap-4 lg:grid-cols-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Severidade
            </label>
            <select
              name="severity"
              defaultValue={filters.severity ?? "ALL"}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            >
              <option value="ALL">Todas</option>
              <option value="CRITICAL">Crítica</option>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Média</option>
              <option value="LOW">Baixa</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Status
            </label>
            <select
              name="status"
              defaultValue={filters.status ?? "OPEN"}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            >
              <option value="OPEN">Abertas</option>
              <option value="RESOLVED">Resolvidas</option>
              <option value="ALL">Todas</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Ativo
            </label>
            <select
              name="asset"
              defaultValue={filters.asset ?? "ALL"}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            >
              <option value="ALL">Todos</option>
              {assets.map((asset) => (
                <option key={asset.wazuhAgentId} value={asset.wazuhAgentId}>
                  {asset.name}
                  {asset.ip ? ` — ${asset.ip}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Busca
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <input
                name="q"
                type="search"
                defaultValue={filters.q ?? ""}
                placeholder="Buscar por CVE, pacote, versão ou descrição"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
            </div>
          </div>

          <div className="flex items-end gap-3 lg:col-span-5">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-[#071426] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544]"
            >
              Aplicar filtros
            </button>

            <a
              href={clearHref}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Limpar
            </a>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-950">
            Vulnerabilidades encontradas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Listagem limitada aos 500 itens mais relevantes conforme os filtros
            aplicados.
          </p>
        </div>

        {vulnerabilities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
              <ShieldCheck className="h-6 w-6 text-emerald-700" />
            </div>

            <h3 className="text-base font-bold text-slate-950">
              Nenhuma vulnerabilidade encontrada
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Não há vulnerabilidades para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Severidade</th>
                  <th className="px-6 py-4 font-bold">CVE</th>
                  <th className="px-6 py-4 font-bold">Ativo</th>
                  <th className="px-6 py-4 font-bold">Pacote</th>
                  <th className="px-6 py-4 font-bold">Versão</th>
                  <th className="px-6 py-4 font-bold">Score</th>
                  <th className="px-6 py-4 font-bold">Última detecção</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {vulnerabilities.map((vulnerability) => (
                  <tr key={vulnerability.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                          vulnerability.status
                        )}`}
                      >
                        {translateStatus(vulnerability.status)}
                      </span>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getSeverityBadgeClass(
                          vulnerability.severity
                        )}`}
                      >
                        {translateSeverity(vulnerability.severity)}
                      </span>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="font-bold text-slate-950">
                        {vulnerability.cve}
                      </div>
                      <p className="mt-1 line-clamp-2 max-w-md text-xs leading-5 text-slate-500">
                        {vulnerability.title ?? "Sem descrição disponível."}
                      </p>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="font-semibold text-slate-900">
                        {vulnerability.assetName}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {vulnerability.assetIp ?? "IP não informado"}
                      </div>
                      {vulnerability.operatingSystem && (
                        <div className="mt-1 max-w-xs truncate text-xs text-slate-400">
                          {vulnerability.operatingSystem}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="font-medium text-slate-900">
                        {vulnerability.packageName || "—"}
                      </div>
                      {vulnerability.condition && (
                        <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                          {vulnerability.condition}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 align-top text-slate-600">
                      {vulnerability.packageVersion || "—"}
                    </td>

                    <td className="px-6 py-4 align-top font-semibold text-slate-900">
                      {vulnerability.score ?? "—"}
                    </td>

                    <td className="px-6 py-4 align-top text-slate-600">
                      {formatDate(vulnerability.lastSeenAt)}
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
