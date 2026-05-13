import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { AssetType } from "../src/generated/prisma/client";

function inferAssetTypeFromName(name: string, host: string): AssetType {
  const value = `${name} ${host}`.toLowerCase();

  if (
    value.includes("fw") ||
    value.includes("firewall") ||
    value.includes("opnsense") ||
    value.includes("pfsense") ||
    value.includes("sophos") ||
    value.includes("fortigate")
  ) {
    return AssetType.FIREWALL;
  }

  if (
    value.includes("switch") ||
    value.includes("sw-") ||
    value.includes("sw_")
  ) {
    return AssetType.SWITCH;
  }

  if (value.includes("router") || value.includes("roteador")) {
    return AssetType.ROUTER;
  }

  if (
    value.includes("ap-") ||
    value.includes("access point") ||
    value.includes("wifi")
  ) {
    return AssetType.ACCESS_POINT;
  }

  if (
    value.includes("link") ||
    value.includes("wan") ||
    value.includes("internet")
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

async function importAssetsForTenant(tenantId: string, tenantSlug: string) {
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
          name: snapshot.name || snapshot.host,
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
        hostname,
        ipAddress,
        zabbixHostId: snapshot.zabbixHostId,
      },
    });

    updated += 1;
  }

  console.log(
    `[${tenantSlug}] snapshots: ${snapshots.length}, criados: ${created}, atualizados: ${updated}, sem alterações: ${unchanged}`
  );
}

async function main() {
  const tenantSlug = process.argv[2]?.trim();

  if (tenantSlug) {
    const tenant = await prisma.tenant.findUnique({
      where: {
        slug: tenantSlug,
      },
    });

    if (!tenant) {
      console.error(`Tenant não encontrado: ${tenantSlug}`);
      process.exit(1);
    }

    await importAssetsForTenant(tenant.id, tenant.slug);
    return;
  }

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

  console.log(`Tenants com snapshots Zabbix: ${tenants.length}`);

  for (const tenant of tenants) {
    await importAssetsForTenant(tenant.id, tenant.slug);
  }
}

main()
  .catch((error) => {
    console.error("Falha ao importar/atualizar ativos do Zabbix:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
