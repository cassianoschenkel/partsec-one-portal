import { prisma } from "@/lib/prisma";

export type AlertsDateRange = {
  startDate: Date;
  endDate: Date;
};

export function getDefaultAlertsDateRange(): AlertsDateRange {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

  return {
    startDate,
    endDate,
  };
}

function toZabbixClock(date: Date) {
  return Math.floor(date.getTime() / 1000).toString();
}

export async function getTenantZabbixAlertsOverview(
  tenantId: string,
  range: AlertsDateRange
) {
  const startClock = toZabbixClock(range.startDate);
  const endClock = toZabbixClock(range.endDate);

  const [tenant, problems, assets, lastSync] = await Promise.all([
    prisma.tenant.findUnique({
      where: {
        id: tenantId,
      },
    }),

    prisma.zabbixProblemSnapshot.findMany({
      where: {
        tenantId,
        OR: [
          {
            clock: {
              gte: startClock,
              lte: endClock,
            },
          },
          {
            resolvedAt: {
              gte: range.startDate,
              lte: range.endDate,
            },
          },
        ],
      },
      orderBy: {
        clock: "desc",
      },
      take: 250,
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

  const openProblems = enrichedProblems.filter(
    (problem) => problem.status !== "RESOLVED"
  );

  const resolvedProblems = enrichedProblems.filter(
    (problem) => problem.status === "RESOLVED"
  );

  const criticalProblems = openProblems.filter(
    (problem) => problem.severity === "5"
  );

  const highProblems = openProblems.filter(
    (problem) => problem.severity === "4"
  );

  const acknowledgedProblems = openProblems.filter(
    (problem) => problem.acknowledged === "1"
  );

  return {
    tenant,
    problems: enrichedProblems,
    lastSync,
    range,
    summary: {
      total: enrichedProblems.length,
      open: openProblems.length,
      resolved: resolvedProblems.length,
      critical: criticalProblems.length,
      high: highProblems.length,
      acknowledged: acknowledgedProblems.length,
    },
  };
}
