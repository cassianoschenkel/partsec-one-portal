import { prisma } from "@/lib/prisma";

export async function getCustomerZabbixSnapshotOverview(tenantId: string) {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

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
        OR: [
          {
            status: {
              not: "RESOLVED",
            },
          },
          {
            resolvedAt: {
              gte: last24h,
            },
          },
        ],
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

  const openProblems = problems.filter(
    (problem) => problem.status !== "RESOLVED"
  );

  const resolvedLast24h = problems.filter(
    (problem) =>
      problem.status === "RESOLVED" &&
      problem.resolvedAt &&
      problem.resolvedAt >= last24h
  );

  const criticalOpenProblems = openProblems.filter(
    (problem) => problem.severity === "5"
  );

  const highOpenProblems = openProblems.filter(
    (problem) => problem.severity === "4"
  );

  return {
    ok: lastSync?.status === "SUCCESS" || hosts.length > 0 || problems.length > 0,
    version: null,
    hosts,
    problems,
    openProblems,
    resolvedLast24h,
    criticalOpenProblems,
    highOpenProblems,
    lastSync,
    summary: {
      totalHosts: hosts.length,
      monitoredHosts: hosts.filter((host) => host.status === "0").length,
      openProblems: openProblems.length,
      resolvedLast24h: resolvedLast24h.length,
      criticalOpenProblems: criticalOpenProblems.length,
      highOpenProblems: highOpenProblems.length,
    },
    errorMessage:
      lastSync?.status === "ERROR"
        ? lastSync.message ?? "Erro na última sincronização Zabbix."
        : null,
  };
}
