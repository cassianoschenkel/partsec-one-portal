/**
 * Offline orchestration for idempotent Wazuh event persistence (Phase 2B-2A).
 *
 * No Prisma, env, credentials, fetch or Wazuh client is imported here: every
 * side effect goes through the injected `SiemEventsStore` port. Nothing in
 * this module is wired to a route, Server Action, CLI, job or scheduler, and
 * it must not be (see docs/wazuh-events-persistence.md).
 *
 * The `AlertCollectionResult` and `ctx` are treated as UNTRUSTED input: the
 * TypeScript types are not evidence, so everything is revalidated at runtime
 * before the first write. No checkpoint is read or advanced, and nothing is
 * ever deleted.
 */

import type {
  AlertCollectionResult,
  AuthorizedSiemAlertEvent,
} from "../integrations/siem-alerts-query";
import {
  ALERT_QUERY_DEFAULTS,
  ALERT_QUERY_HARD_LIMITS,
} from "../integrations/siem-alerts-query";
import { isValidWazuhAgentId } from "../integrations/siem-alerts-authorization";

export const SIEM_EVENTS_UPSERT_BATCH_DEFAULT = 100;
export const SIEM_EVENTS_UPSERT_BATCH_MAX = 500;

const MAX_ID_LENGTH = 512;
const MAX_AGENT_NAME_LENGTH = 256;
const MAX_RULE_ID_LENGTH = 64;
const MAX_RULE_DESCRIPTION_LENGTH = 2048;
// Same prefix rule as the contract; "archives" is out of scope.
const INDEX_NAME_RE = /^wazuh-alerts-[a-z0-9._-]+$/;

export type SiemEventsPersistenceErrorCode =
  | "INVALID_CONTEXT"
  | "INVALID_LIMITS"
  | "INVALID_COLLECTION"
  | "COLLECTION_INCOMPLETE"
  | "COLLECTION_HAS_REJECTIONS"
  | "COLLECTION_AT_LIMIT"
  | "INCONSISTENT_COUNTS"
  | "TENANT_MISMATCH"
  | "NOT_AUTHORIZED"
  | "INVALID_EVENT"
  | "DUPLICATE_EVENT"
  | "SYNC_LOG_START_FAILED"
  | "WRITE_FAILED"
  | "SYNC_LOG_FINISH_FAILED";

/** Messages never carry URLs, payloads, credentials or index/document ids. */
export class SiemEventsPersistenceError extends Error {
  constructor(
    readonly code: SiemEventsPersistenceErrorCode,
    message: string,
    readonly details: { persistedBeforeFailure?: number } = {}
  ) {
    super(message);
    this.name = "SiemEventsPersistenceError";
  }
}

/** Server-resolved tenant scope. Never built from client input. */
export type SiemEventsTenantContext = {
  tenantId: string;
  /** Agent ids the server authorized for this tenant (same used to query). */
  authorizedAgentIds: readonly string[];
  /** Max events accepted in one batch. Defaults to the 2B-1 default. */
  maxEvents?: number;
  /** Rows per store call; writes are sequential. */
  upsertBatchSize?: number;
};

/** The only columns ever written to `SiemEventSnapshot`. */
export type SiemEventRow = {
  tenantId: string;
  indexName: string;
  documentId: string;
  occurredAt: Date;
  wazuhAgentId: string;
  agentName: string | null;
  ruleId: string;
  ruleLevel: number;
  ruleDescription: string;
  syncedAt: Date;
};

export type SiemEventsSyncLogStart = {
  tenantId: string;
  integrationType: "WAZUH";
  syncKind: "SIEM_EVENTS";
  status: "RUNNING";
  startedAt: Date;
  message: string;
};

export type SiemEventsSyncLogFinish = {
  status: "SUCCESS" | "ERROR";
  finishedAt: Date;
  durationMs: number;
  message: string;
};

