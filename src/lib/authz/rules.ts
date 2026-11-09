import { UserRole } from "@/generated/prisma/enums";

export class AuthorizationError extends Error {
  constructor(message = "Não autorizado.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export type AuthorizedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  isActive: boolean;
};

export function assertActiveUser(
  user: AuthorizedUser | null
): asserts user is AuthorizedUser {
  if (!user) {
    throw new AuthorizationError("Usuário não autenticado.");
  }

  if (!user.isActive) {
    throw new AuthorizationError("Usuário inativo.");
  }
}

export function assertPartsecAdminRole(
  user: Pick<AuthorizedUser, "role">
): void {
  if (user.role !== UserRole.PARTSEC_ADMIN) {
    throw new AuthorizationError(
      "Acesso restrito a administradores globais."
    );
  }
}

export function assertTenantMutationRole(
  user: Pick<AuthorizedUser, "role" | "tenantId">
): asserts user is Pick<AuthorizedUser, "role"> & { tenantId: string } {
  if (
    user.role !== UserRole.TENANT_ADMIN &&
    user.role !== UserRole.TENANT_USER
  ) {
    throw new AuthorizationError(
      "Usuário não autorizado a executar esta ação."
    );
  }

  if (!user.tenantId) {
    throw new AuthorizationError(
      "Usuário não autorizado a executar esta ação."
    );
  }
}

/**
 * Fail-closed: only an explicit PARTSEC_ADMIN role may see session metadata
 * (name / e-mail / technical role code) in the portal header. Any other value,
 * including undefined, hides it.
 */
export function canViewSessionMetadata(role: UserRole | null | undefined) {
  return role === UserRole.PARTSEC_ADMIN;
}
