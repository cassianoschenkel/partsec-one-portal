import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  AlertCollectionResult,
  AuthorizedSiemAlertEvent,
} from "../integrations/siem-alerts-query";
import {
  SiemEventsPersistenceError,
  type SiemEventsTenantContext,
} from "./siem-events-persistence";
import {
  createPrismaSiemEventsStore,
  type SiemEventUpsertArgs,
  type SiemEventsPrismaClient,
  type SiemEventsPrismaDelegates,
  type SiemSyncLogUpdateManyArgs,
} from "./siem-events-prisma-store";
import { persistSiemAlertEventsTransactional } from "./siem-events-transactional";

const TENANT = "tenant-a";
const CTX: SiemEventsTenantContext = {
  tenantId: TENANT,
  authorizedAgentIds: ["001"],
  upsertBatchSize: 2,
};

function ev(n: number, tenantId = TENANT): AuthorizedSiemAlertEvent {
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
    tenantId,
  } as AuthorizedSiemAlertEvent;
}

function coll(events: AuthorizedSiemAlertEvent[]): AlertCollectionResult {
  return {
    status: "COMPLETE",
    events,
    pages: 1,
    documentsRead: events.length,
    rejected: { total: 0, unauthorizedAgent: 0, outOfWindow: 0, byReason: {} },
  };
}

type LogRow = { id: string; tenantId: string; status: string; message?: string };

/** Fake DB with REAL commit/rollback semantics (snapshot + restore). */
function fakeClient(
  opts: {
    failUpsertCall?: number;
    failSuccessUpdate?: boolean;
    failErrorUpdate?: boolean;
    failCreate?: boolean;
    seedLogs?: LogRow[];
  } = {}
) {
  let events = new Map<string, SiemEventUpsertArgs["create"]>();
  let logs = new Map<string, LogRow>(
    (opts.seedLogs ?? []).map((l) => [l.id, l])
  );
  const stats = { upsertCalls: 0, writes: 0, txs: 0, commits: 0, rollbacks: 0 };
  const updateWheres: SiemSyncLogUpdateManyArgs["where"][] = [];
  let inTx = false;

  const delegates: SiemEventsPrismaDelegates = {
    siemEventSnapshot: {
      async upsert(args) {
        stats.upsertCalls += 1;
        stats.writes += 1;
        if (stats.upsertCalls === opts.failUpsertCall) {
          throw new Error("boom https://secret password=p");
        }
        const k = args.where.tenantId_indexName_documentId;
        events.set(`${k.tenantId}|${k.indexName}|${k.documentId}`, args.create);
      },
    },
    integrationSyncLog: {
      async create({ data }) {
        if (opts.failCreate) throw new Error("create failed");
        stats.writes += 1;
        const id = `log-${logs.size + 1}`;
        logs.set(id, { id, tenantId: data.tenantId, status: data.status });
        return { id };
      },
      async updateMany({ where, data }) {
        updateWheres.push(where);
        if (data.status === "SUCCESS" && opts.failSuccessUpdate) {
          throw new Error("success update failed");
        }
        if (data.status === "ERROR" && opts.failErrorUpdate) {
          throw new Error("error update failed token=abc");
        }
        const row = logs.get(where.id);
        if (!row || row.tenantId !== where.tenantId) return { count: 0 };
        stats.writes += 1;
        logs.set(row.id, { ...row, status: data.status, message: data.message });
        return { count: 1 };
      },
    },
  };

  const client: SiemEventsPrismaClient = {
    ...delegates,
    async $transaction(fn) {
      assert.equal(inTx, false, "no nested transactions");
      stats.txs += 1;
      const evSnap = new Map(events);
      const logSnap = new Map(logs);
      inTx = true;
      try {
        const out = await fn(delegates);
        stats.commits += 1;
        return out;
      } catch (e) {
        events = evSnap;
        logs = logSnap;
        stats.rollbacks += 1;
        throw e;
      } finally {
        inTx = false;
      }
    },
  };
  return {
    client,
    stats,
    updateWheres,
    events: () => events,
    logs: () => logs,
  };
}

