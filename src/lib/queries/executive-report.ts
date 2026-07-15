import { auth } from "@/../auth";
import { prisma } from "@/lib/prisma";

const severityOrder: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
};

// Initial report limit: bounds how many OPEN vulnerability rows are loaded
// into memory for the ranking calculations below (top CVEs). Prisma
// aggregation (count/groupBy) is used everywhere else. Revisit this cap if a
// tenant's open vulnerability volume regularly approaches it.
const OPEN_VULNERABILITIES_RANKING_LIMIT = 5000;

export type ExecutiveRiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ExecutiveReportData = {
  hasTenant: boolean;
  tenantName: string | null;
  hasVulnerabilityData: boolean;
  riskLevel: ExecutiveRiskLevel;
  recommendations: string[];
  siem: {
    status: string | null;
    lastSyncedAt: string | null;
  };
  agents: {
    total: number;
    active: number;
    disconnected: number;
    neverConnected: number;
    unknown: number;
  };
  assets: {
    total: number;
    active: number;
  };
  vulnerabilities: {
    open: number;
    resolved: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    topAssets: Array<{
      wazuhAgentId: string;
      name: string;
      ip: string | null;
      openCount: number;
    }>;
    topVulnerabilities: Array<{
      id: string;
      cve: string;
      title: string | null;
      severity: string | null;
      score: number | null;
      assetName: string;
    }>;
  };
};

function computeRiskLevel(vulnerabilities: {
  open: number;
  critical: number;
  high: number;
}): ExecutiveRiskLevel {
  if (vulnerabilities.critical > 0) {
    return "CRITICAL";
  }

  if (vulnerabilities.high > 0) {
    return "HIGH";
  }

  if (vulnerabilities.open > 0) {
    return "MEDIUM";
  }

  return "LOW";
}

function computeRecommendations(vulnerabilities: {
  open: number;
  critical: number;
  high: number;
}): string[] {
  const recommendations: string[] = [];

  if (vulnerabilities.critical > 0) {
    recommendations.push(
      "Priorizar a remediação das vulnerabilidades críticas em aberto."
    );
  }

  if (vulnerabilities.high > 0) {
    recommendations.push(
      "Planejar a remediação das vulnerabilidades de severidade alta."
    );
  }

  if (vulnerabilities.open > 0) {
    recommendations.push(
      "Revisar os ativos afetados e as vulnerabilidades recorrentes."
    );
  }

  recommendations.push(
    "Manter o histórico de remediações e realizar revisões periódicas."
  );

  return recommendations;
}

function formatNullableDate(date: Date | null | undefined) {
  if (!date) {
    return null;
  }

  return date.toISOString();
}

async function getCurrentTenantId() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
    select: {
      tenantId: true,
    },
  });

  return user?.tenantId ?? null;
}

function emptyExecutiveReport(): ExecutiveReportData {
  return {
    hasTenant: false,
    tenantName: null,
    hasVulnerabilityData: false,
    riskLevel: computeRiskLevel({ open: 0, critical: 0, high: 0 }),
    recommendations: computeRecommendations({ open: 0, critical: 0, high: 0 }),
    siem: {
      status: null,
      lastSyncedAt: null,
    },
    agents: {
      total: 0,
      active: 0,
      disconnected: 0,
      neverConnected: 0,
      unknown: 0,
    },
    assets: {
      total: 0,
      active: 0,
    },
    vulnerabilities: {
      open: 0,
      resolved: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      topAssets: [],
      topVulnerabilities: [],
    },
  };
}

