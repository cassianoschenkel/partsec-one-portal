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
export async function getAdminTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: {
      slug,
    },
    include: {
      users: {
        orderBy: {
          name: "asc",
        },
      },
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
    },
  });
}