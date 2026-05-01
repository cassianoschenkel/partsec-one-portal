import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { PortalLayout } from "@/components/layout/PortalLayout";

export default function DashboardPage() {
  return (
    <PortalLayout>
      <DashboardOverview />
    </PortalLayout>
  );
}
