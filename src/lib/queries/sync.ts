import { prisma } from "@/lib/prisma";
import { IntegrationStatus, IntegrationType } from "@/generated/prisma/client";

export async function getTenantsWithActiveZabbixIntegration() {
  return prisma.tenant.findMany({
    where: {
      isActive: true,
      integrations: {
        some: {
          type: IntegrationType.ZABBIX,
          status: IntegrationStatus.ACTIVE,
          baseUrl: {
            not: null,
          },
          externalGroupId: {
            not: null,
          },
          credentials: {
            some: {
              key: "api_token",
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}
