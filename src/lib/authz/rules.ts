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
