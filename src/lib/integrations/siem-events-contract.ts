/**
 * Wazuh Indexer alert document contract (Phase 1, pure/offline).
 *
 * No Prisma, env, credentials, fetch or network access here. See
 * docs/wazuh-events.md for the rules this module implements.
 *
 * IMPORTANT: normalizing a document does NOT authorize showing it to a
 * tenant. Tenant isolation (allowlist of authorized agent ids) is enforced in
 * a later phase and must never be inferred from `agent.name`.
 */

export const DEFAULT_ALERTS_INDEX_PATTERN = "wazuh-alerts-*";

/** Credential/config key reserved for a future per-tenant override. */
export const ALERTS_INDEX_CREDENTIAL_KEY = "indexer_alerts_index";

export type SiemAlertEvent = {
  /** `_index` of the Indexer hit. */
  indexName: string;
  /** `_id` of the Indexer hit. (indexName, documentId) is the future key. */
  documentId: string;
  /** Always a valid Date (UTC instant). */
  occurredAt: Date;
  /** `agent.id` as string; leading zeros preserved ("001"). */
  wazuhAgentId: string;
  agentName?: string;
  ruleId: string;
  /** Native Wazuh level (non-negative integer); NOT remapped to Zabbix 0-5. */
  ruleLevel: number;
  ruleDescription: string;
};

export type SiemAlertRejectReason =
  | "NOT_AN_OBJECT"
  | "INVALID_INDEX_NAME"
  | "INVALID_DOCUMENT_ID"
  | "MISSING_SOURCE"
  | "MISSING_AGENT_ID"
  | "INVALID_AGENT_ID"
  | "INVALID_AGENT_NAME"
  | "MISSING_TIMESTAMP"
  | "INVALID_TIMESTAMP"
  | "INVALID_RULE_ID"
  | "INVALID_RULE_LEVEL"
  | "INVALID_RULE_DESCRIPTION";

export type SiemAlertNormalizationResult =
  | {
      ok: true;
      event: SiemAlertEvent;
      /**
       * Constant marker: the normalizer never authorizes tenant display.
       * Phase 2 must check `wazuhAgentId` against the tenant allowlist.
       */
      displayAuthorization: "NOT_AUTHORIZED";
    }
  | { ok: false; reason: SiemAlertRejectReason; detail: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

const TIMESTAMP_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}(?::?\d{2})?)$/;

/**
 * Strictly parses ISO-8601 timestamps with an explicit zone: `Z`, `+0000`,
 * `-0300`, `+03:00` or `+03`. Zone-less or malformed values return null
 * (no guessing of local time).
 */
export function parseWazuhTimestamp(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const m = TIMESTAMP_RE.exec(value.trim());
  if (!m) return null;

  const [year, month, day, hour, minute, second] = m
    .slice(1, 7)
    .map((part) => Number(part));
  const millis = m[7] ? Number(m[7].slice(0, 3).padEnd(3, "0")) : 0;

  let offsetMinutes = 0;
  const zone = m[8];
  if (zone !== "Z") {
    const digits = zone.slice(1).replace(":", "");
    const oh = Number(digits.slice(0, 2));
    const om = digits.length > 2 ? Number(digits.slice(2, 4)) : 0;
    if (oh > 23 || om > 59) return null;
    offsetMinutes = (zone[0] === "-" ? -1 : 1) * (oh * 60 + om);
  }

  const utc = Date.UTC(year, month - 1, day, hour, minute, second, millis);
  const check = new Date(utc);
  // Reject overflowing components such as month 13 or Feb 30 / hour 24.
  if (
    Number.isNaN(utc) ||
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute ||
    check.getUTCSeconds() !== second
  ) {
    return null;
  }

  const result = new Date(utc - offsetMinutes * 60_000);
  return Number.isNaN(result.getTime()) ? null : result;
}

