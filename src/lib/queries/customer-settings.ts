import { prisma } from "@/lib/prisma";

/**
 * Strict, allowlisted selects for the customer-facing portal. Never add
 * baseUrl, externalGroupId, externalOrgId, notes, credentials or slug here.
 */
export const customerSettingsSelect = {
  name: true,
  document: true,
  isActive: true,
  users: {
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  },
  integrations: {
    orderBy: { type: "asc" },
    select: {
      type: true,
      status: true,
    },
  },
} as const;

export async function getCustomerSettingsByTenantId(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: customerSettingsSelect,
  });
}

export async function getTenantNameById(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
}
