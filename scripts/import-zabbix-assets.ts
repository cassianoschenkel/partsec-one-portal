import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  importZabbixAssetsForAllTenants,
  importZabbixAssetsForTenantBySlug,
} from "../src/lib/sync/zabbix-assets-import";

async function main() {
  const tenantSlug = process.argv[2]?.trim();

  if (tenantSlug) {
    const result = await importZabbixAssetsForTenantBySlug(tenantSlug);

    console.log(
      `[${result.tenantSlug}] snapshots: ${result.snapshots}, criados: ${result.created}, atualizados: ${result.updated}, sem alterações: ${result.unchanged}`
    );

    return;
  }

  const result = await importZabbixAssetsForAllTenants();

  console.log(`Tenants com snapshots Zabbix: ${result.totalTenants}`);

  for (const item of result.results) {
    console.log(
      `[${item.tenantSlug}] snapshots: ${item.snapshots}, criados: ${item.created}, atualizados: ${item.updated}, sem alterações: ${item.unchanged}`
    );
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
