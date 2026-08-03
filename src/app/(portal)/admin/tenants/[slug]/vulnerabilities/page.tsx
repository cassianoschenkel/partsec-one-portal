import { ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminTenantVulnerabilitiesOverview } from "@/lib/queries/admin-vulnerabilities";
import { VulnerabilitySummaryCards } from "@/components/vulnerabilities/SummaryCard";
import { VulnerabilityFiltersForm } from "@/components/vulnerabilities/VulnerabilityFiltersForm";
import { VulnerabilitiesTable } from "@/components/vulnerabilities/VulnerabilitiesTable";
import { VulnerabilityPagination } from "@/components/vulnerabilities/VulnerabilityPagination";

type AdminTenantVulnerabilitiesPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    severity?: string;
    status?: string;
    asset?: string;
    q?: string;
    page?: string | string[];
  }>;
};

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

  const { tenant, summary, vulnerabilities, assets, pagination } = data;

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

      <VulnerabilitySummaryCards summary={summary} />

      <VulnerabilityFiltersForm
        filters={filters}
        assets={assets}
        clearHref={clearHref}
      />

      <div className="space-y-4">
        <VulnerabilitiesTable
          vulnerabilities={vulnerabilities}
          pagination={pagination}
          hrefFor={(vulnerability) =>
            `/admin/tenants/${tenant.slug}/vulnerabilities/${vulnerability.id}`
          }
        />

        <VulnerabilityPagination
          basePath={`/admin/tenants/${tenant.slug}/vulnerabilities`}
          filters={{
            severity: filters.severity,
            status: filters.status,
            asset: filters.asset,
            q: filters.q,
          }}
          meta={pagination}
        />
      </div>
    </div>
  );
}
