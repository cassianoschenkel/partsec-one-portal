import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { IntegrationType } from "../src/generated/prisma/client";
import { getTenantsWithActiveZabbixIntegration } from "../src/lib/queries/sync";
import { getTenantZabbixOverview } from "../src/lib/queries/zabbix";

async function syncTenantZabbix(tenantSlug: string, tenantId: string) {
  const startedAt = new Date();
  const startTime = Date.now();

  const syncLog = await prisma.integrationSyncLog.create({
    data: {
      tenantId,
      integrationType: IntegrationType.ZABBIX,
      status: "RUNNING",
      startedAt,
      message: "Sincronização Zabbix iniciada.",
    },
  });

  try {
    const data = await getTenantZabbixOverview(tenantSlug);
    const syncedAt = new Date();

    for (const host of data.hosts) {
      const firstInterface = host.interfaces?.[0];

      await prisma.zabbixHostSnapshot.upsert({
        where: {
          tenantId_zabbixHostId: {
            tenantId,
            zabbixHostId: host.hostid,
          },
        },
        update: {
          host: host.host,
          name: host.name,
          status: host.status,
          interfaceIp: firstInterface?.ip ?? null,
          interfaceDns: firstInterface?.dns ?? null,
          rawData: host,
          syncedAt,
        },
        create: {
          tenantId,
          zabbixHostId: host.hostid,
          host: host.host,
          name: host.name,
          status: host.status,
          interfaceIp: firstInterface?.ip ?? null,
          interfaceDns: firstInterface?.dns ?? null,
          rawData: host,
          syncedAt,
        },
      });
    }

    for (const problem of data.problems) {
      await prisma.zabbixProblemSnapshot.upsert({
        where: {
          tenantId_eventId: {
            tenantId,
            eventId: problem.eventid,
          },
        },
        update: {
          objectId: problem.objectid ?? null,
          name: problem.name,
          severity: problem.severity,
          clock: problem.clock,
          acknowledged: problem.acknowledged,
          rawData: problem,
          syncedAt,
        },
        create: {
          tenantId,
          eventId: problem.eventid,
          objectId: problem.objectid ?? null,
          name: problem.name,
          severity: problem.severity,
          clock: problem.clock,
          acknowledged: problem.acknowledged,
          rawData: problem,
          syncedAt,
        },
      });
    }

    await prisma.integrationSyncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        status: "SUCCESS",
        message: `Sincronização concluída. Hosts: ${data.hosts.length}. Problemas: ${data.problems.length}.`,
        finishedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    });

    console.log(
      `[OK] ${tenantSlug}: ${data.hosts.length} hosts, ${data.problems.length} problemas.`
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido.";

    await prisma.integrationSyncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        status: "ERROR",
        message,
        finishedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    });

    console.error(`[ERRO] ${tenantSlug}: ${message}`);
  }
}

async function main() {
  const tenants = await getTenantsWithActiveZabbixIntegration();

  console.log(`Tenants com Zabbix ativo: ${tenants.length}`);

  for (const tenant of tenants) {
    await syncTenantZabbix(tenant.slug, tenant.id);
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
