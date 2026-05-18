import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { syncAllActiveZabbixTenants } from "../src/lib/sync/zabbix-sync";

async function main() {
  const result = await syncAllActiveZabbixTenants();

  console.log(`Tenants com Zabbix ativo: ${result.totalTenants}`);

  for (const item of result.results) {
    if (
      item.status === "SUCCESS" &&
      "hosts" in item &&
      "problems" in item
    ) {
      console.log(
        `[OK] ${item.tenantSlug}: ${item.hosts} hosts, ${item.problems} problemas.`
      );
    } else if ("message" in item) {
      console.error(`[ERRO] ${item.tenantSlug}: ${item.message}`);
    } else {
      console.error(`[ERRO] ${item.tenantSlug}: resultado inesperado.`);
    }
  }
}

main()
  .catch((error) => {
    console.error("Falha geral na sincronização Zabbix:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
