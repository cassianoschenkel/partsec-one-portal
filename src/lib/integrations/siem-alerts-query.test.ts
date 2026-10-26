import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveAuthorizedAlertAgents,
  type AlertsAuthorizationResult,
} from "./siem-alerts-authorization";
import {
  ALERT_SOURCE_FIELDS,
  buildAlertsSearchBody,
  assertSafeTiebreakerField,
  collectTenantAlerts,
  SiemAlertQueryError,
  VERIFIED_ALERT_TIEBREAKER_FIELDS,
  type AlertsFetch,
  type CollectTenantAlertsParams,
} from "./siem-alerts-query";

const FROM = new Date("2026-01-01T00:00:00Z");
const TO = new Date("2026-01-01T12:00:00Z");
// SYNTHETIC, test-only field name. Its existence/uniqueness/sortability in a
// real Wazuh Indexer has NOT been verified; it only exercises the code paths.
const SYNTHETIC = "synthetic_unique_seq_test_only";
const range = { from: FROM, to: TO };

const auth = resolveAuthorizedAlertAgents({
  tenantId: "t1",
  tenant: { id: "t1", isActive: true },
  integration: {
    tenantId: "t1",
    type: "WAZUH",
    status: "ACTIVE",
    externalGroupId: "tenant-a",
  },
  manager: {
    originId: "c1",
    groupExists: true,
    agents: [
      { id: "001", groups: ["tenant-a"] },
      { id: "002", groups: ["tenant-a"] },
    ],
  },
  indexer: { originId: "c1" },
  otherTenantGroupIds: [],
});

function hit(
  id: string,
  agentId: string | number | undefined,
  ts = "2026-01-01T01:00:00.000Z",
  sort?: unknown[],
  index = "wazuh-alerts-4.x-2026.01.01"
) {
  return {
    _index: index,
    _id: id,
    _source: {
      timestamp: ts,
      ...(agentId === undefined ? {} : { agent: { id: agentId, name: "h" } }),
      rule: { id: "100", level: 5, description: "d" },
    },
    ...(sort ? { sort } : {}),
  };
}

function reply(hits: unknown[], status = 200): ReturnType<AlertsFetch> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ hits: { hits } }),
  });
}

function params(
  fetchFn: AlertsFetch,
  extra: Partial<CollectTenantAlertsParams> = {}
): CollectTenantAlertsParams {
  return {
    fetch: fetchFn,
    baseUrl: "https://indexer.example.invalid:9200/",
    username: "u",
    password: "p",
    authorization: auth,
    range,
    ...extra,
  };
}

async function code(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    assert.ok(e instanceof SiemAlertQueryError);
    return e.code;
  }
  assert.fail("expected rejection");
}

describe("buildAlertsSearchBody", () => {
  it("includes time range, terms, approved _source and bounded size", () => {
    const body = buildAlertsSearchBody({
      agentIds: ["001"],
      range,
      pageSize: 50,
    });
    const filter = body.query.bool.filter as Record<string, unknown>[];
    assert.deepEqual(filter[1], { terms: { "agent.id": ["001"] } });
    assert.ok("range" in filter[0]);
    assert.deepEqual(body._source, ALERT_SOURCE_FIELDS);
    for (const banned of ["full_log", "data", "previous_output"]) {
      assert.ok(!JSON.stringify(body._source).includes(banned));
    }
    assert.equal(body.size, 50);
    assert.equal(body.search_after, undefined);
    assert.ok(!JSON.stringify(body.sort).includes("_id"));
  });

  it("refuses empty/invalid ids, bad window and oversize page", () => {
    const ok = { agentIds: ["001"], range, pageSize: 10 };
    assert.throws(() => buildAlertsSearchBody({ ...ok, agentIds: [] }));
    assert.throws(() => buildAlertsSearchBody({ ...ok, agentIds: ["x"] }));
    assert.throws(() => buildAlertsSearchBody({ ...ok, pageSize: 501 }));
    assert.throws(() =>
      buildAlertsSearchBody({ ...ok, range: { from: TO, to: FROM } })
    );
    assert.throws(() =>
      buildAlertsSearchBody({
        ...ok,
        range: { from: FROM, to: new Date("2026-02-01T00:00:00Z") },
      })
    );
    assert.throws(() =>
      buildAlertsSearchBody({
        ...ok,
        range: { from: FROM, to: new Date("invalid") },
      })
    );
  });
});

