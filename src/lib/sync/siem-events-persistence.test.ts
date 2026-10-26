import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  AlertCollectionResult,
  AuthorizedSiemAlertEvent,
} from "../integrations/siem-alerts-query";
import {
  persistSiemAlertEvents,
  SiemEventsPersistenceError,
  type SiemEventRow,
  type SiemEventsStore,
  type SiemEventsSyncLogFinish,
  type SiemEventsSyncLogStart,
  type SiemEventsTenantContext,
} from "./siem-events-persistence";

const TENANT = "tenant-a";
const CTX: SiemEventsTenantContext = {
  tenantId: TENANT,
  authorizedAgentIds: ["001", "002"],
};

function ev(
  n: number,
  over: Partial<Record<string, unknown>> = {}
): AuthorizedSiemAlertEvent {
  return {
    indexName: "wazuh-alerts-4.x-2026.01.01",
    documentId: `doc-${n}`,
    occurredAt: new Date("2026-01-01T00:00:00Z"),
    wazuhAgentId: "001",
    agentName: "host-1",
    ruleId: "5710",
    ruleLevel: 5,
    ruleDescription: "sshd: attempt",
    displayAuthorization: "AUTHORIZED_BY_AGENT_ALLOWLIST",
    tenantId: TENANT,
    ...over,
  } as AuthorizedSiemAlertEvent;
}

function coll(
  events: AuthorizedSiemAlertEvent[],
  over: Partial<AlertCollectionResult> = {}
): AlertCollectionResult {
  return {
    status: "COMPLETE",
    events,
    pages: 1,
    documentsRead: events.length,
    rejected: { total: 0, unauthorizedAgent: 0, outOfWindow: 0, byReason: {} },
    ...over,
  };
}

type Calls = {
  starts: SiemEventsSyncLogStart[];
  upserts: SiemEventRow[][];
  finishes: SiemEventsSyncLogFinish[];
};

function mockStore(
  opts: {
    failStart?: boolean;
    failUpsertAt?: number;
    failFinish?: "ALL" | "SUCCESS";
  } = {}
): { store: SiemEventsStore; calls: Calls; db: Map<string, SiemEventRow> } {
  const calls: Calls = { starts: [], upserts: [], finishes: [] };
  const db = new Map<string, SiemEventRow>();
  const store: SiemEventsStore = {
    async createSyncLog(d) {
      if (opts.failStart) throw new Error("secret https://x password=p");
      calls.starts.push(d);
      return { id: "log-1" };
    },
    async upsertEvents(rows) {
      if (opts.failUpsertAt === calls.upserts.length) {
        throw new Error("db down");
      }
      calls.upserts.push([...rows]);
      for (const r of rows) {
        db.set(`${r.tenantId}|${r.indexName}|${r.documentId}`, r);
      }
    },
    async finishSyncLog(_id, d) {
      if (opts.failFinish === "ALL" || opts.failFinish === d.status) {
        throw new Error("finish down");
      }
      calls.finishes.push(d);
    },
  };
  return { store, calls, db };
}

async function expectCode(
  p: Promise<unknown>,
  code: SiemEventsPersistenceError["code"]
) {
  await assert.rejects(p, (e: unknown) => {
    assert.ok(e instanceof SiemEventsPersistenceError);
    assert.equal(e.code, code);
    return true;
  });
}

async function expectNoWrites(
  collection: AlertCollectionResult,
  code: SiemEventsPersistenceError["code"],
  ctx: SiemEventsTenantContext = CTX
) {
  const { store, calls } = mockStore();
  await expectCode(persistSiemAlertEvents({ store, collection, ctx }), code);
  assert.equal(calls.starts.length, 0);
  assert.equal(calls.upserts.length, 0);
  assert.equal(calls.finishes.length, 0);
}

