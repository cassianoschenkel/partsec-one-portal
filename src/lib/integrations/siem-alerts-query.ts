/**
 * Bounded Wazuh Indexer alert query builder + collector (Phase 2B-1).
 *
 * Offline-friendly: no Prisma, env or global fetch. The HTTP function is
 * injected; TLS behavior is whatever the injected fetch/runtime does (this
 * module never touches `rejectUnauthorized` or NODE_TLS_REJECT_UNAUTHORIZED).
 * Persistence, sync logs, checkpoints and scheduling are out of scope (2B-2).
 * See docs/wazuh-alerts-query.md.
 */

import {
  normalizeSiemAlertHit,
  resolveAlertsIndexPattern,
  type SiemAlertEvent,
  type SiemAlertRejectReason,
} from "./siem-events-contract";
import {
  isValidWazuhAgentId,
  MAX_AUTHORIZED_AGENT_IDS,
  type AlertsAuthorizationResult,
} from "./siem-alerts-authorization";

/** Only these `_source` fields are ever requested from the Indexer. */
export const ALERT_SOURCE_FIELDS = [
  "timestamp",
  "@timestamp",
  "agent.id",
  "agent.name",
  "rule.id",
  "rule.level",
  "rule.description",
] as const;

/** Field used for the time range and primary sort. Mapping: verify in staging. */
export const ALERT_TIME_FIELD = "@timestamp";

/** Conservative defaults and server-enforced hard maximums. */
export const ALERT_QUERY_DEFAULTS = {
  pageSize: 200,
  maxPages: 5,
  maxDocuments: 1000,
  windowMs: 24 * 60 * 60 * 1000,
  timeoutMs: 15_000,
} as const;
export const ALERT_QUERY_HARD_LIMITS = {
  pageSize: 500,
  maxPages: 20,
  maxDocuments: 10_000,
  windowMs: 7 * 24 * 60 * 60 * 1000,
  timeoutMs: 60_000,
} as const;

export type AlertQueryLimits = {
  pageSize?: number;
  maxPages?: number;
  maxDocuments?: number;
  timeoutMs?: number;
};

export type AlertQueryErrorCode =
  | "NOT_AUTHORIZED"
  | "INVALID_INDEX_PATTERN"
  | "INVALID_TIME_RANGE"
  | "INVALID_LIMITS"
  | "INVALID_AGENT_IDS"
  | "INVALID_TIEBREAKER"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "HTTP_ERROR"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "MALFORMED_RESPONSE";

export class SiemAlertQueryError extends Error {
  constructor(
    readonly code: AlertQueryErrorCode,
    message: string
  ) {
    super(message);
    this.name = "SiemAlertQueryError";
  }
}

function validInt(value: number, max: number): boolean {
  return Number.isSafeInteger(value) && value >= 1 && value <= max;
}

export type ResolvedAlertLimits = Required<AlertQueryLimits>;

export function resolveAlertQueryLimits(
  limits: AlertQueryLimits = {}
): ResolvedAlertLimits {
  const resolved = {
    pageSize: limits.pageSize ?? ALERT_QUERY_DEFAULTS.pageSize,
    maxPages: limits.maxPages ?? ALERT_QUERY_DEFAULTS.maxPages,
    maxDocuments: limits.maxDocuments ?? ALERT_QUERY_DEFAULTS.maxDocuments,
    timeoutMs: limits.timeoutMs ?? ALERT_QUERY_DEFAULTS.timeoutMs,
  };
  for (const key of Object.keys(resolved) as (keyof ResolvedAlertLimits)[]) {
    if (!validInt(resolved[key], ALERT_QUERY_HARD_LIMITS[key])) {
      // Rejected, never silently clamped: the caller must know the real bound.
      throw new SiemAlertQueryError(
        "INVALID_LIMITS",
        `${key} must be an integer in 1..${ALERT_QUERY_HARD_LIMITS[key]}`
      );
    }
  }
  return resolved;
}

export type AlertTimeRange = { from: Date; to: Date };

export function assertValidTimeRange(range: AlertTimeRange): void {
  const { from, to } = range ?? {};
  if (
    !(from instanceof Date) ||
    !(to instanceof Date) ||
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime())
  ) {
    throw new SiemAlertQueryError("INVALID_TIME_RANGE", "from/to required");
  }
  const span = to.getTime() - from.getTime();
  if (span <= 0 || span > ALERT_QUERY_HARD_LIMITS.windowMs) {
    throw new SiemAlertQueryError(
      "INVALID_TIME_RANGE",
      "window must be > 0 and <= 7 days"
    );
  }
}

