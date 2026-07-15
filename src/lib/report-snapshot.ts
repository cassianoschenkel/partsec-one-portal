import { Prisma } from "@/generated/prisma/client";
import type { ExecutiveReportData } from "@/lib/queries/executive-report";

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
