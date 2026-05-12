import { prisma } from "@/lib/prisma";

export async function getTenantWithRelationsById(tenantId: string) {
  return prisma.tenant.findUnique({
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
}