describe("persistSiemAlertEvents - success", () => {
  it("persists an empty COMPLETE collection with SUCCESS log", async () => {
    const { store, calls } = mockStore();
    const r = await persistSiemAlertEvents({ store, collection: coll([]), ctx: CTX });
    assert.equal(r.persisted, 0);
    assert.equal(calls.upserts.length, 0);
    assert.equal(calls.starts[0].integrationType, "WAZUH");
    assert.equal(calls.starts[0].syncKind, "SIEM_EVENTS");
    assert.equal(calls.starts[0].status, "RUNNING");
    assert.equal(calls.finishes[0].status, "SUCCESS");
  });

  it("persists N events in sequential chunks, approved columns only", async () => {
    const { store, calls } = mockStore();
    const events = [1, 2, 3, 4, 5].map((n) => ev(n));
    (events[0] as Record<string, unknown>).full_log = "SECRET";
    (events[0] as Record<string, unknown>).rawData = { a: 1 };
    const r = await persistSiemAlertEvents({
      store,
      collection: coll(events),
      ctx: { ...CTX, upsertBatchSize: 2 },
    });
    assert.equal(r.persisted, 5);
    assert.equal(r.batches, 3);
    assert.deepEqual(calls.upserts.map((c) => c.length), [2, 2, 1]);
    const keys = Object.keys(calls.upserts[0][0]).sort();
    assert.deepEqual(keys, [
      "agentName",
      "documentId",
      "indexName",
      "occurredAt",
      "ruleDescription",
      "ruleId",
      "ruleLevel",
      "syncedAt",
      "tenantId",
      "wazuhAgentId",
    ]);
    assert.equal(calls.finishes[0].status, "SUCCESS");
  });

  it("is idempotent across two runs of the same batch", async () => {
    const { store, db } = mockStore();
    const collection = coll([ev(1), ev(2)]);
    await persistSiemAlertEvents({ store, collection, ctx: CTX });
    await persistSiemAlertEvents({ store, collection, ctx: CTX });
    assert.equal(db.size, 2);
  });

  it("log messages carry no index/document ids", async () => {
    const { store, calls } = mockStore();
    await persistSiemAlertEvents({ store, collection: coll([ev(1)]), ctx: CTX });
    const all = [...calls.starts, ...calls.finishes].map((l) => l.message).join();
    assert.ok(!all.includes("doc-1"));
    assert.ok(!all.includes("wazuh-alerts"));
  });
});

describe("persistSiemAlertEvents - fail closed before any write", () => {
  it("rejects INCOMPLETE for any reason", async () => {
    for (const reason of [
      "LIMIT_REACHED",
      "TIEBREAKER_NOT_VERIFIED",
      "SORT_MISSING_OR_AMBIGUOUS",
      "REPEATED_CURSOR",
    ] as const) {
      await expectNoWrites(
        coll([ev(1)], { status: "INCOMPLETE", incompleteReason: reason }),
        "COLLECTION_INCOMPLETE"
      );
    }
  });

  it("rejects COMPLETE carrying incompleteReason or unknown status", async () => {
    await expectNoWrites(
      coll([], { incompleteReason: "LIMIT_REACHED" }),
      "COLLECTION_INCOMPLETE"
    );
    await expectNoWrites(
      coll([], { status: "WHATEVER" as never }),
      "COLLECTION_INCOMPLETE"
    );
  });

  it("rejects discarded documents", async () => {
    await expectNoWrites(
      coll([ev(1)], {
        rejected: {
          total: 1,
          unauthorizedAgent: 0,
          outOfWindow: 0,
          byReason: { INVALID_TIMESTAMP: 1 },
        },
      }),
      "COLLECTION_HAS_REJECTIONS"
    );
  });

  it("rejects malformed collection / counters", async () => {
    await expectNoWrites(null as never, "INVALID_COLLECTION");
    await expectNoWrites(
      coll([], { rejected: undefined as never }),
      "INVALID_COLLECTION"
    );
    await expectNoWrites(
      coll([ev(1)], { events: "x" as never }),
      "INVALID_COLLECTION"
    );
    await expectNoWrites(
      coll([ev(1)], { documentsRead: -1 }),
      "INVALID_COLLECTION"
    );
  });

  it("rejects inconsistent counts", async () => {
    await expectNoWrites(
      coll([ev(1), ev(2)], { documentsRead: 1 }),
      "INCONSISTENT_COUNTS"
    );
    await expectNoWrites(coll([], { pages: 0 }), "INCONSISTENT_COUNTS");
  });

  it("rejects collections at or over the limit", async () => {
    await expectNoWrites(
      coll([ev(1)], { documentsRead: 3 }),
      "COLLECTION_AT_LIMIT",
      { ...CTX, maxEvents: 3 }
    );
    await expectNoWrites(coll([ev(1), ev(2)]), "COLLECTION_AT_LIMIT", {
      ...CTX,
      maxEvents: 1,
    });
  });

  it("rejects tenant mismatch, including one bad event in the batch", async () => {
    await expectNoWrites(
      coll([ev(1, { tenantId: "tenant-b" })]),
      "TENANT_MISMATCH"
    );
    await expectNoWrites(
      coll([ev(1), ev(2, { tenantId: "tenant-b" })]),
      "TENANT_MISMATCH"
    );
    await expectNoWrites(coll([ev(1, { tenantId: undefined })]), "TENANT_MISMATCH");
  });

  it("rejects absent or forged displayAuthorization", async () => {
    for (const v of [undefined, "NOT_AUTHORIZED", "authorized_by_agent_allowlist"]) {
      await expectNoWrites(
        coll([ev(1, { displayAuthorization: v })]),
        "NOT_AUTHORIZED"
      );
    }
  });

  it("rejects agents outside the context allowlist", async () => {
    await expectNoWrites(coll([ev(1, { wazuhAgentId: "003" })]), "NOT_AUTHORIZED");
  });

  it("rejects invalid index names", async () => {
    for (const indexName of [
      "other-index",
      "wazuh-archives-2026",
      "wazuh-alerts-",
      "wazuh-alerts-*",
      "wazuh-alerts-x/../y",
      "",
      42,
    ]) {
      await expectNoWrites(coll([ev(1, { indexName })]), "INVALID_EVENT");
    }
  });

  it("rejects invalid ids, fields and dates", async () => {
    const bad: Record<string, unknown>[] = [
      { documentId: "" },
      { documentId: "   " },
      { documentId: 5 },
      { occurredAt: new Date("nope") },
      { occurredAt: "2026-01-01T00:00:00Z" },
      { wazuhAgentId: "000" },
      { wazuhAgentId: 1 },
      { agentName: 5 },
      { agentName: "" },
      { ruleId: "" },
      { ruleLevel: -1 },
      { ruleLevel: 1.5 },
      { ruleLevel: "5" },
      { ruleDescription: "" },
    ];
    for (const over of bad) {
      await expectNoWrites(coll([ev(1, over)]), "INVALID_EVENT");
    }
    await expectNoWrites(coll([null as never]), "INVALID_EVENT");
  });

  it("rejects duplicate index/document in one batch", async () => {
    await expectNoWrites(coll([ev(1), ev(1)]), "DUPLICATE_EVENT");
  });

  it("rejects invalid tenant context and limits", async () => {
    await expectNoWrites(coll([]), "INVALID_CONTEXT", {
      ...CTX,
      tenantId: "",
    });
    await expectNoWrites(coll([]), "INVALID_CONTEXT", {
      ...CTX,
      authorizedAgentIds: [],
    });
    await expectNoWrites(coll([]), "INVALID_LIMITS", {
      ...CTX,
      upsertBatchSize: 0,
    });
    await expectNoWrites(coll([]), "INVALID_LIMITS", { ...CTX, maxEvents: 10 ** 9 });
  });
});

