import { prisma } from "@/lib/prisma";

export async function getTenantZabbixAlertsOverview(tenantId: string) {
  const [tenant, problems, lastSync] = await Promise.all([
    prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
    }),

    prisma.zabbixProblemSnapshot.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        clock: "desc",
      },
      take: 100,
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

  if (!tenant) {
    return null;
  }

  const criticalProblems = problems.filter((problem) => problem.severity === "5");
  const highProblems = problems.filter((problem) => problem.severity === "4");
  const mediumProblems = problems.filter((problem) => problem.severity === "3");
  const acknowledgedProblems = problems.filter(
    (problem) => problem.acknowledged === "1"
  );
  const openProblems = problems.filter((problem) => problem.acknowledged !== "1");

  return {
    tenant,
    problems,
    lastSync,
    summary: {
      total: problems.length,
      critical: criticalProblems.length,
      high: highProblems.length,
      medium: mediumProblems.length,
      open: openProblems.length,
      acknowledged: acknowledgedProblems.length,
    },
  };
}
