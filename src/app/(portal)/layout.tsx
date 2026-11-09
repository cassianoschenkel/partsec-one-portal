import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { getTenantNameById } from "@/lib/queries/customer-settings";
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
        userName={session.user.name}
        userEmail={session.user.email}
        userRole={session.user.role}
      >
        {children}
      </PortalLayout>
    );
  }

  if (!session.user.tenantId) {
    redirect("/login");
  }

  const tenant = await getTenantNameById(session.user.tenantId);

  if (!tenant) {
    redirect("/login");
  }

  return (
    <PortalLayout
      tenantName={tenant.name}
      tenantInitials={getInitials(tenant.name)}
      userName={session.user.name}
      userEmail={session.user.email}
      userRole={session.user.role}
    >
      {children}
    </PortalLayout>
  );
}
