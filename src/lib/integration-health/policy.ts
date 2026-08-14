import type { IntegrationStatus, IntegrationType } from "@/generated/prisma/enums";
import type { PipelineThresholds } from "./thresholds";

export type IntegrationHealthStatus =
  | "INACTIVE"
  | "UNKNOWN"
  | "HEALTHY"
  | "STALE"
  | "DEGRADED"
  | "ERROR"
  | "UNMONITORED";

export type IntegrationActivityStatus = "IDLE" | "RUNNING" | "STUCK";

export type SyncLogSnapshot = {
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
  message: string | null;
};

export type IntegrationHealthComponent = {
  key: "agents" | "vulnerabilities";
  status: IntegrationHealthStatus;
  activity: IntegrationActivityStatus;
  lastAttemptAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  durationMs: number | null;
  message: string | null;
};

export type IntegrationHealth = {
  integrationType: IntegrationType;
  configurationStatus: IntegrationStatus;
  status: IntegrationHealthStatus;
  activity: IntegrationActivityStatus;
  lastAttemptAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  durationMs: number | null;
  message: string | null;
  components?: IntegrationHealthComponent[];
};

type ComponentLogs = {
  latestAttempt: SyncLogSnapshot | null;
  latestSuccess: SyncLogSnapshot | null;
  latestError: SyncLogSnapshot | null;
};

type ComponentHealthInput = ComponentLogs & {
  configurationStatus: IntegrationStatus;
  hasPipeline: boolean;
  now: Date;
  thresholds: PipelineThresholds;
};

type ComponentHealthResult = {
  status: IntegrationHealthStatus;
  activity: IntegrationActivityStatus;
  lastAttemptAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  durationMs: number | null;
  message: string | null;
};

function getCompletionDate(log: SyncLogSnapshot): Date {
  return log.finishedAt ?? log.startedAt;
}

function pickLatestCompleted(
  success: SyncLogSnapshot | null,
  error: SyncLogSnapshot | null
): { kind: "SUCCESS" | "ERROR"; log: SyncLogSnapshot } | null {
  if (!success && !error) {
    return null;
  }

  if (success && !error) {
    return { kind: "SUCCESS", log: success };
  }

  if (error && !success) {
    return { kind: "ERROR", log: error };
  }

  // Both exist: pick the one that completed most recently. On an exact tie,
  // prefer ERROR so a real failure is never masked by a same-instant success.
  const errorTime = getCompletionDate(error!).getTime();
  const successTime = getCompletionDate(success!).getTime();

  return errorTime >= successTime
    ? { kind: "ERROR", log: error! }
    : { kind: "SUCCESS", log: success! };
}

