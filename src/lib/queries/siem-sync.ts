import { prisma } from "@/lib/prisma";
import { IntegrationStatus, IntegrationType } from "@/generated/prisma/client";

export async function getTenantsWithActiveSiemIntegration() {
  return prisma.tenant.findMany({
    where: {
      isActive: true,
      integrations: {
        some: {
          type: IntegrationType.WAZUH,
          status: IntegrationStatus.ACTIVE,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}
