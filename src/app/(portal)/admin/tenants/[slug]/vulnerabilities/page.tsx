import { ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminTenantVulnerabilitiesOverview } from "@/lib/queries/admin-vulnerabilities";
import { VulnerabilitySummaryCards } from "@/components/vulnerabilities/SummaryCard";
import { VulnerabilityFiltersForm } from "@/components/vulnerabilities/VulnerabilityFiltersForm";
import { VulnerabilitiesTable } from "@/components/vulnerabilities/VulnerabilitiesTable";

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

      <VulnerabilitySummaryCards summary={summary} />

      <VulnerabilityFiltersForm
        filters={filters}
        assets={assets}
        clearHref={clearHref}
      />

      <VulnerabilitiesTable
        vulnerabilities={vulnerabilities}
        maxItems={500}
        hrefFor={(vulnerability) =>
          `/admin/tenants/${tenant.slug}/vulnerabilities/${vulnerability.id}`
        }
      />
    </div>
  );
}