describe("transactional module isolation", () => {
  it("has no singleton, env, fetch, delete or raw SQL", async () => {
    const { readFile } = await import("node:fs/promises");
    for (const f of ["./siem-events-transactional.ts", "./siem-events-prisma-store.ts"]) {
      const src = await readFile(new URL(f, import.meta.url), "utf8");
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      assert.ok(!/@\/lib\/prisma|lib\/prisma|siem-client|crypto/.test(code), f);
      assert.ok(
        !/process\.env|\bfetch\(|\.delete\(|deleteMany|\$queryRaw|\$executeRaw|full_log/.test(code),
        f
      );
    }
  });
});

describe("persistSiemAlertEventsTransactional", () => {
  it("commits all upserts and SUCCESS together", async () => {
    const f = fakeClient();
    const res = await persistSiemAlertEventsTransactional({
      store: createPrismaSiemEventsStore(f.client),
      collection: coll([ev(1), ev(2), ev(3)]),
      ctx: CTX,
    });
    assert.equal(res.persisted, 3);
    assert.equal(res.batches, 2);
    assert.equal(f.stats.txs, 1);
    assert.equal(f.stats.commits, 1);
    assert.equal(f.events().size, 3);
    assert.equal(f.logs().get("log-1")?.status, "SUCCESS");
    assert.deepEqual(f.updateWheres, [{ id: "log-1", tenantId: TENANT }]);
  });

  it("is idempotent on retry (same composite key)", async () => {
    const f = fakeClient();
    const store = createPrismaSiemEventsStore(f.client);
    const params = { store, collection: coll([ev(1), ev(2)]), ctx: CTX };
    await persistSiemAlertEventsTransactional(params);
    await persistSiemAlertEventsTransactional(params);
    assert.equal(f.events().size, 2);
  });

  it("rolls back every upsert when the second chunk fails; log ERROR", async () => {
    const f = fakeClient({ failUpsertCall: 3 }); // chunk 1 = calls 1-2
    await assert.rejects(
      persistSiemAlertEventsTransactional({
        store: createPrismaSiemEventsStore(f.client),
        collection: coll([ev(1), ev(2), ev(3)]),
        ctx: CTX,
      }),
      (e: unknown) => {
        assert.ok(e instanceof SiemEventsPersistenceError);
        assert.equal(e.code, "WRITE_FAILED");
        assert.ok(!/secret|password|https?:|doc-|wazuh-alerts/.test(e.message));
        return true;
      }
    );
    assert.equal(f.events().size, 0);
    assert.equal(f.stats.rollbacks, 1);
    assert.equal(f.stats.commits, 0);
    assert.equal(f.logs().get("log-1")?.status, "ERROR");
    assert.deepEqual(f.updateWheres, [{ id: "log-1", tenantId: TENANT }]);
  });

  it("rolls back all upserts when SUCCESS finalization fails", async () => {
    const f = fakeClient({ failSuccessUpdate: true });
    await assert.rejects(
      persistSiemAlertEventsTransactional({
        store: createPrismaSiemEventsStore(f.client),
        collection: coll([ev(1), ev(2), ev(3)]),
        ctx: CTX,
      }),
      (e: unknown) =>
        e instanceof SiemEventsPersistenceError && e.code === "WRITE_FAILED"
    );
    assert.equal(f.events().size, 0);
    assert.equal(f.logs().get("log-1")?.status, "ERROR");
  });

  it("propagates ERROR-mark failure without secrets; never SUCCESS", async () => {
    const f = fakeClient({ failUpsertCall: 1, failErrorUpdate: true });
    await assert.rejects(
      persistSiemAlertEventsTransactional({
        store: createPrismaSiemEventsStore(f.client),
        collection: coll([ev(1)]),
        ctx: CTX,
      }),
      (e: unknown) => {
        assert.ok(e instanceof SiemEventsPersistenceError);
        assert.equal(e.code, "SYNC_LOG_FINISH_FAILED");
        assert.ok(!/token|abc|secret|password/.test(e.message));
        return true;
      }
    );
    assert.equal(f.events().size, 0);
    assert.equal(f.logs().get("log-1")?.status, "RUNNING"); // orphan, documented
  });

  it("fails when the log update affects zero rows (other tenant's log)", async () => {
    // Log id exists but belongs to another tenant: scoped update must not hit it.
    const f = fakeClient({
      seedLogs: [{ id: "log-1", tenantId: "tenant-b", status: "RUNNING" }],
    });
    const store = createPrismaSiemEventsStore(f.client);
    await assert.rejects(
      store.markSyncLogError("tenant-a", "log-1", {
        status: "ERROR",
        finishedAt: new Date(),
        durationMs: 1,
        message: "x",
      })
    );
    assert.equal(f.logs().get("log-1")?.status, "RUNNING");
  });

  it("makes zero store calls on invalid input", async () => {
    const f = fakeClient();
    const store = createPrismaSiemEventsStore(f.client);
    const bad: AlertCollectionResult[] = [
      { ...coll([ev(1)]), status: "INCOMPLETE" } as AlertCollectionResult,
      coll([ev(1, "tenant-b")]),
      coll([ev(1), ev(1)]),
    ];
    for (const collection of bad) {
      await assert.rejects(
        persistSiemAlertEventsTransactional({ store, collection, ctx: CTX }),
        SiemEventsPersistenceError
      );
    }
    assert.equal(f.stats.writes, 0);
    assert.equal(f.stats.txs, 0);
  });

  it("log start failure: no events, no transaction", async () => {
    const f = fakeClient({ failCreate: true });
    await assert.rejects(
      persistSiemAlertEventsTransactional({
        store: createPrismaSiemEventsStore(f.client),
        collection: coll([ev(1)]),
        ctx: CTX,
      }),
      (e: unknown) =>
        e instanceof SiemEventsPersistenceError &&
        e.code === "SYNC_LOG_START_FAILED"
    );
    assert.equal(f.stats.txs, 0);
    assert.equal(f.events().size, 0);
  });

  it("adapter rejects mixed tenants inside a cycle", async () => {
    const f = fakeClient();
    const store = createPrismaSiemEventsStore(f.client);
    const row = (tenantId: string, d: string) => ({
      tenantId,
      indexName: "wazuh-alerts-x",
      documentId: d,
      occurredAt: new Date(),
      wazuhAgentId: "001",
      agentName: null,
      ruleId: "1",
      ruleLevel: 1,
      ruleDescription: "d",
      syncedAt: new Date(),
    });
    await assert.rejects(
      store.runInTransaction((tx) =>
        tx.upsertEvents([row("tenant-a", "1"), row("tenant-b", "2")])
      )
    );
    assert.equal(f.events().size, 0); // rolled back
  });
});