/**
 * Write port. A real adapter (2B-2B) MUST:
 *  - upsert by `tenantId_indexName_documentId`, writing only `SiemEventRow`;
 *  - never call `deleteMany`/`delete`;
 *  - scope `finishSyncLog` by id (and tenant).
 * Transactionality is the adapter's responsibility; this orchestrator does
 * NOT provide it (see docs).
 */
export interface SiemEventsStore {
  createSyncLog(data: SiemEventsSyncLogStart): Promise<{ id: string }>;
  upsertEvents(rows: readonly SiemEventRow[]): Promise<void>;
  finishSyncLog(id: string, data: SiemEventsSyncLogFinish): Promise<void>;
}

export type SiemEventsPersistenceSummary = {
  tenantId: string;
  received: number;
  persisted: number;
  batches: number;
  durationMs: number;
};

/**
 * Contract only (not implemented): checkpoints advance in a dedicated phase,
 * and only after `persistSiemAlertEvents` resolved for a COMPLETE batch.
 */
export interface SiemEventsCheckpointPort {
  advance(tenantId: string, windowEnd: Date): Promise<void>;
}

function fail(
  code: SiemEventsPersistenceErrorCode,
  message: string
): never {
  throw new SiemEventsPersistenceError(code, message);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function boundedString(v: unknown, max: number): v is string {
  return typeof v === "string" && v.trim() !== "" && v.length <= max;
}

function nonNegInt(v: unknown): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}

function resolveBatchSettings(ctx: SiemEventsTenantContext) {
  const maxEvents = ctx.maxEvents ?? ALERT_QUERY_DEFAULTS.maxDocuments;
  const batchSize = ctx.upsertBatchSize ?? SIEM_EVENTS_UPSERT_BATCH_DEFAULT;
  if (
    !Number.isSafeInteger(maxEvents) ||
    maxEvents < 1 ||
    maxEvents > ALERT_QUERY_HARD_LIMITS.maxDocuments ||
    !Number.isSafeInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > SIEM_EVENTS_UPSERT_BATCH_MAX
  ) {
    fail("INVALID_LIMITS", "maxEvents/upsertBatchSize out of bounds");
  }
  return { maxEvents, batchSize };
}

/**
 * Pure, synchronous, fail-closed validation. Returns the exact rows that may
 * be written (approved columns only, no extra keys carried over) or throws.
 * Performs no I/O.
 */
