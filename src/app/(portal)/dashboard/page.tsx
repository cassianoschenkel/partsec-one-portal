import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { getDemoTenantDashboardData } from "@/lib/queries/dashboard";

export default async function DashboardPage() {
  const data = await getDemoTenantDashboardData();

  if (!data) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800">
        Tenant de demonstração não encontrado.
      </div>
    );
  }

  return (
    <DashboardOverview
      tenant={data.tenant}
      summary={data.summary}
      assets={data.assets}
      integrations={data.integrations}
    />
  );
}
