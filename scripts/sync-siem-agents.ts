import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { syncAllActiveSiemTenants } from "../src/lib/sync/siem-agents-sync";

async function main() {
  const result = await syncAllActiveSiemTenants();

  console.log(`Tenants com SIEM ativo: ${result.totalTenants}`);

  for (const item of result.results) {
    if (
      item.status === "SUCCESS" &&
      "agents" in item
    ) {
      console.log(`[OK] ${item.tenantSlug}: ${item.agents} agentes.`);
    } else if ("message" in item) {
      console.error(`[ERRO] ${item.tenantSlug}: ${item.message}`);
    } else {
      console.error(`[ERRO] ${item.tenantSlug}: resultado inesperado.`);
    }
  }
}

main()
  .catch((error) => {
    console.error("Falha geral na sincronização SIEM:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