export function validateSiemEventsBatch(
  collection: AlertCollectionResult,
  ctx: SiemEventsTenantContext,
  syncedAt: Date
): { rows: SiemEventRow[]; maxEvents: number; batchSize: number } {
  if (
    !isPlainObject(ctx) ||
    !boundedString(ctx.tenantId, MAX_ID_LENGTH) ||
    !Array.isArray(ctx.authorizedAgentIds) ||
    ctx.authorizedAgentIds.length === 0 ||
    !ctx.authorizedAgentIds.every(isValidWazuhAgentId)
  ) {
    fail("INVALID_CONTEXT", "tenant context invalid");
  }
  const { maxEvents, batchSize } = resolveBatchSettings(ctx);
  const allowed = new Set(ctx.authorizedAgentIds);

  if (!isPlainObject(collection)) fail("INVALID_COLLECTION", "collection invalid");
  if (collection.status !== "COMPLETE") {
    fail("COLLECTION_INCOMPLETE", "collection is not COMPLETE");
  }
  if (collection.incompleteReason !== undefined) {
    fail("COLLECTION_INCOMPLETE", "COMPLETE collection carries incompleteReason");
  }
  const rejected = collection.rejected;
  if (
    !isPlainObject(rejected) ||
    !nonNegInt(rejected.total) ||
    !nonNegInt(rejected.unauthorizedAgent) ||
    !nonNegInt(rejected.outOfWindow)
  ) {
    fail("INVALID_COLLECTION", "rejected counters invalid");
  }
  if (
    rejected.total !== 0 ||
    rejected.unauthorizedAgent !== 0 ||
    rejected.outOfWindow !== 0
  ) {
    fail("COLLECTION_HAS_REJECTIONS", "collection discarded documents");
  }
  const byReason = rejected.byReason;
  if (
    !isPlainObject(byReason) ||
    Object.values(byReason).some((n) => n !== 0 && n !== undefined)
  ) {
    fail("COLLECTION_HAS_REJECTIONS", "collection has rejection reasons");
  }
  if (!Array.isArray(collection.events)) {
    fail("INVALID_COLLECTION", "events is not an array");
  }
  if (!nonNegInt(collection.pages) || !nonNegInt(collection.documentsRead)) {
    fail("INVALID_COLLECTION", "pages/documentsRead invalid");
  }
  const events = collection.events as readonly unknown[];
  // Duplicates across pages are dropped by the collector, so documentsRead may
  // exceed events.length, but never the reverse.
  if (collection.documentsRead < events.length) {
    fail("INCONSISTENT_COUNTS", "documentsRead < events");
  }
  if (events.length > maxEvents) {
    fail("COLLECTION_AT_LIMIT", "events exceed maxEvents");
  }
  // A COMPLETE collection that read as many documents as the cap is
  // indistinguishable from a truncated one: refuse.
  if (collection.documentsRead >= maxEvents) {
    fail("COLLECTION_AT_LIMIT", "documentsRead reached maxEvents");
  }
  if (events.length === 0 && collection.pages < 1) {
    fail("INCONSISTENT_COUNTS", "no pages for an empty COMPLETE collection");
  }

  if (!(syncedAt instanceof Date) || Number.isNaN(syncedAt.getTime())) {
    fail("INVALID_CONTEXT", "syncedAt invalid");
  }

  const seen = new Set<string>();
  const rows: SiemEventRow[] = [];
  for (const raw of events) {
    if (!isPlainObject(raw)) fail("INVALID_EVENT", "event not an object");
    const e = raw as Partial<AuthorizedSiemAlertEvent> &
      Record<string, unknown>;
    if (e.tenantId !== ctx.tenantId) {
      fail("TENANT_MISMATCH", "event tenant differs from context");
    }
    if (e.displayAuthorization !== "AUTHORIZED_BY_AGENT_ALLOWLIST") {
      fail("NOT_AUTHORIZED", "event lacks allowlist authorization");
    }
    if (
      !boundedString(e.indexName, MAX_ID_LENGTH) ||
      !INDEX_NAME_RE.test(e.indexName) ||
      e.indexName.includes("archives")
    ) {
      fail("INVALID_EVENT", "indexName invalid");
    }
    if (!boundedString(e.documentId, MAX_ID_LENGTH)) {
      fail("INVALID_EVENT", "documentId invalid");
    }
    if (!(e.occurredAt instanceof Date) || Number.isNaN(e.occurredAt.getTime())) {
      fail("INVALID_EVENT", "occurredAt invalid");
    }
    if (!isValidWazuhAgentId(e.wazuhAgentId)) {
      fail("INVALID_EVENT", "wazuhAgentId invalid");
    }
    if (!allowed.has(e.wazuhAgentId)) {
      fail("NOT_AUTHORIZED", "agent not in tenant allowlist");
    }
    if (
      e.agentName !== undefined &&
      !boundedString(e.agentName, MAX_AGENT_NAME_LENGTH)
    ) {
      fail("INVALID_EVENT", "agentName invalid");
    }
    if (!boundedString(e.ruleId, MAX_RULE_ID_LENGTH)) {
      fail("INVALID_EVENT", "ruleId invalid");
    }
    if (!nonNegInt(e.ruleLevel) || e.ruleLevel > 2_147_483_647) {
      fail("INVALID_EVENT", "ruleLevel invalid");
    }
    if (!boundedString(e.ruleDescription, MAX_RULE_DESCRIPTION_LENGTH)) {
      fail("INVALID_EVENT", "ruleDescription invalid");
    }
    const key = `${e.indexName}\u0000${e.documentId}`;
    if (seen.has(key)) fail("DUPLICATE_EVENT", "duplicate index/document in batch");
    seen.add(key);

    // Explicit allowlist of columns: nothing else is ever copied.
    rows.push({
      tenantId: ctx.tenantId,
      indexName: e.indexName,
      documentId: e.documentId,
      occurredAt: e.occurredAt,
      wazuhAgentId: e.wazuhAgentId,
      agentName: e.agentName ?? null,
      ruleId: e.ruleId,
      ruleLevel: e.ruleLevel,
      ruleDescription: e.ruleDescription,
      syncedAt,
    });
  }
  return { rows, maxEvents, batchSize };
}

