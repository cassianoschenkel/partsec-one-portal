import { prisma } from "@/lib/prisma";

export async function getTenantSiemAgentsOverview(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      integrations: {
        where: {
          type: "WAZUH",
        },
        select: {
          id: true,
          status: true,
          baseUrl: true,
          displayName: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!tenant) {
    return null;
  }

  const agents = await prisma.siemAgentSnapshot.findMany({
    where: {
      tenantId: tenant.id,
    },
    orderBy: [
      {
        status: "asc",
      },
      {
        name: "asc",
      },
    ],
  });

  const total = agents.length;
  const active = agents.filter((agent) => agent.status === "active").length;
  const disconnected = agents.filter(
    (agent) => agent.status === "disconnected"
  ).length;
  const neverConnected = agents.filter(
    (agent) => agent.status === "never_connected"
  ).length;
  const unknown = agents.filter((agent) => !agent.status).length;

  const lastSyncedAt =
    agents.length > 0
      ? agents.reduce<Date | null>((latest, agent) => {
          if (!latest || agent.syncedAt > latest) {
            return agent.syncedAt;
          }

          return latest;
        }, null)
      : null;

  return {
    tenant,
    agents,
    summary: {
      total,
      active,
      disconnected,
      neverConnected,
      unknown,
      lastSyncedAt,
    },
  };
}
