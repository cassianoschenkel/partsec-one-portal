import { prisma } from "@/lib/prisma";

export async function getTenantAssetsWithZabbixSnapshots(tenantId: string) {
  const [tenant, zabbixSnapshots] = await Promise.all([
    prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
      include: {
        assets: {
          orderBy: {
            name: "asc",
          },
        },
      },
    }),
    prisma.zabbixHostSnapshot.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  if (!tenant) {
    return null;
  }

  const snapshotsByZabbixHostId = new Map(
    zabbixSnapshots.map((snapshot) => [snapshot.zabbixHostId, snapshot])
  );

  const assets = tenant.assets.map((asset) => {
    const zabbixSnapshot = asset.zabbixHostId
      ? snapshotsByZabbixHostId.get(asset.zabbixHostId) ?? null
      : null;

    return {
      ...asset,
      zabbixSnapshot,
    };
  });

  const linkedAssets = assets.filter((asset) => asset.zabbixHostId);
  const assetsWithValidSnapshot = assets.filter((asset) => asset.zabbixSnapshot);
  const assetsWithoutZabbixLink = assets.filter((asset) => !asset.zabbixHostId);
  const assetsWithMissingSnapshot = assets.filter(
    (asset) => asset.zabbixHostId && !asset.zabbixSnapshot
  );

  return {
    tenant,
    assets,
    summary: {
      totalAssets: assets.length,
      linkedAssets: linkedAssets.length,
      assetsWithValidSnapshot: assetsWithValidSnapshot.length,
      assetsWithoutZabbixLink: assetsWithoutZabbixLink.length,
      assetsWithMissingSnapshot: assetsWithMissingSnapshot.length,
    },
  };
}
