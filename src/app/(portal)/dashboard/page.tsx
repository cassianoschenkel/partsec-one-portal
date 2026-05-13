import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { ZabbixSnapshotOverview } from "@/components/dashboard/ZabbixSnapshotOverview";
import { getTenantDashboardDataById } from "@/lib/queries/dashboard";
import { getCustomerZabbixSnapshotOverview } from "@/lib/queries/customer-zabbix-snapshot";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "PARTSEC_ADMIN") {
    redirect("/admin/tenants");
  }

  if (!session.user.tenantId) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800">
        Usuário sem tenant vinculado.
      </div>
    );
  }

  const data = await getTenantDashboardDataById(session.user.tenantId);

  if (!data) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800">
        Tenant não encontrado.
      </div>
    );
  }

  const zabbixSnapshot = await getCustomerZabbixSnapshotOverview(data.tenant.id);

  return (
    <div className="space-y-8">
      <DashboardOverview
        tenant={data.tenant}
        summary={data.summary}
        assets={data.assets}
        integrations={data.integrations}
      />

      <ZabbixSnapshotOverview snapshot={zabbixSnapshot} />
    </div>
  );
}