export type PersistSiemAlertEventsParams = {
  store: SiemEventsStore;
  collection: AlertCollectionResult;
  ctx: SiemEventsTenantContext;
  /** Injectable clock for tests. */
  now?: () => Date;
};

/**
 * INTERNAL. Validates (no writes), then: create RUNNING log -> sequential
 * chunked upserts -> finish log. Sequence guarantees:
 *  - invalid/partial input: throws before ANY store call (not even a log);
 *  - log start failure: throws, no event written;
 *  - upsert failure: log finished as ERROR, error rethrown, never SUCCESS.
 *    Earlier chunks are NOT rolled back here (no transaction in this layer);
 *    the ERROR log states how many rows were written before the failure.
 *    Retrying the same batch is safe because upserts are idempotent;
 *  - log finish failure after successful writes: throws
 *    SYNC_LOG_FINISH_FAILED (rows persisted, log left RUNNING) — the caller
 *    must not treat this as success.
 * Logs contain only aggregate counters.
 */
export async function persistSiemAlertEvents(
  p: PersistSiemAlertEventsParams
): Promise<SiemEventsPersistenceSummary> {
  const now = p.now ?? (() => new Date());
  const startedAt = now();
  const startMs = Date.now();
  const { rows, batchSize } = validateSiemEventsBatch(
    p.collection,
    p.ctx,
    startedAt
  );
  const tenantId = p.ctx.tenantId;

  let logId: string;
  try {
    const log = await p.store.createSyncLog({
      tenantId,
      integrationType: "WAZUH",
      syncKind: "SIEM_EVENTS",
      status: "RUNNING",
      startedAt,
      message: `Persistência de eventos SIEM iniciada. Eventos: ${rows.length}.`,
    });
    if (!isPlainObject(log) || !boundedString(log.id, MAX_ID_LENGTH)) {
      throw new Error("invalid log id");
    }
    logId = log.id;
  } catch {
    throw new SiemEventsPersistenceError(
      "SYNC_LOG_START_FAILED",
      "could not create sync log; nothing was written"
    );
  }

  let persisted = 0;
  let batches = 0;
  try {
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      await p.store.upsertEvents(chunk);
      persisted += chunk.length;
      batches += 1;
    }
  } catch {
    const message = `Persistência de eventos SIEM falhou (WRITE_FAILED). Persistidos antes da falha: ${persisted} de ${rows.length}.`;
    try {
      await p.store.finishSyncLog(logId, {
        status: "ERROR",
        finishedAt: now(),
        durationMs: Date.now() - startMs,
        message,
      });
    } catch {
      throw new SiemEventsPersistenceError(
        "SYNC_LOG_FINISH_FAILED",
        "write failed and the ERROR sync log could not be saved",
        { persistedBeforeFailure: persisted }
      );
    }
    throw new SiemEventsPersistenceError("WRITE_FAILED", message, {
      persistedBeforeFailure: persisted,
    });
  }

  const durationMs = Date.now() - startMs;
  try {
    await p.store.finishSyncLog(logId, {
      status: "SUCCESS",
      finishedAt: now(),
      durationMs,
      message: `Persistência de eventos SIEM concluída. Eventos: ${rows.length}. Lotes: ${batches}.`,
    });
  } catch {
    throw new SiemEventsPersistenceError(
      "SYNC_LOG_FINISH_FAILED",
      "events persisted but the sync log could not be finalized",
      { persistedBeforeFailure: persisted }
    );
  }

  return {
    tenantId,
    received: rows.length,
    persisted,
    batches,
    durationMs,
  };
}
