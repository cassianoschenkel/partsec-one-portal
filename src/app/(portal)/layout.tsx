import { PortalLayout } from "@/components/layout/PortalLayout";
import { getDemoTenantWithRelations } from "@/lib/queries/tenant";
import { getInitials } from "@/lib/format";

export default async function InternalPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getDemoTenantWithRelations();

  return (
    <PortalLayout
      tenantName={tenant?.name ?? "Tenant não encontrado"}
      tenantInitials={tenant ? getInitials(tenant.name) : "TN"}
    >
      {children}
    </PortalLayout>
  );
}
