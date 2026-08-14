import { auth } from "@/../auth";
import { prisma } from "@/lib/prisma";
import {
  AuthorizationError,
  assertActiveUser,
  assertPartsecAdminRole,
  type AuthorizedUser,
} from "./rules";

export { AuthorizationError, type AuthorizedUser };

export async function requireActiveUser(): Promise<AuthorizedUser> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthorizationError("Usuário não autenticado.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tenantId: true,
      isActive: true,
    },
  });

  assertActiveUser(user);

  return user;
}

export async function requirePartsecAdmin(): Promise<AuthorizedUser> {
  const user = await requireActiveUser();

  assertPartsecAdminRole(user);

  return user;
}
