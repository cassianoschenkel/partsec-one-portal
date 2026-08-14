import { test } from "node:test";
import assert from "node:assert/strict";
import { IntegrationStatus } from "@/generated/prisma/enums";
import {
  combineSiemActivity,
  combineSiemHealth,
  computeActivity,
  computeSiemHealth,
  computeZabbixHealth,
  computeZammadHealth,
  type IntegrationHealthStatus,
  type SyncLogSnapshot,
} from "./policy";
import type { PipelineThresholds } from "./thresholds";

const THRESHOLDS: PipelineThresholds = {
  staleAfterMs: 15 * 60 * 1000,
  stuckAfterMs: 10 * 60 * 1000,
};

const VULNERABILITIES_THRESHOLDS: PipelineThresholds = {
  staleAfterMs: 90 * 60 * 1000,
  stuckAfterMs: 60 * 60 * 1000,
};

const NOW = new Date("2026-08-14T12:00:00.000Z");

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60 * 1000);
}

function buildLog(overrides: Partial<SyncLogSnapshot> = {}): SyncLogSnapshot {
  return {
    status: "SUCCESS",
    startedAt: minutesAgo(5),
    finishedAt: minutesAgo(4),
    durationMs: 1200,
    message: "ok",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Component health (exercised through computeZabbixHealth, a thin wrapper
// around the shared component policy with hasPipeline = true).
// ---------------------------------------------------------------------------

test("computeZabbixHealth: configurationStatus INACTIVE yields INACTIVE regardless of logs", () => {
  const result = computeZabbixHealth({
    configurationStatus: IntegrationStatus.INACTIVE,
    now: NOW,
    thresholds: THRESHOLDS,
    latestAttempt: buildLog({ status: "ERROR" }),
    latestSuccess: buildLog(),
    latestError: buildLog({ status: "ERROR" }),
  });

  assert.equal(result.status, "INACTIVE");
});

test("computeZabbixHealth: configurationStatus ERROR yields health ERROR but preserves diagnostics", () => {
  const success = buildLog({ finishedAt: minutesAgo(30) });

  const result = computeZabbixHealth({
    configurationStatus: IntegrationStatus.ERROR,
    now: NOW,
    thresholds: THRESHOLDS,
    latestAttempt: success,
    latestSuccess: success,
    latestError: null,
  });

  assert.equal(result.status, "ERROR");
  assert.deepEqual(result.lastSuccessAt, success.finishedAt);
});

test("computeZabbixHealth: ACTIVE with no logs at all yields UNKNOWN", () => {
  const result = computeZabbixHealth({
    configurationStatus: IntegrationStatus.ACTIVE,
    now: NOW,
    thresholds: THRESHOLDS,
    latestAttempt: null,
    latestSuccess: null,
    latestError: null,
  });

  assert.equal(result.status, "UNKNOWN");
  assert.equal(result.activity, "IDLE");
});

test("computeZabbixHealth: recent SUCCESS yields HEALTHY", () => {
  const success = buildLog({ finishedAt: minutesAgo(5) });

  const result = computeZabbixHealth({
    configurationStatus: IntegrationStatus.ACTIVE,
    now: NOW,
    thresholds: THRESHOLDS,
    latestAttempt: success,
    latestSuccess: success,
    latestError: null,
  });

  assert.equal(result.status, "HEALTHY");
});

test("computeZabbixHealth: SUCCESS older than staleAfterMs yields STALE", () => {
  const success = buildLog({ finishedAt: minutesAgo(16) });

  const result = computeZabbixHealth({
    configurationStatus: IntegrationStatus.ACTIVE,
    now: NOW,
    thresholds: THRESHOLDS,
    latestAttempt: success,
    latestSuccess: success,
    latestError: null,
  });

  assert.equal(result.status, "STALE");
});

test("computeZabbixHealth: latest ERROR after an earlier SUCCESS yields ERROR, keeping lastSuccessAt", () => {
  const success = buildLog({ status: "SUCCESS", finishedAt: minutesAgo(20) });
  const error = buildLog({
    status: "ERROR",
    finishedAt: minutesAgo(5),
    message: "falha upstream",
  });

  const result = computeZabbixHealth({
    configurationStatus: IntegrationStatus.ACTIVE,
    now: NOW,
    thresholds: THRESHOLDS,
    latestAttempt: error,
    latestSuccess: success,
    latestError: error,
  });

  assert.equal(result.status, "ERROR");
  assert.deepEqual(result.lastSuccessAt, success.finishedAt);
  assert.deepEqual(result.lastErrorAt, error.finishedAt);
});

test("computeZabbixHealth: health can be HEALTHY while a new attempt is RUNNING at the same time", () => {
  const success = buildLog({ status: "SUCCESS", finishedAt: minutesAgo(5) });
  const running = buildLog({
    status: "RUNNING",
    startedAt: minutesAgo(1),
    finishedAt: null,
    durationMs: null,
  });

  const result = computeZabbixHealth({
    configurationStatus: IntegrationStatus.ACTIVE,
    now: NOW,
    thresholds: THRESHOLDS,
    latestAttempt: running,
    latestSuccess: success,
    latestError: null,
  });

  assert.equal(result.status, "HEALTHY");
  assert.equal(result.activity, "RUNNING");
});

test("computeZabbixHealth: RUNNING attempt past stuckAfterMs forces activity STUCK and health ERROR", () => {
  const success = buildLog({ status: "SUCCESS", finishedAt: minutesAgo(5) });
  const stuckRunning = buildLog({
    status: "RUNNING",
    startedAt: minutesAgo(11),
    finishedAt: null,
    durationMs: null,
  });

  const result = computeZabbixHealth({
    configurationStatus: IntegrationStatus.ACTIVE,
    now: NOW,
    thresholds: THRESHOLDS,
    latestAttempt: stuckRunning,
    latestSuccess: success,
    latestError: null,
  });

  assert.equal(result.activity, "STUCK");
  assert.equal(result.status, "ERROR");
});

test("computeActivity: age exactly stuckAfterMs stays RUNNING (strict > only)", () => {
  const running = buildLog({
    status: "RUNNING",
    startedAt: new Date(NOW.getTime() - THRESHOLDS.stuckAfterMs),
    finishedAt: null,
    durationMs: null,
  });

  assert.equal(computeActivity(running, NOW, THRESHOLDS), "RUNNING");
});

test("computeActivity: age one ms past stuckAfterMs becomes STUCK", () => {
  const running = buildLog({
    status: "RUNNING",
    startedAt: new Date(NOW.getTime() - THRESHOLDS.stuckAfterMs - 1),
    finishedAt: null,
    durationMs: null,
  });

  assert.equal(computeActivity(running, NOW, THRESHOLDS), "STUCK");
});

test("computeZabbixHealth: age exactly staleAfterMs stays HEALTHY (strict > only)", () => {
  const success = buildLog({
    status: "SUCCESS",
    finishedAt: new Date(NOW.getTime() - THRESHOLDS.staleAfterMs),
  });

  const result = computeZabbixHealth({
    configurationStatus: IntegrationStatus.ACTIVE,
    now: NOW,
    thresholds: THRESHOLDS,
    latestAttempt: success,
    latestSuccess: success,
    latestError: null,
  });

  assert.equal(result.status, "HEALTHY");
});

test("computeZabbixHealth: age one ms past staleAfterMs becomes STALE", () => {
  const success = buildLog({
    status: "SUCCESS",
    finishedAt: new Date(NOW.getTime() - THRESHOLDS.staleAfterMs - 1),
  });

  const result = computeZabbixHealth({
    configurationStatus: IntegrationStatus.ACTIVE,
    now: NOW,
    thresholds: THRESHOLDS,
    latestAttempt: success,
    latestSuccess: success,
    latestError: null,
  });

  assert.equal(result.status, "STALE");
});

test("computeZabbixHealth: unrecognized log status fails closed instead of being read as RUNNING", () => {
  const weird = buildLog({ status: "PAUSED", finishedAt: null });

  const result = computeZabbixHealth({
    configurationStatus: IntegrationStatus.ACTIVE,
    now: NOW,
    thresholds: THRESHOLDS,
    latestAttempt: weird,
    latestSuccess: null,
    latestError: null,
  });

  assert.equal(result.activity, "IDLE");
  assert.equal(result.status, "UNKNOWN");
});

// ---------------------------------------------------------------------------
// Zammad / Central de Suporte — no pipeline in the MVP.
// ---------------------------------------------------------------------------

test("computeZammadHealth: INACTIVE configuration yields INACTIVE", () => {
  assert.equal(
    computeZammadHealth({ configurationStatus: IntegrationStatus.INACTIVE }).status,
    "INACTIVE"
  );
});

test("computeZammadHealth: ACTIVE configuration yields UNMONITORED (no pipeline exists)", () => {
  const result = computeZammadHealth({ configurationStatus: IntegrationStatus.ACTIVE });

  assert.equal(result.status, "UNMONITORED");
  assert.equal(result.activity, "IDLE");
});

test("computeZammadHealth: ERROR configuration yields ERROR", () => {
  assert.equal(
    computeZammadHealth({ configurationStatus: IntegrationStatus.ERROR }).status,
    "ERROR"
  );
});

// ---------------------------------------------------------------------------
// SIEM composite health — all 16 pairs of the approved 4x4 matrix.
// ---------------------------------------------------------------------------

const HEALTH_STATES: IntegrationHealthStatus[] = ["HEALTHY", "STALE", "ERROR", "UNKNOWN"];

const EXPECTED_SIEM_MATRIX: Record<string, IntegrationHealthStatus> = {
  "HEALTHY,HEALTHY": "HEALTHY",
  "HEALTHY,STALE": "DEGRADED",
  "HEALTHY,ERROR": "DEGRADED",
  "HEALTHY,UNKNOWN": "DEGRADED",
  "STALE,HEALTHY": "DEGRADED",
  "STALE,STALE": "DEGRADED",
  "STALE,ERROR": "DEGRADED",
  "STALE,UNKNOWN": "DEGRADED",
  "ERROR,HEALTHY": "DEGRADED",
  "ERROR,STALE": "DEGRADED",
  "ERROR,ERROR": "ERROR",
  "ERROR,UNKNOWN": "DEGRADED",
  "UNKNOWN,HEALTHY": "DEGRADED",
  "UNKNOWN,STALE": "DEGRADED",
  "UNKNOWN,ERROR": "DEGRADED",
  "UNKNOWN,UNKNOWN": "UNKNOWN",
};

for (const agents of HEALTH_STATES) {
  for (const vulnerabilities of HEALTH_STATES) {
    const key = `${agents},${vulnerabilities}`;
    const expected = EXPECTED_SIEM_MATRIX[key];

    test(`combineSiemHealth: agents=${agents} + vulnerabilities=${vulnerabilities} -> ${expected}`, () => {
      assert.equal(combineSiemHealth(agents, vulnerabilities), expected);
    });
  }
}

test("computeSiemHealth: configurationStatus INACTIVE short-circuits both components to INACTIVE", () => {
  const result = computeSiemHealth({
    configurationStatus: IntegrationStatus.INACTIVE,
    now: NOW,
    agents: { latestAttempt: null, latestSuccess: null, latestError: null },
    vulnerabilities: {
      latestAttempt: buildLog(),
      latestSuccess: buildLog(),
      latestError: null,
    },
    thresholds: { agents: THRESHOLDS, vulnerabilities: VULNERABILITIES_THRESHOLDS },
  });

  assert.equal(result.status, "INACTIVE");
  assert.equal(result.components?.[0].status, "INACTIVE");
  assert.equal(result.components?.[1].status, "INACTIVE");
});

test("computeSiemHealth: configurationStatus ERROR short-circuits to ERROR while preserving component diagnostics", () => {
  const success = buildLog({ status: "SUCCESS", finishedAt: minutesAgo(2) });

  const result = computeSiemHealth({
    configurationStatus: IntegrationStatus.ERROR,
    now: NOW,
    agents: { latestAttempt: success, latestSuccess: success, latestError: null },
    vulnerabilities: { latestAttempt: null, latestSuccess: null, latestError: null },
    thresholds: { agents: THRESHOLDS, vulnerabilities: VULNERABILITIES_THRESHOLDS },
  });

  assert.equal(result.status, "ERROR");
  assert.deepEqual(result.components?.[0].lastSuccessAt, success.finishedAt);
});

test("computeSiemHealth: ACTIVE with agents HEALTHY and vulnerabilities STALE yields DEGRADED composite with component detail", () => {
  const agentsSuccess = buildLog({ status: "SUCCESS", finishedAt: minutesAgo(5) });
  const vulnerabilitiesSuccess = buildLog({ status: "SUCCESS", finishedAt: minutesAgo(200) });

  const result = computeSiemHealth({
    configurationStatus: IntegrationStatus.ACTIVE,
    now: NOW,
    agents: {
      latestAttempt: agentsSuccess,
      latestSuccess: agentsSuccess,
      latestError: null,
    },
    vulnerabilities: {
      latestAttempt: vulnerabilitiesSuccess,
      latestSuccess: vulnerabilitiesSuccess,
      latestError: null,
    },
    thresholds: { agents: THRESHOLDS, vulnerabilities: VULNERABILITIES_THRESHOLDS },
  });

  assert.equal(result.status, "DEGRADED");
  assert.equal(result.components?.find((c) => c.key === "agents")?.status, "HEALTHY");
  assert.equal(result.components?.find((c) => c.key === "vulnerabilities")?.status, "STALE");
});

test("computeSiemHealth: a STUCK component forces composite DEGRADED (mixed with a HEALTHY component) and activity STUCK", () => {
  const agentsSuccess = buildLog({ status: "SUCCESS", finishedAt: minutesAgo(5) });
  const stuckRunning = buildLog({
    status: "RUNNING",
    startedAt: minutesAgo(70),
    finishedAt: null,
    durationMs: null,
  });

  const result = computeSiemHealth({
    configurationStatus: IntegrationStatus.ACTIVE,
    now: NOW,
    agents: { latestAttempt: agentsSuccess, latestSuccess: agentsSuccess, latestError: null },
    vulnerabilities: { latestAttempt: stuckRunning, latestSuccess: null, latestError: null },
    thresholds: { agents: THRESHOLDS, vulnerabilities: VULNERABILITIES_THRESHOLDS },
  });

  assert.equal(result.components?.find((c) => c.key === "vulnerabilities")?.activity, "STUCK");
  assert.equal(result.components?.find((c) => c.key === "vulnerabilities")?.status, "ERROR");
  assert.equal(result.status, "DEGRADED");
  assert.equal(result.activity, "STUCK");
});

// ---------------------------------------------------------------------------
// SIEM composite activity.
// ---------------------------------------------------------------------------

test("combineSiemActivity: any STUCK wins regardless of the other component", () => {
  assert.equal(combineSiemActivity("STUCK", "IDLE"), "STUCK");
  assert.equal(combineSiemActivity("IDLE", "STUCK"), "STUCK");
  assert.equal(combineSiemActivity("STUCK", "RUNNING"), "STUCK");
});

test("combineSiemActivity: RUNNING wins when nothing is STUCK", () => {
  assert.equal(combineSiemActivity("RUNNING", "IDLE"), "RUNNING");
  assert.equal(combineSiemActivity("IDLE", "RUNNING"), "RUNNING");
});

test("combineSiemActivity: IDLE when both components are IDLE", () => {
  assert.equal(combineSiemActivity("IDLE", "IDLE"), "IDLE");
});
