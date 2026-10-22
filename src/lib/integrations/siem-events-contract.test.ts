import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_ALERTS_INDEX_PATTERN,
  normalizeSiemAlertHit,
  parseWazuhTimestamp,
  resolveAlertsIndexPattern,
  validateAlertsIndexPattern,
} from "./siem-events-contract";

function hit(overrides: Record<string, unknown> = {}, source = {}) {
  return {
    _index: "wazuh-alerts-4.x-2023.07.26",
    _id: "synthetic-doc-1",
    _source: {
      timestamp: "2023-07-26T09:21:07.928+0000",
      agent: { id: "001", name: "synthetic-host" },
      rule: { id: "5710", level: 5, description: "Synthetic rule" },
      full_log: "SECRET-LOG password=hunter2",
      data: { srcip: "203.0.113.9" },
      previous_output: "prev",
      ...source,
    },
    ...overrides,
  };
}

function ok(input: unknown) {
  const r = normalizeSiemAlertHit(input);
  assert.equal(r.ok, true);
  if (!r.ok) throw new Error("unreachable");
  return r;
}

function reason(input: unknown) {
  const r = normalizeSiemAlertHit(input);
  assert.equal(r.ok, false);
  return r.ok ? null : r.reason;
}

describe("parseWazuhTimestamp", () => {
  it("parses ISO Z", () => {
    assert.equal(
      parseWazuhTimestamp("2023-05-09T11:41:31.033Z")?.toISOString(),
      "2023-05-09T11:41:31.033Z"
    );
  });
  it("parses +0000", () => {
    assert.equal(
      parseWazuhTimestamp("2023-07-26T09:21:07.928+0000")?.toISOString(),
      "2023-07-26T09:21:07.928Z"
    );
  });
  it("converts -0300 to UTC", () => {
    assert.equal(
      parseWazuhTimestamp("2023-07-26T09:21:07.000-0300")?.toISOString(),
      "2023-07-26T12:21:07.000Z"
    );
  });
  it("converts +03:30 to UTC", () => {
    assert.equal(
      parseWazuhTimestamp("2023-07-26T09:21:07+03:30")?.toISOString(),
      "2023-07-26T05:51:07.000Z"
    );
  });
  it("rejects invalid values", () => {
    for (const v of [
      "2023-07-26T09:21:07", // no zone
      "2023-02-30T09:21:07Z",
      "2023-13-01T09:21:07Z",
      "2023-07-26T24:00:00Z",
      "yesterday",
      "",
      1690363267,
      null,
      {},
    ]) {
      assert.equal(parseWazuhTimestamp(v), null, String(v));
    }
  });
});

