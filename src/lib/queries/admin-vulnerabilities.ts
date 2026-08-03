import { prisma } from "@/lib/prisma";
import {
  buildVulnerabilityFilterWhere,
  formatNullableDate,
  paginateVulnerabilities,
  type VulnerabilityFilters,
  type VulnerabilityPageParams,
} from "./vulnerability-pagination";

export type { VulnerabilityFilters as AdminVulnerabilityFilters };
export type { VulnerabilityPageParams as AdminVulnerabilityPageParams };

export async function getAdminTenantVulnerabilitiesOverview({
  tenantSlug,
  filters = {},
}: {
  tenantSlug: string;
  filters?: VulnerabilityPageParams;
}) {
  const { page, ...restFilters } = filters;

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!tenant) {
    return null;
  }

  const filteredWhere = buildVulnerabilityFilterWhere({
    tenantId: tenant.id,
    filters: restFilters,
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
          tenantId: tenant.id,
          status: "OPEN",
        },
      }),

      prisma.siemVulnerabilitySnapshot.count({
        where: {
          tenantId: tenant.id,
          status: "RESOLVED",
        },
      }),

      prisma.siemVulnerabilitySnapshot.count({
        where: {
          tenantId: tenant.id,
          status: "OPEN",
          severity: "CRITICAL",
        },
      }),

      prisma.siemVulnerabilitySnapshot.count({
        where: {
          tenantId: tenant.id,
          status: "OPEN",
          severity: "HIGH",
        },
      }),

      prisma.siemVulnerabilitySnapshot.count({
        where: {
          tenantId: tenant.id,
          status: "OPEN",
          severity: "MEDIUM",
        },
      }),

      prisma.siemVulnerabilitySnapshot.count({
        where: {
          tenantId: tenant.id,
          status: "OPEN",
          severity: "LOW",
        },
      }),

      prisma.siemAgentSnapshot.findMany({
        where: {
          tenantId: tenant.id,
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
          tenantId: tenant.id,
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
    tenant,
    filters: restFilters,
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
