import { Prisma } from "@/generated/prisma/client";
import type {
  ExecutiveReportData,
  ExecutiveRiskLevel,
} from "@/lib/queries/executive-report";

export const EXECUTIVE_REPORT_SNAPSHOT_SCHEMA_VERSION = 1;

export type ExecutiveReportSnapshot = {
  schemaVersion: typeof EXECUTIVE_REPORT_SNAPSHOT_SCHEMA_VERSION;
  generatedAt: string;
  sourceLastSyncedAt: string | null;
  report: ExecutiveReportData;
};

export function buildExecutiveReportSnapshot(
  report: ExecutiveReportData,
  generatedAt: Date
): ExecutiveReportSnapshot {
  return {
    schemaVersion: EXECUTIVE_REPORT_SNAPSHOT_SCHEMA_VERSION,
    generatedAt: generatedAt.toISOString(),
    sourceLastSyncedAt: report.siem.lastSyncedAt,
    report,
  };
}

export function toReportRunJson(
  snapshot: ExecutiveReportSnapshot
): Prisma.InputJsonValue {
  return {
    schemaVersion: snapshot.schemaVersion,
    generatedAt: snapshot.generatedAt,
    sourceLastSyncedAt: snapshot.sourceLastSyncedAt,
    report: {
      hasTenant: snapshot.report.hasTenant,
      tenantName: snapshot.report.tenantName,
      hasVulnerabilityData: snapshot.report.hasVulnerabilityData,
      riskLevel: snapshot.report.riskLevel,
      recommendations: [...snapshot.report.recommendations],
      siem: {
        status: snapshot.report.siem.status,
        lastSyncedAt: snapshot.report.siem.lastSyncedAt,
      },
      agents: {
        total: snapshot.report.agents.total,
        active: snapshot.report.agents.active,
        disconnected: snapshot.report.agents.disconnected,
        neverConnected: snapshot.report.agents.neverConnected,
        unknown: snapshot.report.agents.unknown,
      },
      assets: {
        total: snapshot.report.assets.total,
        active: snapshot.report.assets.active,
      },
      vulnerabilities: {
        open: snapshot.report.vulnerabilities.open,
        resolved: snapshot.report.vulnerabilities.resolved,
        critical: snapshot.report.vulnerabilities.critical,
        high: snapshot.report.vulnerabilities.high,
        medium: snapshot.report.vulnerabilities.medium,
        low: snapshot.report.vulnerabilities.low,
        topAssets: snapshot.report.vulnerabilities.topAssets.map((asset) => ({
          wazuhAgentId: asset.wazuhAgentId,
          name: asset.name,
          ip: asset.ip,
          openCount: asset.openCount,
        })),
        topVulnerabilities: snapshot.report.vulnerabilities.topVulnerabilities.map(
          (vulnerability) => ({
            id: vulnerability.id,
            cve: vulnerability.cve,
            title: vulnerability.title,
            severity: vulnerability.severity,
            score: vulnerability.score,
            assetName: vulnerability.assetName,
          })
        ),
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFiniteNumberOrNull(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isValidDateString(value: unknown): value is string {
  return isString(value) && !Number.isNaN(Date.parse(value));
}

function isValidDateStringOrNull(value: unknown): value is string | null {
  return value === null || isValidDateString(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isRiskLevel(value: unknown): value is ExecutiveRiskLevel {
  return (
    value === "CRITICAL" ||
    value === "HIGH" ||
    value === "MEDIUM" ||
    value === "LOW"
  );
}

function parseSiem(
  value: unknown
): ExecutiveReportData["siem"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const { status, lastSyncedAt } = value;

  if (!isStringOrNull(status) || !isStringOrNull(lastSyncedAt)) {
    return null;
  }

  return { status, lastSyncedAt };
}

function parseAgents(
  value: unknown
): ExecutiveReportData["agents"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const { total, active, disconnected, neverConnected, unknown } = value;

  if (
    !isNonNegativeInteger(total) ||
    !isNonNegativeInteger(active) ||
    !isNonNegativeInteger(disconnected) ||
    !isNonNegativeInteger(neverConnected) ||
    !isNonNegativeInteger(unknown)
  ) {
    return null;
  }

  return { total, active, disconnected, neverConnected, unknown };
}

function parseAssets(
  value: unknown
): ExecutiveReportData["assets"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const { total, active } = value;

  if (!isNonNegativeInteger(total) || !isNonNegativeInteger(active)) {
    return null;
  }

  return { total, active };
}

function parseTopAsset(
  value: unknown
): ExecutiveReportData["vulnerabilities"]["topAssets"][number] | null {
  if (!isRecord(value)) {
    return null;
  }

  const { wazuhAgentId, name, ip, openCount } = value;

  if (
    !isString(wazuhAgentId) ||
    !isString(name) ||
    !isStringOrNull(ip) ||
    !isNonNegativeInteger(openCount)
  ) {
    return null;
  }

  return { wazuhAgentId, name, ip, openCount };
}

function parseTopAssets(
  value: unknown
): ExecutiveReportData["vulnerabilities"]["topAssets"] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const topAssets: ExecutiveReportData["vulnerabilities"]["topAssets"] = [];

  for (const item of value) {
    const topAsset = parseTopAsset(item);

    if (!topAsset) {
      return null;
    }

    topAssets.push(topAsset);
  }

  return topAssets;
}

function parseTopVulnerability(
  value: unknown
): ExecutiveReportData["vulnerabilities"]["topVulnerabilities"][number] | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, cve, title, severity, score, assetName } = value;

  if (
    !isString(id) ||
    !isString(cve) ||
    !isStringOrNull(title) ||
    !isStringOrNull(severity) ||
    !isFiniteNumberOrNull(score) ||
    !isString(assetName)
  ) {
    return null;
  }

  return { id, cve, title, severity, score, assetName };
}

function parseTopVulnerabilities(
  value: unknown
): ExecutiveReportData["vulnerabilities"]["topVulnerabilities"] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const topVulnerabilities: ExecutiveReportData["vulnerabilities"]["topVulnerabilities"] =
    [];

  for (const item of value) {
    const topVulnerability = parseTopVulnerability(item);

    if (!topVulnerability) {
      return null;
    }

    topVulnerabilities.push(topVulnerability);
  }

  return topVulnerabilities;
}

function parseVulnerabilities(
  value: unknown
): ExecutiveReportData["vulnerabilities"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const { open, resolved, critical, high, medium, low, topAssets, topVulnerabilities } =
    value;

  if (
    !isNonNegativeInteger(open) ||
    !isNonNegativeInteger(resolved) ||
    !isNonNegativeInteger(critical) ||
    !isNonNegativeInteger(high) ||
    !isNonNegativeInteger(medium) ||
    !isNonNegativeInteger(low)
  ) {
    return null;
  }

  const parsedTopAssets = parseTopAssets(topAssets);

  if (!parsedTopAssets) {
    return null;
  }

  const parsedTopVulnerabilities = parseTopVulnerabilities(topVulnerabilities);

  if (!parsedTopVulnerabilities) {
    return null;
  }

  return {
    open,
    resolved,
    critical,
    high,
    medium,
    low,
    topAssets: parsedTopAssets,
    topVulnerabilities: parsedTopVulnerabilities,
  };
}

function parseExecutiveReportData(value: unknown): ExecutiveReportData | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    hasTenant,
    tenantName,
    hasVulnerabilityData,
    riskLevel,
    recommendations,
    siem,
    agents,
    assets,
    vulnerabilities,
  } = value;

  if (!isBoolean(hasTenant)) {
    return null;
  }

  if (!isStringOrNull(tenantName)) {
    return null;
  }

  if (!isBoolean(hasVulnerabilityData)) {
    return null;
  }

  if (!isRiskLevel(riskLevel)) {
    return null;
  }

  if (!isStringArray(recommendations)) {
    return null;
  }

  const parsedSiem = parseSiem(siem);

  if (!parsedSiem) {
    return null;
  }

  const parsedAgents = parseAgents(agents);

  if (!parsedAgents) {
    return null;
  }

  const parsedAssets = parseAssets(assets);

  if (!parsedAssets) {
    return null;
  }

  const parsedVulnerabilities = parseVulnerabilities(vulnerabilities);

  if (!parsedVulnerabilities) {
    return null;
  }

  return {
    hasTenant,
    tenantName,
    hasVulnerabilityData,
    riskLevel,
    recommendations,
    siem: parsedSiem,
    agents: parsedAgents,
    assets: parsedAssets,
    vulnerabilities: parsedVulnerabilities,
  };
}

export function parseExecutiveReportSnapshot(
  value: Prisma.JsonValue
): ExecutiveReportSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const { schemaVersion, generatedAt, sourceLastSyncedAt, report } = value;

  if (schemaVersion !== EXECUTIVE_REPORT_SNAPSHOT_SCHEMA_VERSION) {
    return null;
  }

  if (!isValidDateString(generatedAt)) {
    return null;
  }

  if (!isValidDateStringOrNull(sourceLastSyncedAt)) {
    return null;
  }

  const parsedReport = parseExecutiveReportData(report);

  if (!parsedReport) {
    return null;
  }

  return {
    schemaVersion: EXECUTIVE_REPORT_SNAPSHOT_SCHEMA_VERSION,
    generatedAt,
    sourceLastSyncedAt,
    report: parsedReport,
  };
}
