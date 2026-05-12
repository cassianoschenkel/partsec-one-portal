import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { getTenantWithRelationsById } from "@/lib/queries/tenant";
import { getInitials } from "@/lib/format";

export default async function InternalPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "PARTSEC_ADMIN") {
    return (
      <PortalLayout
        tenantName="Administração Partsec"
        tenantInitials="PA"
      >
        {children}
      </PortalLayout>
    );
  }

  if (!session.user.tenantId) {
    redirect("/login");
  }

  const tenant = await getTenantWithRelationsById(session.user.tenantId);

  if (!tenant) {
    redirect("/login");
  }

  return (
    <PortalLayout
      tenantName={tenant.name}
      tenantInitials={getInitials(tenant.name)}
    >
      {children}
    </PortalLayout>
  );
}
