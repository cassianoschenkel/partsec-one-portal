# Wazuh events — offline persistence orchestration (Phase 2B-2A)

Module: `src/lib/sync/siem-events-persistence.ts` (tests colocated).
Status: **offline only**. It is not wired to any route, Server Action, CLI,
job or scheduler, and must not be until Phase 2B-2B.

## Architecture

```
AlertCollectionResult (2B-1)  +  server-resolved tenant context
        │
        ▼
validateSiemEventsBatch()   pure, no I/O, fail-closed
        │ rows (approved columns only)
        ▼
persistSiemAlertEvents()  ──►  SiemEventsStore (injected port)
                                 createSyncLog / upsertEvents / finishSyncLog
```

The module imports no Prisma, env, credentials, `fetch` or Wazuh client. The
real `SiemEventsStore` adapter (Prisma-backed) is a separate, later deliverable.

## Validation (before any store call)

Input is untrusted; TypeScript types are not evidence. Runtime checks:
`status === "COMPLETE"`, no `incompleteReason`, `rejected` counters all zero,
`documentsRead >= events.length`, events and documentsRead below `maxEvents`
(default 1000, hard cap 10 000; reaching the cap is treated as possibly
truncated), `1 <= pages <= ALERT_QUERY_HARD_LIMITS.maxPages` (20) for any
COMPLETE collection (with or without events), `pages > 1` requires
`documentsRead > 0`, `ctx.authorizedAgentIds` non-empty with at most
`MAX_AUTHORIZED_AGENT_IDS` (1000) well-formed string ids (leading zeros kept),
every event has `tenantId === ctx.tenantId`,
`displayAuthorization === "AUTHORIZED_BY_AGENT_ALLOWLIST"`, agent in
`ctx.authorizedAgentIds`, `wazuh-alerts-*` index name (never `archives`),
bounded non-empty ids/strings, valid `Date`, non-negative integer
`ruleLevel`, and no duplicate `(indexName, documentId)`.
Any failure throws `SiemEventsPersistenceError` with **no store call at all**
(not even a sync log): rejected input is surfaced to the caller only.

## Written columns

`tenantId, indexName, documentId, occurredAt, wazuhAgentId, agentName,
ruleId, ruleLevel, ruleDescription, syncedAt`. Rows are built field by field;
`rawData`, `full_log`, `data`, `previous_output` or any extra key are never
copied. No `delete`/`deleteMany`; no retention.

## Idempotent reprocessing

The adapter must upsert on `tenantId_indexName_documentId`. Re-running the
same batch updates the same rows (demonstrated with a mock in two runs).
Retrying after a failure is therefore safe.

## Sync log and failure semantics

`IntegrationSyncLog` with `WAZUH` / `SIEM_EVENTS`: `RUNNING` →
`SUCCESS` | `ERROR`, duration and aggregate counters only (no URLs,
credentials, payloads or index/document ids; underlying error messages are
dropped).

| Failure | Behavior |
| --- | --- |
| Invalid/partial input | throw, no store call |
| Log creation fails | `SYNC_LOG_START_FAILED`, nothing written |
| Upsert fails | log finished `ERROR` (with count written before the failure), `WRITE_FAILED` thrown |
| ERROR log cannot be saved | `SYNC_LOG_FINISH_FAILED` thrown |
| SUCCESS log cannot be saved | `SYNC_LOG_FINISH_FAILED` thrown (rows persisted, log stays `RUNNING`) |

`SUCCESS` is only recorded after every chunk was written.

### Transactionality (limitation)

This layer provides **no transaction**: chunks are written sequentially and
earlier chunks are not rolled back if a later one fails. The real adapter in
2B-2B must run all upserts of a batch in one DB transaction (or document the
partial-write behavior) and ideally the final log update with it. Until then,
a partial write is reported as `ERROR` with the persisted count, never as
success.

### Transactional path (Phase 2B-2B1, offline)

`persistSiemAlertEventsTransactional` (`siem-events-transactional.ts`) with
`createPrismaSiemEventsStore` (`siem-events-prisma-store.ts`) is the
transactional alternative; `persistSiemAlertEvents` is unchanged.

- Validation first (same fail-closed rules); invalid input makes no store call.
- `RUNNING` log is created **outside** the transaction, after validation.
- **One** `$transaction` wraps ALL chunk upserts AND the `SUCCESS` update. If a
  chunk or the `SUCCESS` update fails, everything rolls back and success is
  never reported.
- After rollback, a **separate** operation sets the log to `ERROR`. If it
  fails, `SYNC_LOG_FINISH_FAILED` is thrown and the log stays `RUNNING`.
- Log updates use `updateMany({ where: { id, tenantId } })` and require
  `count === 1`.
- Prisma client is injected; no singleton, env, connection or raw SQL; only
  `upsert` by `tenantId_indexName_documentId`, `create`, `updateMany`.

Limits: a single large transaction (up to the document cap) holds locks until
commit; a crash between `RUNNING` creation and the transaction, or while
writing `ERROR`, leaves an orphan `RUNNING` log (no reaper exists); a retry
creates a new log and is safe because upserts are idempotent; no checkpoint is
read or advanced. Rollback is proven only against a fake that simulates
commit/rollback; real PostgreSQL behavior is not tested here.

## Checkpoint (contract only)

`SiemEventsCheckpointPort` is an unimplemented interface. A checkpoint/window
may advance only after `persistSiemAlertEvents` resolved for a COMPLETE batch;
never on INCOMPLETE, discards, write or log failures.

## Pending for 2B-2B / operations

- Trusted tenant-scoped factory and Manager/Indexer origin evidence.
- Prisma adapter with a transaction; applying the Phase 2A migration (human).
- Persistent checkpoint; verified multi-page tiebreaker field.
- Scheduling (15 min proposal) and retention (30 days proposal): not configured.
