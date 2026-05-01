import { prisma } from "@/lib/prisma";

export async function getDemoTenantWithRelations() {
  return prisma.tenant.findUnique({
    where: {
      slug: "empresa-demonstracao",
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
