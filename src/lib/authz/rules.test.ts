import { test } from "node:test";
import assert from "node:assert/strict";
import { UserRole } from "@/generated/prisma/enums";
import {
  AuthorizationError,
  assertActiveUser,
  assertPartsecAdminRole,
  assertTenantMutationRole,
  type AuthorizedUser,
} from "./rules";

function buildUser(overrides: Partial<AuthorizedUser> = {}): AuthorizedUser {
  return {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    role: UserRole.TENANT_USER,
    tenantId: "tenant-1",
    isActive: true,
    ...overrides,
  };
}

test("assertActiveUser rejects a missing session user", () => {
  assert.throws(() => assertActiveUser(null), AuthorizationError);
});

test("assertActiveUser rejects an inactive user", () => {
  const user = buildUser({ isActive: false });
  assert.throws(() => assertActiveUser(user), AuthorizationError);
});

test("assertActiveUser accepts an active user", () => {
  const user = buildUser({ isActive: true });
  assert.doesNotThrow(() => assertActiveUser(user));
});

test("assertPartsecAdminRole rejects a non-admin role", () => {
  const user = buildUser({ role: UserRole.TENANT_ADMIN });
  assert.throws(() => assertPartsecAdminRole(user), AuthorizationError);
});

test("assertPartsecAdminRole accepts PARTSEC_ADMIN", () => {
  const user = buildUser({ role: UserRole.PARTSEC_ADMIN });
  assert.doesNotThrow(() => assertPartsecAdminRole(user));
});

test("assertTenantMutationRole rejects READ_ONLY", () => {
  const user = buildUser({ role: UserRole.READ_ONLY });
  assert.throws(() => assertTenantMutationRole(user), AuthorizationError);
});

test("assertTenantMutationRole rejects PARTSEC_ADMIN", () => {
  const user = buildUser({ role: UserRole.PARTSEC_ADMIN, tenantId: null });
  assert.throws(() => assertTenantMutationRole(user), AuthorizationError);
});

test("assertTenantMutationRole rejects a tenant user without tenantId", () => {
  const user = buildUser({ role: UserRole.TENANT_USER, tenantId: null });
  assert.throws(() => assertTenantMutationRole(user), AuthorizationError);
});

test("assertTenantMutationRole accepts TENANT_ADMIN with tenantId", () => {
  const user = buildUser({ role: UserRole.TENANT_ADMIN, tenantId: "tenant-1" });
  assert.doesNotThrow(() => assertTenantMutationRole(user));
});

test("assertTenantMutationRole accepts TENANT_USER with tenantId", () => {
  const user = buildUser({ role: UserRole.TENANT_USER, tenantId: "tenant-1" });
  assert.doesNotThrow(() => assertTenantMutationRole(user));
});

test("assertTenantMutationRole fails closed for an unrecognized future role", () => {
  const user = buildUser({
    role: "FUTURE_ROLE" as UserRole,
    tenantId: "tenant-1",
  });
  assert.throws(() => assertTenantMutationRole(user), AuthorizationError);
});
