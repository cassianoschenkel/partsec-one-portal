import { prisma } from "@/lib/prisma";

export async function getTenantDashboardDataById(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: {
      id: tenantId,
    },
    include: {
      assets: {
        orderBy: {
          name: "asc",
        },
      },
      integrations: {
        orderBy: {
          type: "asc",
        },
      },
      users: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!tenant) {
    return null;
  }

  const activeAssets = tenant.assets.filter((asset) => asset.isActive);
  const activeUsers = tenant.users.filter((user) => user.isActive);

  return {
    tenant,
    summary: {
      totalAssets: activeAssets.length,
      totalUsers: activeUsers.length,
      totalIntegrations: tenant.integrations.length,
      inactiveIntegrations: tenant.integrations.filter(
        (integration) => integration.status === "INACTIVE"
      ).length,
    },
    assets: activeAssets,
    integrations: tenant.integrations,
  };
}
