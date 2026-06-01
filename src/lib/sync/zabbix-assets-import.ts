import { prisma } from "@/lib/prisma";
import { AssetType } from "@/generated/prisma/client";

function inferAssetTypeFromName(name: string, host: string): AssetType {
  const value = `${name} ${host}`.toLowerCase();

  if (
    value.includes("fw") ||
    value.includes("firewall") ||
    value.includes("opnsense") ||
    value.includes("pfsense") ||
    value.includes("sophos") ||
    value.includes("xg") ||
    value.includes("xgs") ||
    value.includes("fortigate") ||
    value.includes("fortinet") ||
    value.includes("check point") ||
    value.includes("checkpoint") ||
    value.includes("spark") ||
    value.includes("palo alto") ||
    value.includes("sonicwall")
  ) {
    return AssetType.FIREWALL;
  }

  if (
    value.includes("switch") ||
    value.includes("sw-") ||
    value.includes("sw_") ||
    value.includes("unifi switch") ||
    value.includes("usw")
  ) {
    return AssetType.SWITCH;
  }

  if (
    value.includes("router") ||
    value.includes("roteador") ||
    value.includes("edge router") ||
    value.includes("edgerouter")
  ) {
    return AssetType.ROUTER;
  }

  if (
    value.includes("ap-") ||
    value.includes("access point") ||
    value.includes("wifi") ||
    value.includes("unifi ap") ||
    value.includes("uap")
  ) {
    return AssetType.ACCESS_POINT;
  }

  if (
    value.includes("link") ||
    value.includes("wan") ||
    value.includes("internet") ||
    value.includes("isp")
  ) {
    return AssetType.LINK;
  }

  if (
    value.includes("svc") ||
    value.includes("service") ||
    value.includes("servico") ||
    value.includes("serviço")
  ) {
    return AssetType.SERVICE;
  }

  if (
    value.includes("desktop") ||
    value.includes("notebook") ||
    value.includes("workstation") ||
    value.includes("wks")
  ) {
    return AssetType.WORKSTATION;
  }

  return AssetType.SERVER;
}

function getInterfaceIp(snapshot: {
  interfaceIp: string | null;
  interfaceDns: string | null;
}) {
  return snapshot.interfaceIp || snapshot.interfaceDns || null;
}

export async function importZabbixAssetsForTenant({
  tenantId,
  tenantSlug,
}: {
  tenantId: string;
  tenantSlug: string;
}) {
  const snapshots = await prisma.zabbixHostSnapshot.findMany({
    where: {
      tenantId,
    },
    orderBy: {
      name: "asc",
    },
  });

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const snapshot of snapshots) {
    const name = snapshot.name || snapshot.host;
    const hostname = snapshot.host || snapshot.name;
    const ipAddress = getInterfaceIp(snapshot);

    const existingAsset = await prisma.customerAsset.findFirst({
      where: {
        tenantId,
        zabbixHostId: snapshot.zabbixHostId,
      },
    });

    if (!existingAsset) {
      await prisma.customerAsset.create({
        data: {
          tenantId,
          name,
          hostname,
          ipAddress,
          assetType: inferAssetTypeFromName(snapshot.name, snapshot.host),
          operatingSystem: null,
          description:
            "Ativo importado automaticamente a partir do snapshot Zabbix.",
          zabbixHostId: snapshot.zabbixHostId,
          wazuhAgentId: null,
          isActive: true,
        },
      });

      created += 1;
      continue;
    }

    const shouldUpdate =
      existingAsset.name !== name ||
      existingAsset.hostname !== hostname ||
      existingAsset.ipAddress !== ipAddress ||
      existingAsset.zabbixHostId !== snapshot.zabbixHostId;

    if (!shouldUpdate) {
      unchanged += 1;
      continue;
    }

    await prisma.customerAsset.update({
      where: {
        id: existingAsset.id,
      },
      data: {
        name,
        hostname,
        ipAddress,
        zabbixHostId: snapshot.zabbixHostId,
      },
    });

    updated += 1;
  }

  return {
    tenantSlug,
    snapshots: snapshots.length,
    created,
    updated,
    unchanged,
  };
}

export async function importZabbixAssetsForTenantBySlug(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
  });

  if (!tenant) {
    throw new Error(`Tenant não encontrado: ${tenantSlug}`);
  }

  return importZabbixAssetsForTenant({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  });
}

export async function importZabbixAssetsForAllTenants() {
  const tenants = await prisma.tenant.findMany({
    where: {
      isActive: true,
      zabbixHostSnapshots: {
        some: {},
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const results = [];

  for (const tenant of tenants) {
    const result = await importZabbixAssetsForTenant({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    });

    results.push(result);
  }

  return {
    totalTenants: tenants.length,
    results,
  };
}
