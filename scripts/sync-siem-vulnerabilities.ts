import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { syncAllActiveSiemVulnerabilityTenants } from "../src/lib/sync/siem-vulnerabilities-sync";

async function main() {
  const result = await syncAllActiveSiemVulnerabilityTenants();

  console.log(`Tenants com SIEM ativo: ${result.totalTenants}`);

  for (const item of result.results) {
    if (
      item.status === "SUCCESS" &&
      "vulnerabilities" in item
    ) {
      console.log(
        `[OK] ${item.tenantSlug}: ${item.agents} agentes, ${item.vulnerabilities} vulnerabilidades.`
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
    console.error("Falha geral na sincronização de vulnerabilidades SIEM:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
