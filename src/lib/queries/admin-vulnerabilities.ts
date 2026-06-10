import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const severityOrder: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
};

export type AdminVulnerabilityFilters = {
  severity?: string;
  status?: string;
  asset?: string;
  q?: string;
};

function formatNullableDate(date: Date | null) {
  if (!date) {
    return null;
  }

  return date.toISOString();
}

function normalizeFilterValue(value?: string) {
  if (!value || value === "ALL") {
    return undefined;
  }

  return value.trim();
}

function buildVulnerabilityWhere({
  tenantId,
  filters,
}: {
  tenantId: string;
  filters: AdminVulnerabilityFilters;
}) {
  const severity = normalizeFilterValue(filters.severity);
  const status = normalizeFilterValue(filters.status) ?? "OPEN";
  const asset = normalizeFilterValue(filters.asset);
  const q = normalizeFilterValue(filters.q);

  const where: Prisma.SiemVulnerabilitySnapshotWhereInput = {
    tenantId,
  };

  if (status) {
    where.status = status;
  }

  if (severity) {
    where.severity = severity;
  }

  if (asset) {
    where.wazuhAgentId = asset;
  }

  if (q) {
    where.OR = [
      {
        cve: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        title: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        packageName: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        packageVersion: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        condition: {
          contains: q,
          mode: "insensitive",
        },
      },
    ];
  }

  return where;
}

export async function getAdminTenantVulnerabilitiesOverview({
  tenantSlug,
  filters = {},
}: {
  tenantSlug: string;
  filters?: AdminVulnerabilityFilters;
}) {
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

  const filteredWhere = buildVulnerabilityWhere({
    tenantId: tenant.id,
    filters,
  });

  const [
    openCount,
    resolvedCount,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    vulnerabilities,
    agents,
    assets,
  ] = await Promise.all([
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

    prisma.siemVulnerabilitySnapshot.findMany({
      where: filteredWhere,
      orderBy: [
        {
          score: "desc",
        },
        {
          lastSeenAt: "desc",
        },
        {
          cve: "asc",
        },
      ],
      take: 500,
      select: {
        id: true,
        wazuhAgentId: true,
        cve: true,
        title: true,
        severity: true,
        score: true,
        packageName: true,
        packageVersion: true,
        fixedVersion: true,
        condition: true,
        externalReference: true,
        status: true,
        detectedAt: true,
        publishedAt: true,
        lastSeenAt: true,
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

  const enrichedVulnerabilities = vulnerabilities
    .map((vulnerability) => {
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
    })
    .sort((a, b) => {
      const severityA = severityOrder[a.severity ?? ""] ?? 99;
      const severityB = severityOrder[b.severity ?? ""] ?? 99;

      if (severityA !== severityB) {
        return severityA - severityB;
      }

      return (b.score ?? 0) - (a.score ?? 0);
    });

  return {
    tenant,
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
  };
}
