import { ShieldAlert } from "lucide-react";
import { getTenantVulnerabilitiesOverview } from "@/lib/queries/vulnerabilities";
import { NoTenantNotice } from "@/components/vulnerabilities/NoTenantNotice";
import { VulnerabilitySummaryCards } from "@/components/vulnerabilities/SummaryCard";
import { VulnerabilityFiltersForm } from "@/components/vulnerabilities/VulnerabilityFiltersForm";
import { VulnerabilitiesTable } from "@/components/vulnerabilities/VulnerabilitiesTable";
import { VulnerabilityPagination } from "@/components/vulnerabilities/VulnerabilityPagination";

type VulnerabilitiesPageProps = {
  searchParams: Promise<{
    severity?: string;
    status?: string;
    asset?: string;
    q?: string;
    page?: string | string[];
  }>;
};

export default async function VulnerabilitiesPage({
  searchParams,
}: VulnerabilitiesPageProps) {
  const params = await searchParams;

  const { hasTenant, summary, vulnerabilities, assets, pagination } =
    await getTenantVulnerabilitiesOverview({
      severity: params.severity,
      status: params.status,
      asset: params.asset,
      q: params.q,
      page: params.page,
    });

  if (!hasTenant) {
    return (
      <NoTenantNotice
        title="Vulnerabilidades indisponíveis para este usuário"
        description="Este usuário não está associado a um tenant específico. Para visualizar vulnerabilidades, acesse com um usuário do tenant cliente ou associe este usuário a um tenant."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              <ShieldAlert className="h-4 w-4" />
              Vulnerabilidades
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Exposição técnica dos ativos monitorados
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Visão consolidada das vulnerabilidades identificadas nos ativos
              com agente de segurança associado ao tenant.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">
              {summary.open}
            </span>{" "}
            vulnerabilidades abertas
          </div>
        </div>
      </section>

      <VulnerabilitySummaryCards summary={summary} />

      <VulnerabilityFiltersForm
        filters={params}
        assets={assets}
        clearHref="/vulnerabilities"
      />

      <div className="space-y-4">
        <VulnerabilitiesTable
          vulnerabilities={vulnerabilities}
          pagination={pagination}
          hrefFor={(vulnerability) => `/vulnerabilities/${vulnerability.id}`}
        />

        <VulnerabilityPagination
          basePath="/vulnerabilities"
          filters={{
            severity: params.severity,
            status: params.status,
            asset: params.asset,
            q: params.q,
          }}
          meta={pagination}
        />
      </div>
    </div>
  );
}