function assertAgentIds(agentIds: readonly string[]): void {
  if (
    !Array.isArray(agentIds) ||
    agentIds.length === 0 ||
    agentIds.length > MAX_AUTHORIZED_AGENT_IDS ||
    !agentIds.every(isValidWazuhAgentId)
  ) {
    throw new SiemAlertQueryError("INVALID_AGENT_IDS", "invalid agent id list");
  }
}

/**
 * Tiebreaker fields verified in a real Wazuh/Indexer environment to be
 * sortable AND unique per alert document. Intentionally EMPTY: no such field
 * has been verified, so multi-page collection stays unavailable (INCOMPLETE)
 * until a human validates one in staging and adds it here.
 */
export const VERIFIED_ALERT_TIEBREAKER_FIELDS: readonly string[] = [];

// Never usable as a uniqueness proof (not unique per alert, or sort-unsafe).
const FORBIDDEN_TIEBREAKER_FIELDS: ReadonlySet<string> = new Set([
  "agent.id",
  "_id",
  "timestamp",
  "@timestamp",
]);

// A single flat identifier: no dots (paths), wildcards, commas, spaces,
// quotes, brackets or any other character that could alter query structure.
const TIEBREAKER_FIELD_RE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

/**
 * Syntactic validation only. Passing it is NOT proof that the field exists,
 * is sortable or is unique; that requires membership in
 * `VERIFIED_ALERT_TIEBREAKER_FIELDS`.
 */
export function assertSafeTiebreakerField(
  field: unknown
): asserts field is string {
  if (
    typeof field !== "string" ||
    FORBIDDEN_TIEBREAKER_FIELDS.has(field.toLowerCase()) ||
    !TIEBREAKER_FIELD_RE.test(field)
  ) {
    throw new SiemAlertQueryError("INVALID_TIEBREAKER", "invalid tiebreakerField");
  }
}

export type AlertSearchBody = {
  size: number;
  _source: readonly string[];
  track_total_hits: false;
  query: { bool: { filter: unknown[] } };
  sort: Record<string, { order: "asc" }>[];
  search_after?: unknown[];
};

/**
 * Pure builder. Always carries a UTC time range AND a `terms` filter on
 * `agent.id`; throws otherwise. `tiebreakerField` must be a field a human
 * verified (staging) to be sortable and unique per document; there is no
 * default and `_id` is never assumed sortable.
 */
export function buildAlertsSearchBody(params: {
  agentIds: readonly string[];
  range: AlertTimeRange;
  pageSize: number;
  tiebreakerField?: string;
  searchAfter?: readonly unknown[];
}): AlertSearchBody {
  assertAgentIds(params.agentIds);
  assertValidTimeRange(params.range);
  if (!validInt(params.pageSize, ALERT_QUERY_HARD_LIMITS.pageSize)) {
    throw new SiemAlertQueryError("INVALID_LIMITS", "invalid pageSize");
  }

  const sort: AlertSearchBody["sort"] = [{ [ALERT_TIME_FIELD]: { order: "asc" } }];
  if (params.tiebreakerField !== undefined) {
    assertSafeTiebreakerField(params.tiebreakerField);
    sort.push({ [params.tiebreakerField]: { order: "asc" } });
  }

  const body: AlertSearchBody = {
    size: params.pageSize,
    _source: ALERT_SOURCE_FIELDS,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          {
            range: {
              [ALERT_TIME_FIELD]: {
                gte: params.range.from.toISOString(),
                lt: params.range.to.toISOString(),
                format: "strict_date_optional_time",
              },
            },
          },
          { terms: { "agent.id": [...params.agentIds] } },
        ],
      },
    },
    sort,
  };
  if (params.searchAfter) body.search_after = [...params.searchAfter];
  return body;
}

/** Event that passed normalization AND local agent-allowlist revalidation. */
export type AuthorizedSiemAlertEvent = SiemAlertEvent & {
  displayAuthorization: "AUTHORIZED_BY_AGENT_ALLOWLIST";
  tenantId: string;
};

export type AlertCollectionIncompleteReason =
  | "LIMIT_REACHED"
  | "TIEBREAKER_NOT_VERIFIED"
  | "SORT_MISSING_OR_AMBIGUOUS"
  | "REPEATED_CURSOR";

