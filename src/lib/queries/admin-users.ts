import { prisma } from "@/lib/prisma";
import { UserRole } from "@/generated/prisma/client";

export async function getAdminGlobalUsers() {
  const users = await prisma.user.findMany({
    where: {
      role: UserRole.PARTSEC_ADMIN,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));
}
