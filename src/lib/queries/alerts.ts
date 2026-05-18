import { prisma } from "@/lib/prisma";

export async function getTenantZabbixAlertsOverview(tenantId: string) {
  const [tenant, problems, assets, lastSync] = await Promise.all([
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

    prisma.customerAsset.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
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

  const assetsByZabbixHostId = new Map(
    assets
      .filter((asset) => asset.zabbixHostId)
      .map((asset) => [asset.zabbixHostId, asset])
  );

  const enrichedProblems = problems.map((problem) => {
    const asset = problem.zabbixHostId
      ? assetsByZabbixHostId.get(problem.zabbixHostId) ?? null
      : null;

    return {
      ...problem,
      asset,
    };
  });

  const criticalProblems = enrichedProblems.filter(
    (problem) => problem.severity === "5"
  );
  const highProblems = enrichedProblems.filter(
    (problem) => problem.severity === "4"
  );
  const mediumProblems = enrichedProblems.filter(
    (problem) => problem.severity === "3"
  );
  const acknowledgedProblems = enrichedProblems.filter(
    (problem) => problem.acknowledged === "1"
  );
  const openProblems = enrichedProblems.filter(
    (problem) => problem.acknowledged !== "1"
  );

  return {
    tenant,
    problems: enrichedProblems,
    lastSync,
    summary: {
      total: enrichedProblems.length,
      critical: criticalProblems.length,
      high: highProblems.length,
      medium: mediumProblems.length,
      open: openProblems.length,
      acknowledged: acknowledgedProblems.length,
    },
  };
}