export async function getExecutiveReportForTenant(
  tenantId: string
): Promise<ExecutiveReportData> {
  const [
    tenant,
    openCount,
    resolvedCount,
    severityGroups,
    wazuhIntegration,
    lastWazuhSync,
    agents,
    assetsTotal,
    assetsActive,
    topAssetGroups,
    rankingVulnerabilities,
  ] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    }),

    prisma.siemVulnerabilitySnapshot.count({
      where: { tenantId, status: "OPEN" },
    }),

    prisma.siemVulnerabilitySnapshot.count({
      where: { tenantId, status: "RESOLVED" },
    }),

    prisma.siemVulnerabilitySnapshot.groupBy({
      by: ["severity"],
      where: { tenantId, status: "OPEN" },
      _count: { _all: true },
    }),

    prisma.integrationConfig.findFirst({
      where: { tenantId, type: "WAZUH" },
      select: { status: true },
    }),

    prisma.integrationSyncLog.findFirst({
      where: { tenantId, integrationType: "WAZUH" },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true, finishedAt: true },
    }),

    prisma.siemAgentSnapshot.findMany({
      where: { tenantId },
      select: { status: true },
    }),

    prisma.customerAsset.count({
      where: { tenantId },
    }),

    prisma.customerAsset.count({
      where: { tenantId, isActive: true },
    }),

    prisma.siemVulnerabilitySnapshot.groupBy({
      by: ["wazuhAgentId"],
      where: { tenantId, status: "OPEN" },
      _count: { _all: true },
      orderBy: { _count: { wazuhAgentId: "desc" } },
      take: 5,
    }),

    prisma.siemVulnerabilitySnapshot.findMany({
      where: { tenantId, status: "OPEN" },
      take: OPEN_VULNERABILITIES_RANKING_LIMIT,
      select: {
        id: true,
        wazuhAgentId: true,
        cve: true,
        title: true,
        severity: true,
        score: true,
      },
    }),
  ]);

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const group of severityGroups) {
    switch (group.severity) {
      case "CRITICAL":
        severityCounts.critical = group._count._all;
        break;
      case "HIGH":
        severityCounts.high = group._count._all;
        break;
      case "MEDIUM":
        severityCounts.medium = group._count._all;
        break;
      case "LOW":
        severityCounts.low = group._count._all;
        break;
      default:
        break;
    }
  }

  const agentStatusCounts = agents.reduce(
    (acc, agent) => {
      if (agent.status === "active") {
        acc.active += 1;
      } else if (agent.status === "disconnected") {
        acc.disconnected += 1;
      } else if (agent.status === "never_connected") {
        acc.neverConnected += 1;
      } else {
        acc.unknown += 1;
      }

      return acc;
    },
    { active: 0, disconnected: 0, neverConnected: 0, unknown: 0 }
  );

  const topVulnerabilities = [...rankingVulnerabilities]
    .sort((a, b) => {
      const severityA = severityOrder[a.severity ?? ""] ?? 99;
      const severityB = severityOrder[b.severity ?? ""] ?? 99;

      if (severityA !== severityB) {
        return severityA - severityB;
      }

      return (b.score ?? 0) - (a.score ?? 0);
    })
    .slice(0, 5);

  const relevantAgentIds = Array.from(
    new Set([
      ...topAssetGroups.map((group) => group.wazuhAgentId),
      ...topVulnerabilities.map((vulnerability) => vulnerability.wazuhAgentId),
    ])
  );

  const [relevantAgents, relevantAssets] = await Promise.all([
    prisma.siemAgentSnapshot.findMany({
      where: { tenantId, wazuhAgentId: { in: relevantAgentIds } },
      select: { wazuhAgentId: true, name: true, ip: true },
    }),

    prisma.customerAsset.findMany({
      where: { tenantId, wazuhAgentId: { in: relevantAgentIds } },
      select: { wazuhAgentId: true, name: true },
    }),
  ]);

  const agentsById = new Map(
    relevantAgents.map((agent) => [agent.wazuhAgentId, agent])
  );

  const assetsByAgentId = new Map(
    relevantAssets
      .filter((asset) => asset.wazuhAgentId)
      .map((asset) => [asset.wazuhAgentId as string, asset])
  );

  const topAssets = topAssetGroups.map((group) => {
    const agent = agentsById.get(group.wazuhAgentId);
    const asset = assetsByAgentId.get(group.wazuhAgentId);

    return {
      wazuhAgentId: group.wazuhAgentId,
      name: asset?.name ?? agent?.name ?? "Ativo não vinculado",
      ip: agent?.ip ?? null,
      openCount: group._count._all,
    };
  });

  const enrichedTopVulnerabilities = topVulnerabilities.map((vulnerability) => {
    const agent = agentsById.get(vulnerability.wazuhAgentId);
    const asset = assetsByAgentId.get(vulnerability.wazuhAgentId);

    return {
      id: vulnerability.id,
      cve: vulnerability.cve,
      title: vulnerability.title,
      severity: vulnerability.severity,
      score: vulnerability.score,
      assetName: asset?.name ?? agent?.name ?? "Ativo não vinculado",
    };
  });

  const open = openCount;
  const resolved = resolvedCount;

  return {
    hasTenant: true,
    tenantName: tenant?.name ?? null,
    hasVulnerabilityData: open + resolved > 0,
    riskLevel: computeRiskLevel({
      open,
      critical: severityCounts.critical,
      high: severityCounts.high,
    }),
    recommendations: computeRecommendations({
      open,
      critical: severityCounts.critical,
      high: severityCounts.high,
    }),
    siem: {
      status: wazuhIntegration?.status ?? null,
      lastSyncedAt: formatNullableDate(
        lastWazuhSync?.finishedAt ?? lastWazuhSync?.startedAt ?? null
      ),
    },
    agents: {
      total: agents.length,
      ...agentStatusCounts,
    },
    assets: {
      total: assetsTotal,
      active: assetsActive,
    },
    vulnerabilities: {
      open,
      resolved,
      ...severityCounts,
      topAssets,
      topVulnerabilities: enrichedTopVulnerabilities,
    },
  };
}

export async function getTenantExecutiveReport(): Promise<ExecutiveReportData> {
  const tenantId = await getCurrentTenantId();

  if (!tenantId) {
    return emptyExecutiveReport();
  }

  return getExecutiveReportForTenant(tenantId);
}