function pickMostRecent(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

export function computeActivity(
  latestAttempt: SyncLogSnapshot | null,
  now: Date,
  thresholds: PipelineThresholds
): IntegrationActivityStatus {
  if (!latestAttempt) {
    return "IDLE";
  }

  if (latestAttempt.status !== "RUNNING" || latestAttempt.finishedAt !== null) {
    return "IDLE";
  }

  const age = now.getTime() - latestAttempt.startedAt.getTime();

  // age === stuckAfterMs stays RUNNING; only age > stuckAfterMs is STUCK.
  return age > thresholds.stuckAfterMs ? "STUCK" : "RUNNING";
}

function computeComponentHealth(input: ComponentHealthInput): ComponentHealthResult {
  const {
    configurationStatus,
    hasPipeline,
    latestAttempt,
    latestSuccess,
    latestError,
    now,
    thresholds,
  } = input;

  const activity = computeActivity(latestAttempt, now, thresholds);
  const completed = pickLatestCompleted(latestSuccess, latestError);

  const lastAttemptAt = latestAttempt?.startedAt ?? null;
  const lastSuccessAt = latestSuccess ? getCompletionDate(latestSuccess) : null;
  const lastErrorAt = latestError ? getCompletionDate(latestError) : null;
  const durationMs = latestAttempt?.durationMs ?? null;

  // Outside STUCK, prefer latestAttempt's own message so message/durationMs/
  // lastAttemptAt describe the same attempt whenever possible, falling back
  // to the latest completed event's message only if the attempt has none.
  const message =
    activity === "STUCK"
      ? `Execução iniciada em ${latestAttempt!.startedAt.toISOString()} ainda não finalizou e excede o limite de ${Math.round(
          thresholds.stuckAfterMs / 60000
        )} min configurado para este pipeline.`
      : latestAttempt?.message ?? completed?.log.message ?? null;

  const diagnostics = {
    activity,
    lastAttemptAt,
    lastSuccessAt,
    lastErrorAt,
    durationMs,
    message,
  };

  if (configurationStatus === "INACTIVE") {
    return { status: "INACTIVE", ...diagnostics };
  }

  if (configurationStatus === "ERROR") {
    return { status: "ERROR", ...diagnostics };
  }

  // configurationStatus === "ACTIVE"
  if (!hasPipeline) {
    return { status: "UNMONITORED", ...diagnostics };
  }

  if (activity === "STUCK") {
    return { status: "ERROR", ...diagnostics };
  }

  if (!completed) {
    return { status: "UNKNOWN", ...diagnostics };
  }

  if (completed.kind === "ERROR") {
    return { status: "ERROR", ...diagnostics };
  }

  const age = now.getTime() - getCompletionDate(completed.log).getTime();

  // age === staleAfterMs stays HEALTHY; only age > staleAfterMs is STALE.
  const status: IntegrationHealthStatus = age > thresholds.staleAfterMs ? "STALE" : "HEALTHY";

  return { status, ...diagnostics };
}

export function computeZabbixHealth(input: {
  configurationStatus: IntegrationStatus;
  now: Date;
  thresholds: PipelineThresholds;
} & ComponentLogs): IntegrationHealth {
  const result = computeComponentHealth({ ...input, hasPipeline: true });

  return {
    integrationType: "ZABBIX",
    configurationStatus: input.configurationStatus,
    status: result.status,
    activity: result.activity,
    lastAttemptAt: result.lastAttemptAt,
    lastSuccessAt: result.lastSuccessAt,
    lastErrorAt: result.lastErrorAt,
    durationMs: result.durationMs,
    message: result.message,
  };
}

export function combineSiemHealth(
  agents: IntegrationHealthStatus,
  vulnerabilities: IntegrationHealthStatus
): IntegrationHealthStatus {
  if (agents === vulnerabilities && agents === "HEALTHY") return "HEALTHY";
  if (agents === vulnerabilities && agents === "ERROR") return "ERROR";
  if (agents === vulnerabilities && agents === "UNKNOWN") return "UNKNOWN";

  return "DEGRADED";
}

export function combineSiemActivity(
  agents: IntegrationActivityStatus,
  vulnerabilities: IntegrationActivityStatus
): IntegrationActivityStatus {
  if (agents === "STUCK" || vulnerabilities === "STUCK") return "STUCK";
  if (agents === "RUNNING" || vulnerabilities === "RUNNING") return "RUNNING";

  return "IDLE";
}

export function computeSiemHealth(input: {
  configurationStatus: IntegrationStatus;
  now: Date;
  agents: ComponentLogs;
  vulnerabilities: ComponentLogs;
  thresholds: { agents: PipelineThresholds; vulnerabilities: PipelineThresholds };
}): IntegrationHealth {
  const agentsResult = computeComponentHealth({
    ...input.agents,
    configurationStatus: input.configurationStatus,
    hasPipeline: true,
    now: input.now,
    thresholds: input.thresholds.agents,
  });

  const vulnerabilitiesResult = computeComponentHealth({
    ...input.vulnerabilities,
    configurationStatus: input.configurationStatus,
    hasPipeline: true,
    now: input.now,
    thresholds: input.thresholds.vulnerabilities,
  });

  // INACTIVE/ERROR are configurational and apply uniformly to both components
  // (they share a single IntegrationConfig row), so both results already carry
  // the same status in those cases — the explicit matrix only governs ACTIVE.
  const status: IntegrationHealthStatus =
    input.configurationStatus === "ACTIVE"
      ? combineSiemHealth(agentsResult.status, vulnerabilitiesResult.status)
      : agentsResult.status;

  const activity = combineSiemActivity(agentsResult.activity, vulnerabilitiesResult.activity);

  return {
    integrationType: "WAZUH",
    configurationStatus: input.configurationStatus,
    status,
    activity,
    lastAttemptAt: pickMostRecent(agentsResult.lastAttemptAt, vulnerabilitiesResult.lastAttemptAt),
    lastSuccessAt: pickMostRecent(agentsResult.lastSuccessAt, vulnerabilitiesResult.lastSuccessAt),
    lastErrorAt: pickMostRecent(agentsResult.lastErrorAt, vulnerabilitiesResult.lastErrorAt),
    // A composite has no single duration/message that isn't misleading —
    // per-component detail lives in `components[]` instead of guessing which
    // side's number/message "wins" at the top level.
    durationMs: null,
    message: null,
    components: [
      { key: "agents", ...agentsResult },
      { key: "vulnerabilities", ...vulnerabilitiesResult },
    ],
  };
}

export function computeZammadHealth(input: {
  configurationStatus: IntegrationStatus;
}): IntegrationHealth {
  const status: IntegrationHealthStatus =
    input.configurationStatus === "INACTIVE"
      ? "INACTIVE"
      : input.configurationStatus === "ERROR"
        ? "ERROR"
        : "UNMONITORED";

  return {
    integrationType: "ZAMMAD",
    configurationStatus: input.configurationStatus,
    status,
    activity: "IDLE",
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    durationMs: null,
    message: null,
  };
}
