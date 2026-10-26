import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveAuthorizedAlertAgents,
  type AlertsAuthorizationInput,
} from "./siem-alerts-authorization";

function input(
  overrides: Partial<AlertsAuthorizationInput> = {}
): AlertsAuthorizationInput {
  return {
    tenantId: "t1",
    tenant: { id: "t1", isActive: true },
    integration: {
      tenantId: "t1",
      type: "WAZUH",
      status: "ACTIVE",
      externalGroupId: "tenant-a",
    },
    manager: {
      originId: "cluster-1",
      groupExists: true,
      agents: [
        { id: "001", groups: ["tenant-a"] },
        { id: "002", groups: ["tenant-a"] },
      ],
    },
    indexer: { originId: "cluster-1" },
    otherTenantGroupIds: ["tenant-b"],
    ...overrides,
  };
}

function denied(i: AlertsAuthorizationInput) {
  const r = resolveAuthorizedAlertAgents(i);
  assert.equal(r.ok, false);
  return r.ok ? "" : r.reason;
}

describe("resolveAuthorizedAlertAgents", () => {
  it("authorizes proven group, preserving leading zeros", () => {
    const r = resolveAuthorizedAlertAgents(input());
    assert.ok(r.ok);
    assert.deepEqual([...r.agentIds], ["001", "002"]);
    assert.equal(r.tenantId, "t1");
  });

  it("denies inactive tenant / integration / wrong type / mismatch", () => {
    assert.equal(
      denied(input({ tenant: { id: "t1", isActive: false } })),
      "TENANT_INACTIVE"
    );
    const base = input().integration;
    assert.equal(
      denied(input({ integration: { ...base, status: "INACTIVE" } })),
      "INTEGRATION_INACTIVE"
    );
    assert.equal(
      denied(input({ integration: { ...base, type: "ZABBIX" } })),
      "INTEGRATION_NOT_WAZUH"
    );
    assert.equal(
      denied(input({ integration: { ...base, tenantId: "t2" } })),
      "TENANT_MISMATCH"
    );
    assert.equal(denied(input({ tenantId: "t2" })), "TENANT_MISMATCH");
  });

  it("denies missing/invalid/broad externalGroupId (no all-agents fallback)", () => {
    const base = input().integration;
    for (const g of [null, undefined, ""]) {
      assert.equal(
        denied(input({ integration: { ...base, externalGroupId: g } })),
        "MISSING_GROUP_ID"
      );
    }
    for (const g of [" a", "a b", "a/b", "a,b"]) {
      assert.equal(
        denied(input({ integration: { ...base, externalGroupId: g } })),
        "INVALID_GROUP_ID"
      );
    }
    for (const g of ["default", "ALL"]) {
      assert.equal(
        denied(input({ integration: { ...base, externalGroupId: g } })),
        "GROUP_TOO_BROAD"
      );
    }
  });

  it("denies group shared with another tenant", () => {
    assert.equal(
      denied(input({ otherTenantGroupIds: ["tenant-a"] })),
      "GROUP_SHARED_WITH_OTHER_TENANT"
    );
  });

  it("denies agent that also belongs to another tenant group", () => {
    const m = input().manager;
    assert.equal(
      denied(
        input({
          manager: {
            ...m,
            agents: [{ id: "001", groups: ["tenant-a", "tenant-b"] }],
          },
        })
      ),
      "GROUP_SHARED_WITH_OTHER_TENANT"
    );
  });

  it("denies unproven or mismatched origin", () => {
    const m = input().manager;
    assert.equal(
      denied(input({ manager: { ...m, originId: null } })),
      "ORIGIN_NOT_PROVEN"
    );
    assert.equal(
      denied(input({ indexer: { originId: "  " } })),
      "ORIGIN_NOT_PROVEN"
    );
    assert.equal(
      denied(input({ indexer: { originId: "cluster-2" } })),
      "ORIGIN_MISMATCH"
    );
  });

  it("denies unconfirmed group, empty agents, bad ids, unattested membership", () => {
    const m = input().manager;
    assert.equal(
      denied(input({ manager: { ...m, groupExists: false } })),
      "GROUP_NOT_PROVEN"
    );
    assert.equal(denied(input({ manager: { ...m, agents: [] } })), "NO_AGENTS");
    for (const id of ["000", "1", 1, "abc", "", null]) {
      assert.equal(
        denied(
          input({ manager: { ...m, agents: [{ id, groups: ["tenant-a"] }] } })
        ),
        "INVALID_AGENT_ID"
      );
    }
    // Lookup that ignored the group filter: agent not in the group.
    assert.equal(
      denied(
        input({
          manager: { ...m, agents: [{ id: "001", groups: ["other"] }] },
        })
      ),
      "GROUP_NOT_PROVEN"
    );
    assert.equal(
      denied(input({ manager: { ...m, agents: [{ id: "001" }] } })),
      "GROUP_NOT_PROVEN"
    );
  });

  it("denies too many agents", () => {
    const m = input().manager;
    const agents = Array.from({ length: 1001 }, (_, i) => ({
      id: String(i + 1).padStart(4, "0"),
      groups: ["tenant-a"],
    }));
    assert.equal(denied(input({ manager: { ...m, agents } })), "TOO_MANY_AGENTS");
  });
});