function parseRuleLevel(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value === "string" && /^\d{1,9}$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

function reject(
  reason: SiemAlertRejectReason,
  detail: string
): SiemAlertNormalizationResult {
  return { ok: false, reason, detail };
}

/**
 * Normalizes one Indexer search hit (`{ _index, _id, _source }`).
 *
 * Timestamp rule: `_source.timestamp` takes priority; `_source.@timestamp` is
 * used only when `timestamp` is absent (undefined/null). If `timestamp` is
 * present but invalid, the document is rejected rather than falling back.
 *
 * Only approved fields are copied; `full_log`, `data`, `previous_output`,
 * `rawData` and the whole `_source` are never carried into the output.
 */
export function normalizeSiemAlertHit(
  hit: unknown
): SiemAlertNormalizationResult {
  if (!isRecord(hit)) return reject("NOT_AN_OBJECT", "hit is not an object");

  const indexName = nonEmptyString(hit._index);
  if (!indexName) return reject("INVALID_INDEX_NAME", "_index missing");

  const documentId = nonEmptyString(hit._id);
  if (!documentId) return reject("INVALID_DOCUMENT_ID", "_id missing");

  const source = hit._source;
  if (!isRecord(source)) return reject("MISSING_SOURCE", "_source missing");

  const rawTimestamp = source.timestamp ?? source["@timestamp"];
  if (rawTimestamp === undefined || rawTimestamp === null) {
    return reject("MISSING_TIMESTAMP", "no timestamp or @timestamp");
  }
  const occurredAt = parseWazuhTimestamp(rawTimestamp);
  if (!occurredAt) return reject("INVALID_TIMESTAMP", "unparseable timestamp");

  const agent = source.agent;
  if (agent === undefined || agent === null) {
    return reject("MISSING_AGENT_ID", "agent absent");
  }
  if (!isRecord(agent)) return reject("INVALID_AGENT_ID", "agent malformed");
  if (agent.id === undefined || agent.id === null) {
    return reject("MISSING_AGENT_ID", "agent.id absent");
  }
  // Must be a string: a number would already have lost leading zeros.
  const wazuhAgentId = nonEmptyString(agent.id);
  if (!wazuhAgentId) return reject("INVALID_AGENT_ID", "agent.id not a string");

  let agentName: string | undefined;
  if (agent.name !== undefined && agent.name !== null) {
    if (typeof agent.name !== "string") {
      return reject("INVALID_AGENT_NAME", "agent.name not a string");
    }
    agentName = agent.name.trim() || undefined;
  }

  const rule = source.rule;
  if (!isRecord(rule)) return reject("INVALID_RULE_ID", "rule missing");

  const ruleId =
    typeof rule.id === "number" && Number.isSafeInteger(rule.id) && rule.id >= 0
      ? String(rule.id)
      : nonEmptyString(rule.id);
  if (!ruleId) return reject("INVALID_RULE_ID", "rule.id invalid");

  const ruleLevel = parseRuleLevel(rule.level);
  if (ruleLevel === null) {
    return reject("INVALID_RULE_LEVEL", "rule.level not a non-negative integer");
  }

  const ruleDescription = nonEmptyString(rule.description);
  if (!ruleDescription) {
    return reject("INVALID_RULE_DESCRIPTION", "rule.description invalid");
  }

  const event: SiemAlertEvent = {
    indexName,
    documentId,
    occurredAt,
    wazuhAgentId,
    ...(agentName ? { agentName } : {}),
    ruleId,
    ruleLevel,
    ruleDescription,
  };

  return { ok: true, event, displayAuthorization: "NOT_AUTHORIZED" };
}

export type AlertsIndexPatternResult =
  | { ok: true; pattern: string; source: "tenant" | "fallback" }
  | { ok: false; reason: string };

const MIN_PATTERN_PREFIX_LENGTH = 8;
const REQUIRED_PATTERN_PREFIX = "wazuh-alerts-";
const SAFE_PATTERN_RE = /^[a-z0-9][a-z0-9._-]*\*?$/;

/**
 * Validates an alerts index pattern. Accepts only lowercase
 * `[a-z0-9._-]`, at most one `*` and only as the final character, a base
 * of at least 8 characters starting with the exact prefix "wazuh-alerts-"
 * (fail-closed; custom prefixes need a separately reviewed change), and
 * never "archives".
 * Rejects (does not sanitize) anything else, e.g. `*`, paths, URLs,
 * commas, `..`, `?`, `#`, `%`, `:` and whitespace.
 */
export function validateAlertsIndexPattern(
  value: unknown
): AlertsIndexPatternResult {
  if (typeof value !== "string") {
    return { ok: false, reason: "index pattern must be a string" };
  }
  if (value === "" || value !== value.trim()) {
    return { ok: false, reason: "index pattern empty or has whitespace" };
  }
  if (value.includes("..")) {
    return { ok: false, reason: "index pattern contains '..'" };
  }
  if (!SAFE_PATTERN_RE.test(value)) {
    return { ok: false, reason: "index pattern has unsafe characters" };
  }
  const base = value.endsWith("*") ? value.slice(0, -1) : value;
  if (base.length < MIN_PATTERN_PREFIX_LENGTH) {
    return { ok: false, reason: "index pattern is too broad" };
  }
  if (base.includes("archives")) {
    return { ok: false, reason: "archives indices are out of scope" };
  }
  if (!base.startsWith(REQUIRED_PATTERN_PREFIX)) {
    return {
      ok: false,
      reason: `index pattern must start with "${REQUIRED_PATTERN_PREFIX}"`,
    };
  }
  return { ok: true, pattern: value, source: "tenant" };
}

/**
 * Resolves the alerts index pattern. `undefined`/`null` (not configured) →
 * fallback. Any other value, including an empty or blank string, is
 * validated and rejected if invalid — never silently replaced by fallback.
 */
export function resolveAlertsIndexPattern(
  configured?: unknown
): AlertsIndexPatternResult {
  if (configured === undefined || configured === null) {
    return { ok: true, pattern: DEFAULT_ALERTS_INDEX_PATTERN, source: "fallback" };
  }
  return validateAlertsIndexPattern(configured);
}
