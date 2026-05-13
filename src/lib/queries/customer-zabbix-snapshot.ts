import { prisma } from "@/lib/prisma";

export async function getCustomerZabbixSnapshotOverview(tenantId: string) {
  const [hosts, problems, lastSync] = await Promise.all([
    prisma.zabbixHostSnapshot.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.zabbixProblemSnapshot.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        clock: "desc",
      },
      take: 50,
    }),
    prisma.integrationSyncLog.findFirst({
      where: {
        tenantId,
        integrationType: "ZABBIX",
      },
      orderBy: {
        startedAt: "desc",
      },
    }),
  ]);

  return {
    ok: lastSync?.status === "SUCCESS" || hosts.length > 0 || problems.length > 0,
    version: null,
    hosts,
    problems,
    lastSync,
    errorMessage:
      lastSync?.status === "ERROR"
        ? lastSync.message ?? "Erro na última sincronização Zabbix."
        : null,
  };
}
