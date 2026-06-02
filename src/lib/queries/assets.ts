import { prisma } from "@/lib/prisma";

export type AssetsFilters = {
  status?: "all" | "monitored" | "linked" | "pending" | "unlinked";
  type?: string;
};

export async function getTenantAssetsWithZabbixSnapshots(
  tenantId: string,
  filters: AssetsFilters = {}
) {
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

  const assetsWithSnapshots = tenant.assets.map((asset) => {
    const zabbixSnapshot = asset.zabbixHostId
      ? snapshotsByZabbixHostId.get(asset.zabbixHostId) ?? null
      : null;

    return {
      ...asset,
      zabbixSnapshot,
    };
  });

  const activeAssets = assetsWithSnapshots.filter((asset) => asset.isActive);

  const filteredAssets = activeAssets.filter((asset) => {
    if (filters.type && asset.assetType !== filters.type) {
      return false;
    }

    if (filters.status === "monitored") {
      return asset.zabbixSnapshot?.status === "0";
    }

    if (filters.status === "linked") {
      return Boolean(asset.zabbixHostId);
    }

    if (filters.status === "pending") {
      return Boolean(asset.zabbixHostId && !asset.zabbixSnapshot);
    }

    if (filters.status === "unlinked") {
      return !asset.zabbixHostId;
    }

    return true;
  });

  const linkedAssets = activeAssets.filter((asset) => asset.zabbixHostId);
  const monitoredAssets = activeAssets.filter(
    (asset) => asset.zabbixSnapshot?.status === "0"
  );
  const assetsWithValidSnapshot = activeAssets.filter(
    (asset) => asset.zabbixSnapshot
  );
  const assetsWithoutZabbixLink = activeAssets.filter(
    (asset) => !asset.zabbixHostId
  );
  const assetsWithMissingSnapshot = activeAssets.filter(
    (asset) => asset.zabbixHostId && !asset.zabbixSnapshot
  );

  const assetsByType = activeAssets.reduce<Record<string, number>>(
    (acc, asset) => {
      acc[asset.assetType] = (acc[asset.assetType] ?? 0) + 1;
      return acc;
    },
    {}
  );

  return {
    tenant,
    assets: filteredAssets,
    allAssets: activeAssets,
    filters,
    summary: {
      totalAssets: activeAssets.length,
      filteredAssets: filteredAssets.length,
      linkedAssets: linkedAssets.length,
      monitoredAssets: monitoredAssets.length,
      assetsWithValidSnapshot: assetsWithValidSnapshot.length,
      assetsWithoutZabbixLink: assetsWithoutZabbixLink.length,
      assetsWithMissingSnapshot: assetsWithMissingSnapshot.length,
      pendingAssets:
        assetsWithoutZabbixLink.length + assetsWithMissingSnapshot.length,
      assetsByType,
    },
  };
}
