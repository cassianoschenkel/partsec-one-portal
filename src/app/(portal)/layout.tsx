import { PortalLayout } from "@/components/layout/PortalLayout";

export default function InternalPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalLayout>{children}</PortalLayout>;
}