export type AlertCollectionResult = {
  /**
   * COMPLETE: every page in the window was read. INCOMPLETE: results may be
   * partial; callers MUST NOT advance any checkpoint on INCOMPLETE.
   */
  status: "COMPLETE" | "INCOMPLETE";
  incompleteReason?: AlertCollectionIncompleteReason;
  events: AuthorizedSiemAlertEvent[];
  pages: number;
  documentsRead: number;
  rejected: {
    total: number;
    unauthorizedAgent: number;
    outOfWindow: number;
    byReason: Partial<Record<SiemAlertRejectReason, number>>;
  };
};

export type AlertsFetch = (
  url: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export type CollectTenantAlertsParams = {
  fetch: AlertsFetch;
  /** Indexer base URL. Credentials are used only for the Authorization header. */
  baseUrl: string;
  username: string;
  password: string;
  /** Result of `resolveAuthorizedAlertAgents`; a denied result throws. */
  authorization: AlertsAuthorizationResult;
  range: AlertTimeRange;
  /** Decrypted tenant `indexer_alerts_index`, if configured. Validated here. */
  configuredIndexPattern?: unknown;
  limits?: AlertQueryLimits;
  /**
   * Candidate unique + sortable field. Syntax-validated, and only honored when
   * it is in `verifiedTiebreakerFields`; otherwise multi-page collection is
   * INCOMPLETE (TIEBREAKER_NOT_VERIFIED).
   */
  tiebreakerField?: string;
  /** Defaults to `VERIFIED_ALERT_TIEBREAKER_FIELDS` (empty). Tests may inject. */
  verifiedTiebreakerFields?: readonly string[];
};

function indexPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, (c) =>
    c === "*" ? ".*" : `\\${c}`
  );
  return new RegExp(`^${escaped}$`);
}

function throwForStatus(status: number): never {
  if (status === 401) throw new SiemAlertQueryError("UNAUTHORIZED", "HTTP 401");
  if (status === 403) throw new SiemAlertQueryError("FORBIDDEN", "HTTP 403");
  if (status === 429) throw new SiemAlertQueryError("RATE_LIMITED", "HTTP 429");
  if (status >= 500) {
    throw new SiemAlertQueryError("SERVER_ERROR", `HTTP ${status}`);
  }
  throw new SiemAlertQueryError("HTTP_ERROR", `HTTP ${status}`);
}

async function searchPage(
  p: CollectTenantAlertsParams,
  index: string,
  body: AlertSearchBody,
  timeoutMs: number
): Promise<unknown[]> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const auth = Buffer.from(`${p.username}:${p.password}`).toString("base64");
    const response = await p.fetch(
      `${p.baseUrl.replace(/\/$/, "")}/${index}/_search`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );
    if (!response.ok) throwForStatus(response.status);
    const payload = (await response.json()) as {
      hits?: { hits?: unknown };
    } | null;
    const hits = payload?.hits?.hits;
    if (!Array.isArray(hits)) {
      throw new SiemAlertQueryError("MALFORMED_RESPONSE", "hits.hits missing");
    }
    return hits;
  } catch (error) {
    if (error instanceof SiemAlertQueryError) throw error;
    if (timedOut) throw new SiemAlertQueryError("TIMEOUT", "request timed out");
    // Never include the underlying message: it could echo URLs/credentials.
    throw new SiemAlertQueryError("NETWORK_ERROR", "request failed");
  } finally {
    clearTimeout(timer);
  }
}

function sortKey(hit: unknown, expectedLength: number): string | null {
  const sort = (hit as { sort?: unknown } | null)?.sort;
  if (
    !Array.isArray(sort) ||
    sort.length !== expectedLength ||
    sort.some((v) => v === null || v === undefined)
  ) {
    return null;
  }
  return JSON.stringify(sort);
}

/**
 * Collects alerts for ONE authorized tenant scope. Throws (before any
 * network call) if authorization is not `ok`. Every returned hit has been
 * re-validated locally against the allowlist, the index pattern and the
 * requested window; hits without an agent are rejected by the normalizer.
 */