describe("persistSiemAlertEvents - failures never become SUCCESS", () => {
  it("sync log creation failure: no event written, no leaked message", async () => {
    const { store, calls } = mockStore({ failStart: true });
    await assert.rejects(
      persistSiemAlertEvents({ store, collection: coll([ev(1)]), ctx: CTX }),
      (e: unknown) => {
        assert.ok(e instanceof SiemEventsPersistenceError);
        assert.equal(e.code, "SYNC_LOG_START_FAILED");
        assert.ok(!/secret|password|https/.test(e.message));
        return true;
      }
    );
    assert.equal(calls.upserts.length, 0);
    assert.equal(calls.finishes.length, 0);
  });

  it("upsert failure: ERROR log with partial count, error propagated", async () => {
    const { store, calls } = mockStore({ failUpsertAt: 1 });
    await assert.rejects(
      persistSiemAlertEvents({
        store,
        collection: coll([ev(1), ev(2), ev(3)]),
        ctx: { ...CTX, upsertBatchSize: 2 },
      }),
      (e: unknown) => {
        assert.ok(e instanceof SiemEventsPersistenceError);
        assert.equal(e.code, "WRITE_FAILED");
        assert.equal(e.details.persistedBeforeFailure, 2);
        return true;
      }
    );
    assert.equal(calls.finishes.length, 1);
    assert.equal(calls.finishes[0].status, "ERROR");
    assert.ok(calls.finishes.every((f) => f.status !== "SUCCESS"));
  });

  it("upsert failure and ERROR log failure: still throws, no SUCCESS", async () => {
    const { store, calls } = mockStore({ failUpsertAt: 0, failFinish: "ALL" });
    await expectCode(
      persistSiemAlertEvents({ store, collection: coll([ev(1)]), ctx: CTX }),
      "SYNC_LOG_FINISH_FAILED"
    );
    assert.equal(calls.finishes.length, 0);
  });

  it("SUCCESS log failure after writes: propagated, not reported as success", async () => {
    const { store, calls, db } = mockStore({ failFinish: "SUCCESS" });
    await expectCode(
      persistSiemAlertEvents({ store, collection: coll([ev(1)]), ctx: CTX }),
      "SYNC_LOG_FINISH_FAILED"
    );
    assert.equal(db.size, 1);
    assert.equal(calls.finishes.length, 0);
  });
});

describe("module isolation", () => {
  it("does not import prisma, env, fetch or real clients", async () => {
    const { readFile } = await import("node:fs/promises");
    const src = await readFile(
      new URL("./siem-events-persistence.ts", import.meta.url),
      "utf8"
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!/from\s+["'][^"']*(prisma|siem-client|siem-indexer-client|crypto)/.test(code));
    assert.ok(!/process\.env|\bfetch\(|deleteMany|rawData|full_log/.test(code));
  });
});
