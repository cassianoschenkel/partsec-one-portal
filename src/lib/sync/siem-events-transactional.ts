/**
 * Offline transactional orchestration for Wazuh event persistence
 * (Phase 2B-2B1).
 *
 * Contract: ALL chunked upserts of a cycle and the transition of the sync log
 * to SUCCESS run inside ONE store transaction (`runInTransaction`). If any
 * chunk or the SUCCESS finalization fails, the store must roll the whole
 * transaction back and this function never reports success. The ERROR log is
 * written AFTER the rollback, in a separate operation.
 *
 * No Prisma, env, fetch or Wazuh client is imported here. Not wired to any
 * route, Server Action, CLI, job or scheduler (see
 * docs/wazuh-events-persistence.md).
 */

import type { AlertCollectionResult } from "../integrations/siem-alerts-query";
import {
  SiemEventsPersistenceError,
  validateSiemEventsBatch,
  type SiemEventRow,
  type SiemEventsPersistenceSummary,
  type SiemEventsSyncLogStart,
  type SiemEventsTenantContext,
} from "./siem-events-persistence";

const MAX_ID_LENGTH = 512;

export type SiemEventsTxSuccessLog = {
  status: "SUCCESS";
  finishedAt: Date;
  durationMs: number;
  message: string;
};

export type SiemEventsTxErrorLog = {
  status: "ERROR";
  finishedAt: Date;
  durationMs: number;
  message: string;
};

/** Operations only available inside the single cycle transaction. */
export interface SiemEventsTxWriter {
  upsertEvents(rows: readonly SiemEventRow[]): Promise<void>;
  /** Must update exactly one row matching id AND tenantId, else throw. */
  finishSyncLogSuccess(
    tenantId: string,
    id: string,
    data: SiemEventsTxSuccessLog
  ): Promise<void>;
}

/**
 * Transactional write port. `runInTransaction` MUST commit only if `fn`
 * resolves and roll back everything `fn` wrote if it rejects (rethrowing).
 */
export interface SiemEventsTransactionalStore {
  /** Outside the transaction. */
  createSyncLog(data: SiemEventsSyncLogStart): Promise<{ id: string }>;
  runInTransaction<T>(fn: (tx: SiemEventsTxWriter) => Promise<T>): Promise<T>;
  /** Outside (after) the aborted transaction. Exactly one row, id AND tenant. */
  markSyncLogError(
    tenantId: string,
    id: string,
    data: SiemEventsTxErrorLog
  ): Promise<void>;
}

export type PersistSiemAlertEventsTransactionalParams = {
  store: SiemEventsTransactionalStore;
  collection: AlertCollectionResult;
  ctx: SiemEventsTenantContext;
  now?: () => Date;
};

/**
 * Sequence:
 *  1. validate (no I/O) - invalid input: no store call at all, not even a log;
 *  2. create RUNNING log (outside tx) - failure: SYNC_LOG_START_FAILED;
 *  3. one transaction: all chunk upserts + SUCCESS finalization;
 *  4. on any failure in 3: the store rolled back; try to mark the log ERROR
 *     (outside tx). If that fails -> SYNC_LOG_FINISH_FAILED (log stays
 *     RUNNING); otherwise WRITE_FAILED. SUCCESS is never reported.
 * Limits: a crash between 2 and 3 (or during 4) leaves an orphan RUNNING log;
 * a retry is safe (idempotent upserts) and creates a new log.
 */
export async function persistSiemAlertEventsTransactional(
  p: PersistSiemAlertEventsTransactionalParams
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
    if (
      typeof log !== "object" ||
      log === null ||
      typeof log.id !== "string" ||
      log.id.trim() === "" ||
      log.id.length > MAX_ID_LENGTH
    ) {
      throw new Error("invalid log id");
    }
    logId = log.id;
  } catch {
    throw new SiemEventsPersistenceError(
      "SYNC_LOG_START_FAILED",
      "could not create sync log; nothing was written"
    );
  }

  const batches = Math.ceil(rows.length / batchSize);
  let durationMs = 0;
  try {
    await p.store.runInTransaction(async (tx) => {
      for (let i = 0; i < rows.length; i += batchSize) {
        await tx.upsertEvents(rows.slice(i, i + batchSize));
      }
      durationMs = Date.now() - startMs;
      await tx.finishSyncLogSuccess(tenantId, logId, {
        status: "SUCCESS",
        finishedAt: now(),
        durationMs,
        message: `Persistência de eventos SIEM concluída. Eventos: ${rows.length}. Lotes: ${batches}.`,
      });
    });
  } catch {
    const message = `Persistência de eventos SIEM falhou (WRITE_FAILED); transação revertida. Eventos no ciclo: ${rows.length}.`;
    try {
      await p.store.markSyncLogError(tenantId, logId, {
        status: "ERROR",
        finishedAt: now(),
        durationMs: Date.now() - startMs,
        message,
      });
    } catch {
      throw new SiemEventsPersistenceError(
        "SYNC_LOG_FINISH_FAILED",
        "write failed (rolled back) and the ERROR sync log could not be saved",
        { persistedBeforeFailure: 0 }
      );
    }
    throw new SiemEventsPersistenceError("WRITE_FAILED", message, {
      persistedBeforeFailure: 0,
    });
  }

  return {
    tenantId,
    received: rows.length,
    persisted: rows.length,
    batches,
    durationMs,
  };
}
