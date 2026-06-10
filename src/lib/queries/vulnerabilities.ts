import { auth } from "@/../auth";
import { prisma } from "@/lib/prisma";

const severityOrder: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
};

function formatNullableDate(date: Date | null) {
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
      id: true,
      email: true,
      tenantId: true,
      role: true,
    },
  });

  return user?.tenantId ?? null;
}

export async function getTenantVulnerabilitiesOverview() {
  const tenantId = await getCurrentTenantId();
  
  if (!tenantId) {
  return {
    hasTenant: false,
    summary: {
      open: 0,
      resolved: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    },
    vulnerabilities: [],
  };
}

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

    prisma.siemVulnerabilitySnapshot.findMany({
      where: {
        tenantId,
        status: "OPEN",
      },
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
      take: 200,
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
        tenantId,
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
  ]);

  const agentsById = new Map(
    agents.map((agent) => [agent.wazuhAgentId, agent])
  );

  const assetsByAgentId = new Map(
    assets
      .filter((asset) => asset.wazuhAgentId)
      .map((asset) => [asset.wazuhAgentId as string, asset])
  );

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
	  hasTenant: true,
	  summary: {
      open: openCount,
      resolved: resolvedCount,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
    },
    vulnerabilities: enrichedVulnerabilities,
  };
}
