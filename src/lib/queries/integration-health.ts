import { prisma } from "@/lib/prisma";
import {
  IntegrationStatus,
  IntegrationSyncKind,
  IntegrationType,
} from "@/generated/prisma/client";
import { requirePartsecAdmin } from "@/lib/authz/server-authorization";
import {
  computeSiemHealth,
  computeZabbixHealth,
  computeZammadHealth,
  type IntegrationHealth,
  type SyncLogSnapshot,
} from "@/lib/integration-health/policy";
import { integrationHealthThresholds } from "@/lib/integration-health/thresholds";

type ComponentLogs = {
  latestAttempt: SyncLogSnapshot | null;
  latestSuccess: SyncLogSnapshot | null;
  latestError: SyncLogSnapshot | null;
};

type RawSyncLog = {
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
  message: string | null;
};

function toSnapshot(log: RawSyncLog | null): SyncLogSnapshot | null {
  if (!log) {
    return null;
  }

  return {
    status: log.status,
    startedAt: log.startedAt,
    finishedAt: log.finishedAt,
    durationMs: log.durationMs,
    message: log.message,
  };
}

/**
 * Fetches only the three signals a pipeline needs (latest attempt, latest
 * success, latest error) via bounded `findFirst` lookups — never an
 * unbounded history scan.
 */
async function fetchComponentLogs(
  tenantId: string,
  integrationType: IntegrationType,
  syncKind: IntegrationSyncKind,
  includeHistoricalUnambiguousNulls: boolean
): Promise<ComponentLogs> {
  const baseWhere = includeHistoricalUnambiguousNulls
    ? {
        tenantId,
        integrationType,
        OR: [{ syncKind }, { syncKind: null }],
      }
    : {
        tenantId,
        integrationType,
        syncKind,
      };

  // latestSuccess/latestError must represent the most recently *completed*
  // event, not the most recently started one — order by finishedAt (nulls
  // last, though a SUCCESS/ERROR row should always have it set), falling
  // back to startedAt only as a tiebreaker.
  const completedOrderBy = [
    { finishedAt: { sort: "desc" as const, nulls: "last" as const } },
    { startedAt: "desc" as const },
  ];

  const [latestAttempt, latestSuccess, latestError] = await Promise.all([
    prisma.integrationSyncLog.findFirst({
      where: baseWhere,
      orderBy: { startedAt: "desc" },
    }),
    prisma.integrationSyncLog.findFirst({
      where: { ...baseWhere, status: "SUCCESS" },
      orderBy: completedOrderBy,
    }),
    prisma.integrationSyncLog.findFirst({
      where: { ...baseWhere, status: "ERROR" },
      orderBy: completedOrderBy,
    }),
  ]);

  return {
    latestAttempt: toSnapshot(latestAttempt),
    latestSuccess: toSnapshot(latestSuccess),
    latestError: toSnapshot(latestError),
  };
}

/**
 * Shared internal layer: given a tenantId already proven to belong to the
 * caller (never taken from the caller as-is), computes health for all three
 * integrations. Both the admin query below and a future customer-facing
 * query are expected to resolve their own tenantId and call this same
 * function, so the policy/query logic is never duplicated.
 */
async function getTenantIntegrationHealthById(tenantId: string): Promise<IntegrationHealth[]> {
  const now = new Date();

  const [configs, zabbixLogs, siemAgentsLogs, siemVulnerabilitiesLogs] = await Promise.all([
    prisma.integrationConfig.findMany({
      where: { tenantId },
      select: { type: true, status: true },
    }),
    // Historical Zabbix logs predate syncKind and are unambiguous — only one
    // pipeline has ever written ZABBIX logs — so null is included here.
    fetchComponentLogs(tenantId, IntegrationType.ZABBIX, IntegrationSyncKind.ZABBIX_SNAPSHOT, true),
    // Historical WAZUH logs with syncKind = null are ambiguous between
    // agents and vulnerabilities and are deliberately excluded here.
    fetchComponentLogs(tenantId, IntegrationType.WAZUH, IntegrationSyncKind.SIEM_AGENTS, false),
    fetchComponentLogs(
      tenantId,
      IntegrationType.WAZUH,
      IntegrationSyncKind.SIEM_VULNERABILITIES,
      false
    ),
  ]);

  const configStatusByType = new Map(configs.map((config) => [config.type, config.status]));

  const zabbixConfigStatus =
    configStatusByType.get(IntegrationType.ZABBIX) ?? IntegrationStatus.INACTIVE;
  const wazuhConfigStatus =
    configStatusByType.get(IntegrationType.WAZUH) ?? IntegrationStatus.INACTIVE;
  const zammadConfigStatus =
    configStatusByType.get(IntegrationType.ZAMMAD) ?? IntegrationStatus.INACTIVE;

  const zabbixHealth = computeZabbixHealth({
    configurationStatus: zabbixConfigStatus,
    now,
    thresholds: integrationHealthThresholds.zabbix,
    ...zabbixLogs,
  });

  const siemHealth = computeSiemHealth({
    configurationStatus: wazuhConfigStatus,
    now,
    agents: siemAgentsLogs,
    vulnerabilities: siemVulnerabilitiesLogs,
    thresholds: {
      agents: integrationHealthThresholds.siemAgents,
      vulnerabilities: integrationHealthThresholds.siemVulnerabilities,
    },
  });

  // Zammad has no sync pipeline in the MVP — no log query is issued for it.
  const zammadHealth = computeZammadHealth({ configurationStatus: zammadConfigStatus });

  return [zabbixHealth, siemHealth, zammadHealth];
}

export async function getAdminTenantIntegrationHealth(
  tenantSlug: string
): Promise<IntegrationHealth[] | null> {
  await requirePartsecAdmin();

  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
    select: {
      id: true,
    },
  });

  if (!tenant) {
    return null;
  }

  return getTenantIntegrationHealthById(tenant.id);
}
