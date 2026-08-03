import { auth } from "@/../auth";
import { prisma } from "@/lib/prisma";
import {
  EMPTY_VULNERABILITY_PAGINATION,
  buildVulnerabilityFilterWhere,
  formatNullableDate,
  paginateVulnerabilities,
  type VulnerabilityFilters,
  type VulnerabilityPageParams,
} from "./vulnerability-pagination";

export type { VulnerabilityFilters, VulnerabilityPageParams };

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
      id: true,
      email: true,
      tenantId: true,
      role: true,
    },
  });

  return user?.tenantId ?? null;
}

export async function getTenantVulnerabilitiesOverview(
  params: VulnerabilityPageParams = {}
) {
  const { page, ...filters } = params;

  const tenantId = await getCurrentTenantId();

  if (!tenantId) {
    return {
      hasTenant: false,
      filters,
      summary: {
        open: 0,
        resolved: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      assets: [],
      vulnerabilities: [],
      pagination: EMPTY_VULNERABILITY_PAGINATION,
    };
  }

  const filteredWhere = buildVulnerabilityFilterWhere({
    tenantId,
    filters,
  });

  const [
    [
      openCount,
      resolvedCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      agents,
      assets,
    ],
    paginated,
  ] = await Promise.all([
    Promise.all([
      prisma.siemVulnerabilitySnapshot.count({
        where: {
          tenantId,
          status: "OPEN",
        },
      }),

      prisma.siemVulnerabilitySnapshot.count({
        where: {
          tenantId,
          status: "RESOLVED",
        },
      }),

      prisma.siemVulnerabilitySnapshot.count({
        where: {
          tenantId,
          status: "OPEN",
          severity: "CRITICAL",
        },
      }),

      prisma.siemVulnerabilitySnapshot.count({
        where: {
          tenantId,
          status: "OPEN",
          severity: "HIGH",
        },
      }),

      prisma.siemVulnerabilitySnapshot.count({
        where: {
          tenantId,
          status: "OPEN",
          severity: "MEDIUM",
        },
      }),

      prisma.siemVulnerabilitySnapshot.count({
        where: {
          tenantId,
          status: "OPEN",
          severity: "LOW",
        },
      }),

      prisma.siemAgentSnapshot.findMany({
        where: {
          tenantId,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          wazuhAgentId: true,
          name: true,
          ip: true,
          operatingSystem: true,
        },
      }),

      prisma.customerAsset.findMany({
        where: {
          tenantId,
          wazuhAgentId: {
            not: null,
          },
        },
        select: {
          name: true,
          wazuhAgentId: true,
        },
      }),
    ]),

    paginateVulnerabilities({
      filteredWhere,
      page,
    }),
  ]);

  const agentsById = new Map(
    agents.map((agent) => [agent.wazuhAgentId, agent])
  );

  const assetsByAgentId = new Map(
    assets
      .filter((asset) => asset.wazuhAgentId)
      .map((asset) => [asset.wazuhAgentId as string, asset])
  );

  const assetOptions = agents.map((agent) => {
    const asset = assetsByAgentId.get(agent.wazuhAgentId);

    return {
      wazuhAgentId: agent.wazuhAgentId,
      name: asset?.name ?? agent.name,
      ip: agent.ip,
    };
  });

  const enrichedVulnerabilities = paginated.items.map((vulnerability) => {
    const agent = agentsById.get(vulnerability.wazuhAgentId);
    const asset = assetsByAgentId.get(vulnerability.wazuhAgentId);

    return {
      id: vulnerability.id,
      wazuhAgentId: vulnerability.wazuhAgentId,
      cve: vulnerability.cve,
      title: vulnerability.title,
      severity: vulnerability.severity,
      score: vulnerability.score,
      packageName: vulnerability.packageName,
      packageVersion: vulnerability.packageVersion,
      fixedVersion: vulnerability.fixedVersion,
      condition: vulnerability.condition,
      externalReference: vulnerability.externalReference,
      status: vulnerability.status,
      detectedAt: formatNullableDate(vulnerability.detectedAt),
      publishedAt: formatNullableDate(vulnerability.publishedAt),
      lastSeenAt: formatNullableDate(vulnerability.lastSeenAt),
      assetName: asset?.name ?? agent?.name ?? "Ativo não vinculado",
      assetIp: agent?.ip ?? null,
      operatingSystem: agent?.operatingSystem ?? null,
    };
  });

  return {
    hasTenant: true,
    filters,
    summary: {
      open: openCount,
      resolved: resolvedCount,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
    },
    assets: assetOptions,
    vulnerabilities: enrichedVulnerabilities,
    pagination: paginated.meta,
  };
}
