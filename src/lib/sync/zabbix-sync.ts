import { prisma } from "@/lib/prisma";
import { IntegrationType } from "@/generated/prisma/client";
import { getTenantsWithActiveZabbixIntegration } from "@/lib/queries/sync";
import { getTenantZabbixOverview } from "@/lib/queries/zabbix";

export async function syncTenantZabbixBySlug(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
  });

  if (!tenant) {
    throw new Error(`Tenant não encontrado: ${tenantSlug}`);
  }

  return syncTenantZabbix({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  });
}

export async function syncTenantZabbix({
  tenantId,
  tenantSlug,
}: {
  tenantId: string;
  tenantSlug: string;
}) {
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
    const currentProblemEventIds = data.problems.map((problem) => problem.eventid);

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
	
	function findHostFallbackByProblemName(problemName: string) {
      const normalizedProblemName = problemName.toLowerCase();

      return (
        data.hosts.find((host) => {
          const hostName = host.name?.toLowerCase() ?? "";
          const technicalName = host.host?.toLowerCase() ?? "";

          return (
            (hostName && normalizedProblemName.includes(hostName)) ||
            (technicalName && normalizedProblemName.includes(technicalName))
          );
        }) ?? null
      );
    }
	
    for (const problem of data.problems) {
        const firstHost =
			problem.hosts?.[0] ??
			findHostFallbackByProblemName(problem.name);

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
          zabbixHostId: firstHost?.hostid ?? null,
          hostName: firstHost?.name ?? null,
          hostTechnicalName: firstHost?.host ?? null,
	  status: "OPEN",
	  resolvedAt: null,
	  lastSeenAt: syncedAt,
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
          zabbixHostId: firstHost?.hostid ?? null,
          hostName: firstHost?.name ?? null,
          hostTechnicalName: firstHost?.host ?? null,
	  status: "OPEN",
	  resolvedAt: null,
	  lastSeenAt: syncedAt,
          rawData: problem,
          syncedAt,
        },
      });
    }
    await prisma.zabbixProblemSnapshot.updateMany({
      where: {
       tenantId,
       status: "OPEN",
       eventId: {
        notIn: currentProblemEventIds,
       },
    },
    data: {
      status: "RESOLVED",
      resolvedAt: syncedAt,
      syncedAt,
    },
  });

    const finishedAt = new Date();
    const durationMs = Date.now() - startTime;

    await prisma.integrationSyncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        status: "SUCCESS",
        message: `Sincronização concluída. Hosts: ${data.hosts.length}. Problemas: ${data.problems.length}.`,
        finishedAt,
        durationMs,
      },
    });

    return {
      status: "SUCCESS",
      tenantSlug,
      hosts: data.hosts.length,
      problems: data.problems.length,
      durationMs,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido.";

    const durationMs = Date.now() - startTime;

    await prisma.integrationSyncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        status: "ERROR",
        message,
        finishedAt: new Date(),
        durationMs,
      },
    });

    throw new Error(`[${tenantSlug}] ${message}`);
  }
}

export async function syncAllActiveZabbixTenants() {
  const tenants = await getTenantsWithActiveZabbixIntegration();

  const results = [];

  for (const tenant of tenants) {
    try {
      const result = await syncTenantZabbix({
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      });

      results.push(result);
    } catch (error) {
      results.push({
        status: "ERROR",
        tenantSlug: tenant.slug,
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      });
    }
  }

  return {
    totalTenants: tenants.length,
    results,
  };
}