describe("collectTenantAlerts", () => {
  it("returns authorized events and sends request with injected fetch", async () => {
    let seen: { url: string; body: string } | undefined;
    const r = await collectTenantAlerts(
      params((url, init) => {
        seen = { url, body: init.body };
        return reply([hit("a", "001"), hit("b", "002")]);
      })
    );
    assert.equal(r.status, "COMPLETE");
    assert.equal(r.events.length, 2);
    assert.equal(r.events[0].wazuhAgentId, "001");
    assert.equal(r.events[0].displayAuthorization, "AUTHORIZED_BY_AGENT_ALLOWLIST");
    assert.equal(r.events[0].tenantId, "t1");
    assert.equal(
      seen?.url,
      "https://indexer.example.invalid:9200/wazuh-alerts-*/_search"
    );
    assert.ok(seen?.body.includes('"terms":{"agent.id":["001","002"]}'));
  });

  it("handles empty 200", async () => {
    const r = await collectTenantAlerts(params(() => reply([])));
    assert.equal(r.status, "COMPLETE");
    assert.equal(r.events.length, 0);
  });

  it("does not call fetch when authorization is denied", async () => {
    let calls = 0;
    const denied: AlertsAuthorizationResult = {
      ok: false,
      reason: "MISSING_GROUP_ID",
      detail: "x",
    };
    const c = await code(
      collectTenantAlerts(
        params(
          () => {
            calls++;
            return reply([]);
          },
          { authorization: denied }
        )
      )
    );
    assert.equal(c, "NOT_AUTHORIZED");
    assert.equal(calls, 0);
  });

  it("rejects malformed hits, missing agent, and unauthorized agents locally", async () => {
    const r = await collectTenantAlerts(
      params(() =>
        reply([
          hit("ok", "001"),
          "garbage",
          hit("noagent", undefined),
          hit("other", "003"),
          hit("numeric", 1),
          hit("nozero", "1"),
          hit("early", "001", "2025-12-31T23:00:00Z"),
          hit("badidx", "001", undefined, undefined, "wazuh-archives-x"),
          hit("dup", "002"),
          hit("dup", "002"),
        ])
      )
    );
    assert.deepEqual(
      r.events.map((e) => e.documentId),
      ["ok", "dup"]
    );
    assert.equal(r.rejected.unauthorizedAgent, 2 /* 003, "1" */);
    assert.equal(r.rejected.outOfWindow, 2);
    assert.equal(r.rejected.byReason.NOT_AN_OBJECT, 1);
    assert.equal(r.rejected.byReason.MISSING_AGENT_ID, 1);
    assert.equal(r.rejected.byReason.INVALID_AGENT_ID, 1);
  });

  it("maps HTTP statuses to error codes", async () => {
    const cases: [number, string][] = [
      [401, "UNAUTHORIZED"],
      [403, "FORBIDDEN"],
      [429, "RATE_LIMITED"],
      [500, "SERVER_ERROR"],
      [503, "SERVER_ERROR"],
      [404, "HTTP_ERROR"],
    ];
    for (const [status, expected] of cases) {
      assert.equal(
        await code(collectTenantAlerts(params(() => reply([], status)))),
        expected
      );
    }
  });

  it("fails on malformed payload and network errors without leaking messages", async () => {
    assert.equal(
      await code(
        collectTenantAlerts(
          params(() =>
            Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
          )
        )
      ),
      "MALFORMED_RESPONSE"
    );
    let message = "";
    try {
      await collectTenantAlerts(
        params(() => Promise.reject(new Error("secret u:p@host")))
      );
    } catch (e) {
      message = (e as Error).message;
    }
    assert.ok(!message.includes("secret"));
  });

  it("times out", async () => {
    const slow: AlertsFetch = (_u, init) =>
      new Promise((_res, rej) => {
        init.signal.addEventListener("abort", () => rej(new Error("aborted")));
      });
    assert.equal(
      await code(
        collectTenantAlerts(params(slow, { limits: { timeoutMs: 10 } }))
      ),
      "TIMEOUT"
    );
  });

  it("rejects malicious index pattern before any request", async () => {
    let calls = 0;
    for (const bad of ["*", "wazuh-alerts-*,secret", "../x", "", "wazuh-archives-*"]) {
      assert.equal(
        await code(
          collectTenantAlerts(
            params(
              () => {
                calls++;
                return reply([]);
              },
              { configuredIndexPattern: bad }
            )
          )
        ),
        "INVALID_INDEX_PATTERN"
      );
    }
    assert.equal(calls, 0);
  });

  it("rejects out-of-bounds limits and ranges instead of clamping", async () => {
    const f = () => reply([]);
    for (const limits of [
      { pageSize: 501 },
      { pageSize: 0 },
      { maxPages: 21 },
      { maxDocuments: 10_001 },
      { timeoutMs: 60_001 },
    ]) {
      assert.equal(
        await code(collectTenantAlerts(params(f, { limits }))),
        "INVALID_LIMITS"
      );
    }
    assert.equal(
      await code(
        collectTenantAlerts(
          params(f, { range: { from: FROM, to: new Date("2026-03-01T00:00:00Z") } })
        )
      ),
      "INVALID_TIME_RANGE"
    );
  });

  it("paginates with search_after and a verified tiebreaker", async () => {
    const bodies: Record<string, unknown>[] = [];
    const pages = [
      [hit("a", "001", undefined, [1, "x1"]), hit("b", "001", undefined, [2, "x2"])],
      [hit("c", "002", undefined, [3, "x3"])],
    ];
    let i = 0;
    const r = await collectTenantAlerts(
      params(
        (_u, init) => {
          bodies.push(JSON.parse(init.body));
          return reply(pages[i++]);
        },
        { limits: { pageSize: 2 }, tiebreakerField: SYNTHETIC, verifiedTiebreakerFields: [SYNTHETIC] }
      )
    );
    assert.equal(r.status, "COMPLETE");
    assert.equal(r.pages, 2);
    assert.equal(r.events.length, 3);
    assert.equal(bodies[0].search_after, undefined);
    assert.deepEqual(bodies[1].search_after, [2, "x2"]);
  });

  it("is INCOMPLETE when a full page needs search_after without a verified tiebreaker", async () => {
    const r = await collectTenantAlerts(
      params(() => reply([hit("a", "001"), hit("b", "001")]), {
        limits: { pageSize: 2 },
      })
    );
    assert.equal(r.status, "INCOMPLETE");
    assert.equal(r.incompleteReason, "TIEBREAKER_NOT_VERIFIED");
  });

  it("is INCOMPLETE on missing or duplicated sort values", async () => {
    const opts = { limits: { pageSize: 2 }, tiebreakerField: SYNTHETIC, verifiedTiebreakerFields: [SYNTHETIC] };
    const missing = await collectTenantAlerts(
      params(() => reply([hit("a", "001"), hit("b", "001")]), opts)
    );
    assert.equal(missing.incompleteReason, "SORT_MISSING_OR_AMBIGUOUS");
    const dup = await collectTenantAlerts(
      params(
        () =>
          reply([
            hit("a", "001", undefined, [1, "x"]),
            hit("b", "001", undefined, [1, "x"]),
          ]),
        opts
      )
    );
    assert.equal(dup.status, "INCOMPLETE");
    assert.equal(dup.incompleteReason, "SORT_MISSING_OR_AMBIGUOUS");
  });

  it("is INCOMPLETE on a repeated cursor", async () => {
    const r = await collectTenantAlerts(
      params(
        () => reply([hit("a", "001", undefined, [1, "x"])]),
        { limits: { pageSize: 1, maxPages: 5 }, tiebreakerField: SYNTHETIC, verifiedTiebreakerFields: [SYNTHETIC] }
      )
    );
    assert.equal(r.status, "INCOMPLETE");
    assert.equal(r.incompleteReason, "REPEATED_CURSOR");
    assert.equal(r.pages, 2);
  });

  it("is INCOMPLETE when page or document limit is reached", async () => {
    let n = 0;
    const next = () =>
      reply([hit(`d${n}`, "001", undefined, [n++, "x"])]);
    const byPages = await collectTenantAlerts(
      params(next, {
        limits: { pageSize: 1, maxPages: 3, maxDocuments: 100 },
        tiebreakerField: SYNTHETIC, verifiedTiebreakerFields: [SYNTHETIC],
      })
    );
    assert.equal(byPages.status, "INCOMPLETE");
    assert.equal(byPages.incompleteReason, "LIMIT_REACHED");
    assert.equal(byPages.pages, 3);

    const byDocs = await collectTenantAlerts(
      params(next, {
        limits: { pageSize: 1, maxPages: 20, maxDocuments: 2 },
        tiebreakerField: SYNTHETIC, verifiedTiebreakerFields: [SYNTHETIC],
      })
    );
    assert.equal(byDocs.incompleteReason, "LIMIT_REACHED");
    assert.equal(byDocs.documentsRead, 2);
  });

  it("rejects a server that returns more hits than requested size", async () => {
    assert.equal(
      await code(
        collectTenantAlerts(
          params(() => reply([hit("a", "001"), hit("b", "001")]), {
            limits: { pageSize: 1 },
          })
        )
      ),
      "MALFORMED_RESPONSE"
    );
  });

  it("ships with no verified tiebreaker field", () => {
    assert.deepEqual([...VERIFIED_ALERT_TIEBREAKER_FIELDS], []);
  });

  it("rejects unsafe tiebreaker fields before building or fetching", async () => {
    const bad: unknown[] = [
      "agent.id",
      "AGENT.ID",
      "_id",
      "timestamp",
      "@timestamp",
      "",
      " ",
      "a.b",
      "a/b",
      "a*",
      "*",
      "a,b",
      "a b",
      'a"b',
      "a}",
      "a\nb",
      "_seq",
      "1seq",
      "x".repeat(65),
      42,
      null,
      { a: 1 },
    ];
    for (const field of bad) {
      assert.throws(
        () => assertSafeTiebreakerField(field),
        (e) => e instanceof SiemAlertQueryError && e.code === "INVALID_TIEBREAKER",
        String(field)
      );
      assert.throws(
        () =>
          buildAlertsSearchBody({
            agentIds: ["001"],
            range,
            pageSize: 10,
            tiebreakerField: field as string,
          }),
        (e) => e instanceof SiemAlertQueryError && e.code === "INVALID_TIEBREAKER"
      );
      let called = false;
      const c = await code(
        collectTenantAlerts(
          params(
            () => {
              called = true;
              return reply([]);
            },
            {
              tiebreakerField: field as string,
              verifiedTiebreakerFields: [String(field)],
            }
          )
        )
      );
      assert.equal(c, "INVALID_TIEBREAKER");
      assert.equal(called, false);
    }
  });

  it("does not treat a well-formed caller field as verified uniqueness", async () => {
    const r = await collectTenantAlerts(
      params(
        () =>
          reply([
            hit("a", "001", undefined, [1, "x1"]),
            hit("b", "001", undefined, [2, "x2"]),
          ]),
        { limits: { pageSize: 2 }, tiebreakerField: SYNTHETIC }
      )
    );
    assert.equal(r.status, "INCOMPLETE");
    assert.equal(r.incompleteReason, "TIEBREAKER_NOT_VERIFIED");
    assert.equal(r.pages, 1);
  });

  it("adds the synthetic field to the sort only after syntax validation", () => {
    const body = buildAlertsSearchBody({
      agentIds: ["001"],
      range,
      pageSize: 10,
      tiebreakerField: SYNTHETIC,
    });
    assert.deepEqual(body.sort, [
      { "@timestamp": { order: "asc" } },
      { [SYNTHETIC]: { order: "asc" } },
    ]);
  });
});