export async function collectTenantAlerts(
  p: CollectTenantAlertsParams
): Promise<AlertCollectionResult> {
  if (!p.authorization?.ok) {
    throw new SiemAlertQueryError(
      "NOT_AUTHORIZED",
      p.authorization ? p.authorization.reason : "authorization missing"
    );
  }
  const { agentIds, tenantId } = p.authorization;

  const pattern = resolveAlertsIndexPattern(p.configuredIndexPattern);
  if (!pattern.ok) {
    throw new SiemAlertQueryError("INVALID_INDEX_PATTERN", pattern.reason);
  }
  assertValidTimeRange(p.range);
  const limits = resolveAlertQueryLimits(p.limits);

  const allowed = new Set(agentIds);
  const indexRe = indexPatternToRegExp(pattern.pattern);
  const fromMs = p.range.from.getTime();
  const toMs = p.range.to.getTime();
  if (p.tiebreakerField !== undefined) {
    assertSafeTiebreakerField(p.tiebreakerField);
  }
  const verified = p.verifiedTiebreakerFields ?? VERIFIED_ALERT_TIEBREAKER_FIELDS;
  const tiebreakerField =
    p.tiebreakerField !== undefined && verified.includes(p.tiebreakerField)
      ? p.tiebreakerField
      : undefined;
  const sortLength = tiebreakerField ? 2 : 1;

  const result: AlertCollectionResult = {
    status: "COMPLETE",
    events: [],
    pages: 0,
    documentsRead: 0,
    rejected: { total: 0, unauthorizedAgent: 0, outOfWindow: 0, byReason: {} },
  };
  const seenCursors = new Set<string>();
  const seenDocs = new Set<string>();
  let searchAfter: unknown[] | undefined;

  const incomplete = (reason: AlertCollectionIncompleteReason) => {
    result.status = "INCOMPLETE";
    result.incompleteReason = reason;
    return result;
  };

  while (true) {
    const remaining = limits.maxDocuments - result.documentsRead;
    const body = buildAlertsSearchBody({
      agentIds,
      range: p.range,
      pageSize: Math.min(limits.pageSize, remaining),
      tiebreakerField,
      searchAfter,
    });
    const hits = await searchPage(p, pattern.pattern, body, limits.timeoutMs);
    result.pages += 1;
    result.documentsRead += hits.length;

    // Never trust the server to honor `size`.
    if (hits.length > body.size) {
      throw new SiemAlertQueryError("MALFORMED_RESPONSE", "page exceeds size");
    }

    for (const hit of hits) {
      const normalized = normalizeSiemAlertHit(hit);
      if (!normalized.ok) {
        result.rejected.total += 1;
        result.rejected.byReason[normalized.reason] =
          (result.rejected.byReason[normalized.reason] ?? 0) + 1;
        continue;
      }
      const { event } = normalized;
      // Explicit local revalidation; `displayAuthorization` is NOT simply
      // overwritten. Exact string compare keeps leading zeros significant.
      if (!allowed.has(event.wazuhAgentId)) {
        result.rejected.total += 1;
        result.rejected.unauthorizedAgent += 1;
        continue;
      }
      const t = event.occurredAt.getTime();
      if (
        !indexRe.test(event.indexName) ||
        t < fromMs ||
        t >= toMs
      ) {
        result.rejected.total += 1;
        result.rejected.outOfWindow += 1;
        continue;
      }
      const docKey = `${event.indexName}\u0000${event.documentId}`;
      if (seenDocs.has(docKey)) continue; // duplicate across pages
      seenDocs.add(docKey);
      result.events.push({
        ...event,
        displayAuthorization: "AUTHORIZED_BY_AGENT_ALLOWLIST",
        tenantId,
      });
    }

    // Short page => window exhausted (only when the page was not truncated by
    // our own remaining-document budget).
    if (hits.length < body.size) return result;

    // Page was full: more data may exist. Decide whether we may continue.
    if (
      result.pages >= limits.maxPages ||
      result.documentsRead >= limits.maxDocuments
    ) {
      return incomplete("LIMIT_REACHED");
    }
    if (!tiebreakerField) {
      // search_after without a verified unique tiebreaker can skip documents
      // sharing the boundary sort value; refuse rather than risk silent loss.
      return incomplete("TIEBREAKER_NOT_VERIFIED");
    }

    const keys = hits.map((h) => sortKey(h, sortLength));
    if (keys.some((k) => k === null) || new Set(keys).size !== keys.length) {
      return incomplete("SORT_MISSING_OR_AMBIGUOUS");
    }
    const lastHit = hits[hits.length - 1] as { sort: unknown[] };
    const cursor = JSON.stringify(lastHit.sort);
    if (seenCursors.has(cursor)) return incomplete("REPEATED_CURSOR");
    seenCursors.add(cursor);
    searchAfter = lastHit.sort;
  }
}
