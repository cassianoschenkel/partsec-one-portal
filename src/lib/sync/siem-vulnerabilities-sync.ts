import { prisma } from "@/lib/prisma";
import { IntegrationSyncKind, IntegrationType } from "@/generated/prisma/client";
import { getSiemIndexerClientForTenant } from "@/lib/integrations/siem-indexer-client";
import { getTenantsWithActiveSiemIntegration } from "@/lib/queries/siem-sync";

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function normalizeSeverity(value?: string | null) {
  if (!value) {
    return null;
  }

  return value.toUpperCase();
}

export async function syncTenantSiemVulnerabilitiesBySlug(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
  });

  if (!tenant) {
    throw new Error(`Tenant não encontrado: ${tenantSlug}`);
  }

  return syncTenantSiemVulnerabilities({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  });
}

export async function syncTenantSiemVulnerabilities({
  tenantId,
  tenantSlug,
}: {
  tenantId: string;
  tenantSlug: string;
}) {
  const startedAt = new Date();
  const startTime = Date.now();

  const syncLog = await prisma.integrationSyncLog.create({
    data: {
      tenantId,
      integrationType: IntegrationType.WAZUH,
      syncKind: IntegrationSyncKind.SIEM_VULNERABILITIES,
      status: "RUNNING",
      startedAt,
      message: "Sincronização de vulnerabilidades SIEM iniciada.",
    },
  });

  try {
    const { client, integration, vulnerabilitiesIndex, vulnerabilitiesIndexSource } =
      await getSiemIndexerClientForTenant(tenantSlug);

    const agents = await prisma.siemAgentSnapshot.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        name: "asc",
      },
    });

    const agentIds = agents.map((agent) => agent.wazuhAgentId);

    const hits = await client.getVulnerabilitiesByAgentIds(agentIds);

    const syncedAt = new Date();

    for (const hit of hits) {
      const source = hit._source;
      const vulnerability = source.vulnerability;
      const agent = source.agent;
      const packageData = source.package;

      const wazuhAgentId = agent?.id;
      const cve = vulnerability?.id?.trim();

      if (!wazuhAgentId || !cve) {
        continue;
      }

      const packageName = packageData?.name ?? "";
      const packageVersion = packageData?.version ?? "";

      await prisma.siemVulnerabilitySnapshot.upsert({
        where: {
          tenantId_wazuhAgentId_cve_packageName_packageVersion: {
            tenantId,
            wazuhAgentId,
            cve,
            packageName,
            packageVersion,
          },
        },
        update: {
          title: vulnerability?.description ?? null,
          severity: normalizeSeverity(vulnerability?.severity),
          score:
            typeof vulnerability?.score?.base === "number"
              ? vulnerability.score.base
              : null,
          packageName,
          packageVersion,
          fixedVersion: null,
          architecture: packageData?.architecture ?? null,
          condition: vulnerability?.scanner?.condition ?? null,
          externalReference:
            vulnerability?.scanner?.reference ??
            vulnerability?.reference ??
            null,
          publishedAt: parseDate(vulnerability?.published_at),
          vulnerabilityUpdatedAt: null,
          detectedAt: parseDate(vulnerability?.detected_at),
          status: "OPEN",
          lastSeenAt: syncedAt,
          resolvedAt: null,
          rawData: source,
          syncedAt,
        },
        create: {
          tenantId,
          wazuhAgentId,
          cve,
          title: vulnerability?.description ?? null,
          severity: normalizeSeverity(vulnerability?.severity),
          score:
            typeof vulnerability?.score?.base === "number"
              ? vulnerability.score.base
              : null,
          packageName,
          packageVersion,
          fixedVersion: null,
          architecture: packageData?.architecture ?? null,
          condition: vulnerability?.scanner?.condition ?? null,
          externalReference:
            vulnerability?.scanner?.reference ??
            vulnerability?.reference ??
            null,
          publishedAt: parseDate(vulnerability?.published_at),
          detectedAt: parseDate(vulnerability?.detected_at),
          status: "OPEN",
          lastSeenAt: syncedAt,
          rawData: source,
          syncedAt,
        },
      });
    }

    let resolvedCount = 0;

    if (agentIds.length > 0) {
      const reconciliation = await prisma.siemVulnerabilitySnapshot.updateMany({
        where: {
          tenantId,
          status: "OPEN",
          lastSeenAt: {
            lt: syncedAt,
          },
        },
        data: {
          status: "RESOLVED",
          resolvedAt: syncedAt,
          syncedAt,
        },
      });

      resolvedCount = reconciliation.count;
    }

    const durationMs = Date.now() - startTime;

    await prisma.integrationSyncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        status: "SUCCESS",
        message: `Sincronização de vulnerabilidades SIEM concluída. Indexer: ${
          integration.externalOrgId ?? "não configurado"
        }. Índice de vulnerabilidades: ${vulnerabilitiesIndex} (${
          vulnerabilitiesIndexSource === "tenant" ? "configuração do tenant" : "fallback"
        }). Agentes: ${agents.length}. Vulnerabilidades: ${hits.length}. Resolvidas nesta sincronização: ${resolvedCount}.`,
        finishedAt: new Date(),
        durationMs,
      },
    });

    return {
      status: "SUCCESS",
      tenantSlug,
      agents: agents.length,
      vulnerabilities: hits.length,
      resolvedCount,
      durationMs,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido.";

    const durationMs = Date.now() - startTime;

    await prisma.integrationSyncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        status: "ERROR",
        message,
        finishedAt: new Date(),
        durationMs,
      },
    });

    throw new Error(`[${tenantSlug}] ${message}`);
  }
}

export async function syncAllActiveSiemVulnerabilityTenants() {
  const tenants = await getTenantsWithActiveSiemIntegration();

  const results = [];

  for (const tenant of tenants) {
    try {
      const result = await syncTenantSiemVulnerabilities({
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      });

      results.push(result);
    } catch (error) {
      results.push({
        status: "ERROR",
        tenantSlug: tenant.slug,
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      });
    }
  }

  return {
    totalTenants: tenants.length,
    results,
  };
}
