import { prisma } from "@/lib/prisma";

export async function getAdminTenantUserForEdit({
  tenantSlug,
  userId,
}: {
  tenantSlug: string;
  userId: string;
}) {
  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!tenant) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      tenantId: tenant.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      tenantId: true,
    },
  });

  if (!user) {
    return {
      tenant,
      user: null,
    };
  }

  return {
    tenant,
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  };
}
