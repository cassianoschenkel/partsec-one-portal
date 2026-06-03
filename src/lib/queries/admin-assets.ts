import { prisma } from "@/lib/prisma";

export async function getAdminTenantAssetById({
  tenantSlug,
  assetId,
}: {
  tenantSlug: string;
  assetId: string;
}) {
  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
    include: {
      assets: {
        where: {
          id: assetId,
        },
        take: 1,
      },
    },
  });

  if (!tenant) {
    return null;
  }

  const asset = tenant.assets[0];

  if (!asset) {
    return null;
  }

  return {
    tenant,
    asset,
  };
}