describe("normalizeSiemAlertHit", () => {
  it("normalizes a valid alert", () => {
    const { event, displayAuthorization } = ok(hit());
    assert.deepEqual(event, {
      indexName: "wazuh-alerts-4.x-2023.07.26",
      documentId: "synthetic-doc-1",
      occurredAt: new Date("2023-07-26T09:21:07.928Z"),
      wazuhAgentId: "001",
      agentName: "synthetic-host",
      ruleId: "5710",
      ruleLevel: 5,
      ruleDescription: "Synthetic rule",
    });
    assert.equal(displayAuthorization, "NOT_AUTHORIZED");
  });

  it("preserves leading zeros in agent.id", () => {
    assert.equal(ok(hit()).event.wazuhAgentId, "001");
    assert.equal(
      ok(hit({}, { agent: { id: "000" } })).event.wazuhAgentId,
      "000"
    );
  });

  it("prefers timestamp over @timestamp", () => {
    const { event } = ok(
      hit({}, { timestamp: "2023-07-26T09:00:00.000-0300", "@timestamp": "2020-01-01T00:00:00Z" })
    );
    assert.equal(event.occurredAt.toISOString(), "2023-07-26T12:00:00.000Z");
  });

  it("falls back to @timestamp only when timestamp is absent", () => {
    const { event } = ok(
      hit({}, { timestamp: undefined, "@timestamp": "2023-05-09T11:41:31.033Z" })
    );
    assert.equal(event.occurredAt.toISOString(), "2023-05-09T11:41:31.033Z");
  });

  it("does not fall back when timestamp is present but invalid", () => {
    assert.equal(
      reason(hit({}, { timestamp: "bad", "@timestamp": "2023-05-09T11:41:31.033Z" })),
      "INVALID_TIMESTAMP"
    );
  });

  it("rejects missing timestamps", () => {
    assert.equal(reason(hit({}, { timestamp: undefined })), "MISSING_TIMESTAMP");
  });

  it("rejects events without an agent", () => {
    assert.equal(reason(hit({}, { agent: undefined })), "MISSING_AGENT_ID");
    assert.equal(reason(hit({}, { agent: {} })), "MISSING_AGENT_ID");
    assert.equal(
      reason(hit({}, { agent: { name: "only-name" } })),
      "MISSING_AGENT_ID"
    );
  });

  it("rejects non-string or blank agent.id", () => {
    assert.equal(reason(hit({}, { agent: { id: 1 } })), "INVALID_AGENT_ID");
    assert.equal(reason(hit({}, { agent: { id: "  " } })), "INVALID_AGENT_ID");
    assert.equal(reason(hit({}, { agent: "x" })), "INVALID_AGENT_ID");
  });

  it("treats agentName as optional but typed", () => {
    const { event } = ok(hit({}, { agent: { id: "002" } }));
    assert.equal("agentName" in event, false);
    assert.equal(
      reason(hit({}, { agent: { id: "002", name: 5 } })),
      "INVALID_AGENT_NAME"
    );
  });

  it("validates rule fields and keeps native level", () => {
    assert.equal(ok(hit({}, { rule: { id: 100, level: "12", description: "d" } })).event.ruleLevel, 12);
    assert.equal(ok(hit({}, { rule: { id: 100, level: 0, description: "d" } })).event.ruleLevel, 0);
    assert.equal(ok(hit({}, { rule: { id: 100, level: 15, description: "d" } })).event.ruleId, "100");
    for (const level of [-1, 1.5, "x", null, undefined, NaN]) {
      assert.equal(
        reason(hit({}, { rule: { id: "1", level, description: "d" } })),
        "INVALID_RULE_LEVEL"
      );
    }
    assert.equal(reason(hit({}, { rule: { level: 1, description: "d" } })), "INVALID_RULE_ID");
    assert.equal(reason(hit({}, { rule: { id: "1", level: 1 } })), "INVALID_RULE_DESCRIPTION");
    assert.equal(reason(hit({}, { rule: undefined })), "INVALID_RULE_ID");
  });

  it("rejects malformed hits", () => {
    assert.equal(reason(null), "NOT_AN_OBJECT");
    assert.equal(reason("x"), "NOT_AN_OBJECT");
    assert.equal(reason([]), "NOT_AN_OBJECT");
    assert.equal(reason(hit({ _index: undefined })), "INVALID_INDEX_NAME");
    assert.equal(reason(hit({ _id: 5 })), "INVALID_DOCUMENT_ID");
    assert.equal(reason(hit({ _source: "x" })), "MISSING_SOURCE");
    assert.equal(reason({ _index: "i", _id: "1" }), "MISSING_SOURCE");
  });

  it("does not leak full_log, data or the raw source", () => {
    const { event } = ok(hit());
    const serialized = JSON.stringify(event);
    for (const needle of ["SECRET-LOG", "hunter2", "203.0.113.9", "prev"]) {
      assert.equal(serialized.includes(needle), false, needle);
    }
    for (const key of ["full_log", "data", "previous_output", "rawData", "_source"]) {
      assert.equal(key in event, false, key);
    }
    assert.deepEqual(Object.keys(event).sort(), [
      "agentName", "documentId", "indexName", "occurredAt",
      "ruleDescription", "ruleId", "ruleLevel", "wazuhAgentId",
    ]);
  });
});

describe("index pattern", () => {
  it("falls back when not configured", () => {
    for (const v of [undefined, null]) {
      assert.deepEqual(resolveAlertsIndexPattern(v), {
        ok: true,
        pattern: DEFAULT_ALERTS_INDEX_PATTERN,
        source: "fallback",
      });
    }
  });

  it("accepts safe patterns", () => {
    for (const v of ["wazuh-alerts-*", "wazuh-alerts-4.x-*", "wazuh-alerts-4.x-2023.07.26", "acme-wazuh-alerts-*"]) {
      const r = validateAlertsIndexPattern(v);
      assert.equal(r.ok, true, v);
      assert.equal(resolveAlertsIndexPattern(v).ok, true, v);
    }
  });

  it("rejects unsafe or too-broad patterns without fallback", () => {
    for (const v of [
      "*", "wazuh-*", "*alerts*", "wazuh-*-alerts", "wazuh-alerts-**",
      "wazuh-alerts-?", "wazuh-alerts-*/_search", "wazuh-alerts\\x",
      "../wazuh-alerts-*", "wazuh-alerts-..x", "wazuh-alerts-#", "wazuh-alerts-%2e",
      "wazuh-alerts:*", "wazuh-alerts-1,wazuh-archives-*", "wazuh alerts-*",
      " wazuh-alerts-*", "wazuh-archives-*", "wazuh-alerts-archives-*",
      "https://host/wazuh-alerts-*", "Wazuh-Alerts-*", "-wazuh-alerts-*",
      "", "   ", 5, {},
    ]) {
      assert.equal(validateAlertsIndexPattern(v).ok, false, String(v));
      const r = resolveAlertsIndexPattern(v);
      assert.equal(r.ok, false, String(v));
    }
  });
});
