import { prisma } from "@/lib/prisma";

export async function getAdminTenantSyncOverview(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
    include: {
      integrations: {
        orderBy: {
          type: "asc",
        },
      },
      integrationSyncLogs: {
        orderBy: {
          startedAt: "desc",
        },
        take: 50,
      },
      zabbixHostSnapshots: {
        orderBy: {
          syncedAt: "desc",
        },
        take: 1,
      },
      zabbixProblemSnapshots: {
        orderBy: {
          syncedAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!tenant) {
    return null;
  }

  const latestByIntegration = tenant.integrations.map((integration) => {
    const latestLog = tenant.integrationSyncLogs.find(
      (log) => log.integrationType === integration.type
    );

    return {
      integration,
      latestLog,
    };
  });

  return {
    tenant,
    latestByIntegration,
    logs: tenant.integrationSyncLogs,
    latestHostSnapshot: tenant.zabbixHostSnapshots[0] ?? null,
    latestProblemSnapshot: tenant.zabbixProblemSnapshots[0] ?? null,
  };
}
