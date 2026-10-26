/**
 * Fail-closed authorization of the agent allowlist used to query Wazuh
 * Indexer alerts (Phase 2B-1, pure/offline: no Prisma, env, fetch or network).
 *
 * The allowlist is derived ONLY from evidence the caller gathered server-side
 * (Manager group lookup + origin identity + tenant/integration state). It is
 * never built from a browser-supplied list of agent ids, from `agent.name`,
 * nor from `SiemAgentSnapshot` alone.
 *
 * Unlike `SiemClient.getAgents(group?)`, a missing group NEVER means "all
 * agents": every uncertainty yields `{ ok: false }` and no Indexer query.
 */

export type AlertsAuthorizationDenyReason =
  | "TENANT_INACTIVE"
  | "INTEGRATION_NOT_WAZUH"
  | "INTEGRATION_INACTIVE"
  | "TENANT_MISMATCH"
  | "MISSING_GROUP_ID"
  | "INVALID_GROUP_ID"
  | "GROUP_TOO_BROAD"
  | "GROUP_NOT_PROVEN"
  | "GROUP_SHARED_WITH_OTHER_TENANT"
  | "ORIGIN_NOT_PROVEN"
  | "ORIGIN_MISMATCH"
  | "NO_AGENTS"
  | "INVALID_AGENT_ID"
  | "TOO_MANY_AGENTS";

export type ManagerGroupAgent = {
  id: unknown;
  /** Group names reported by the Manager for this agent. */
  groups?: unknown;
};

export type AlertsAuthorizationInput = {
  /** Tenant that the caller (derived from session, not from the client) acts for. */
  tenantId: string;
  tenant: { id: string; isActive: boolean };
  integration: {
    tenantId: string;
    type: string;
    status: string;
    externalGroupId: string | null | undefined;
  };
  manager: {
    /**
     * Cluster/origin identity reported by the Manager API the group lookup
     * was run against. Must be non-empty and equal to `indexer.originId`.
     */
    originId: string | null | undefined;
    /** True only if the Manager confirmed the group exists. */
    groupExists: boolean;
    /** Result of the Manager lookup WITH the group filter applied. */
    agents: ManagerGroupAgent[];
  };
  indexer: {
    /** Cluster/origin identity of the Indexer that will be queried. */
    originId: string | null | undefined;
  };
  /** `externalGroupId` of every OTHER active Wazuh integration. */
  otherTenantGroupIds: readonly string[];
};

export type AlertsAuthorizationResult =
  | {
      ok: true;
      tenantId: string;
      groupId: string;
      originId: string;
      /** Sorted, de-duplicated agent ids (strings, leading zeros preserved). */
      agentIds: readonly string[];
    }
  | { ok: false; reason: AlertsAuthorizationDenyReason; detail: string };

/** Hard cap so a `terms` filter can never grow unbounded. */
export const MAX_AUTHORIZED_AGENT_IDS = 1000;

const GROUP_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
/** Groups that, in Wazuh, match every/most agents; never tenant-specific. */
const BROAD_GROUPS = new Set(["default", "all", "*"]);
/** Wazuh ids are zero-padded numerics ("001"). "000" is the manager itself. */
const AGENT_ID_RE = /^\d{3,10}$/;
const MANAGER_AGENT_ID = "000";

function deny(
  reason: AlertsAuthorizationDenyReason,
  detail: string
): AlertsAuthorizationResult {
  return { ok: false, reason, detail };
}

export function isValidWazuhAgentId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    AGENT_ID_RE.test(value) &&
    value !== MANAGER_AGENT_ID
  );
}

export function resolveAuthorizedAlertAgents(
  input: AlertsAuthorizationInput
): AlertsAuthorizationResult {
  const { tenant, integration, manager, indexer } = input;

  if (!tenant.isActive) return deny("TENANT_INACTIVE", "tenant inactive");
  if (
    !input.tenantId ||
    tenant.id !== input.tenantId ||
    integration.tenantId !== input.tenantId
  ) {
    return deny("TENANT_MISMATCH", "tenant/integration/actor mismatch");
  }
  if (integration.type !== "WAZUH") {
    return deny("INTEGRATION_NOT_WAZUH", "integration is not WAZUH");
  }
  if (integration.status !== "ACTIVE") {
    return deny("INTEGRATION_INACTIVE", "integration not ACTIVE");
  }

  const rawGroup = integration.externalGroupId;
  if (typeof rawGroup !== "string" || rawGroup === "") {
    return deny("MISSING_GROUP_ID", "externalGroupId not configured");
  }
  if (rawGroup !== rawGroup.trim() || !GROUP_ID_RE.test(rawGroup)) {
    return deny("INVALID_GROUP_ID", "externalGroupId has invalid format");
  }
  if (BROAD_GROUPS.has(rawGroup.toLowerCase())) {
    return deny("GROUP_TOO_BROAD", "group matches agents of other tenants");
  }
  if (input.otherTenantGroupIds.includes(rawGroup)) {
    return deny(
      "GROUP_SHARED_WITH_OTHER_TENANT",
      "group also configured for another integration"
    );
  }

  const managerOrigin = manager.originId?.trim();
  const indexerOrigin = indexer.originId?.trim();
  if (!managerOrigin || !indexerOrigin) {
    return deny("ORIGIN_NOT_PROVEN", "manager/indexer origin id unavailable");
  }
  if (managerOrigin !== indexerOrigin) {
    return deny("ORIGIN_MISMATCH", "manager and indexer origins differ");
  }

  if (manager.groupExists !== true) {
    return deny("GROUP_NOT_PROVEN", "manager did not confirm the group");
  }
  if (manager.agents.length === 0) {
    return deny("NO_AGENTS", "group has no agents");
  }
  if (manager.agents.length > MAX_AUTHORIZED_AGENT_IDS) {
    return deny("TOO_MANY_AGENTS", "agent count exceeds server limit");
  }

  const ids = new Set<string>();
  for (const agent of manager.agents) {
    if (!isValidWazuhAgentId(agent.id)) {
      return deny("INVALID_AGENT_ID", "manager returned an invalid agent id");
    }
    // The Manager must itself attest group membership: a lookup that ignored
    // the group filter would otherwise authorize every agent.
    const groups = agent.groups;
    if (!Array.isArray(groups) || !groups.includes(rawGroup)) {
      return deny("GROUP_NOT_PROVEN", "agent membership in group not attested");
    }
    // Agent also in another tenant's group => ambiguous ownership.
    if (
      groups.some(
        (g) => typeof g === "string" && input.otherTenantGroupIds.includes(g)
      )
    ) {
      return deny(
        "GROUP_SHARED_WITH_OTHER_TENANT",
        "agent belongs to another tenant group"
      );
    }
    ids.add(agent.id);
  }

  return {
    ok: true,
    tenantId: input.tenantId,
    groupId: rawGroup,
    originId: managerOrigin,
    agentIds: Object.freeze([...ids].sort()),
  };
}
