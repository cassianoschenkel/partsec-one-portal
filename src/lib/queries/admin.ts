import { prisma } from "@/lib/prisma";

export async function getAdminTenantsOverview() {
  const tenants = await prisma.tenant.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      _count: {
        select: {
          users: true,
          assets: true,
          integrations: true,
        },
      },
    },
  });

  return tenants;
}
