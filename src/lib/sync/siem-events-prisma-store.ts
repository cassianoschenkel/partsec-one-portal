/**
 * Prisma adapter for `SiemEventsTransactionalStore` (Phase 2B-2B1).
 *
 * The Prisma client is INJECTED by the caller. This module never imports the
 * `@/lib/prisma` singleton, opens connections or reads env. It is structurally
 * typed (a minimal subset of the generated client) so it is testable with a
 * transactional fake. It is not wired to any route/job.
 *
 * Only `upsert` (by `tenantId_indexName_documentId`), `create` and
 * `updateMany` are used; there is no `delete`/`deleteMany`/raw SQL.
 */

import type {
  SiemEventRow,
  SiemEventsSyncLogStart,
} from "./siem-events-persistence";
import type {
  SiemEventsTransactionalStore,
  SiemEventsTxErrorLog,
  SiemEventsTxSuccessLog,
  SiemEventsTxWriter,
} from "./siem-events-transactional";

export type SiemEventUpsertArgs = {
  where: {
    tenantId_indexName_documentId: {
      tenantId: string;
      indexName: string;
      documentId: string;
    };
  };
  create: SiemEventRow;
  update: Omit<SiemEventRow, "tenantId" | "indexName" | "documentId">;
};

export type SiemSyncLogUpdateManyArgs = {
  where: { id: string; tenantId: string };
  data: SiemEventsTxSuccessLog | SiemEventsTxErrorLog;
};

/** Delegates available on the root client and on the transaction client. */
export interface SiemEventsPrismaDelegates {
  siemEventSnapshot: {
    upsert(args: SiemEventUpsertArgs): Promise<unknown>;
  };
  integrationSyncLog: {
    create(args: {
      data: SiemEventsSyncLogStart;
      select: { id: true };
    }): Promise<{ id: string }>;
    updateMany(args: SiemSyncLogUpdateManyArgs): Promise<{ count: number }>;
  };
}

export interface SiemEventsPrismaClient extends SiemEventsPrismaDelegates {
  $transaction<T>(
    fn: (tx: SiemEventsPrismaDelegates) => Promise<T>
  ): Promise<T>;
}

async function finishScoped(
  db: SiemEventsPrismaDelegates,
  tenantId: string,
  id: string,
  data: SiemEventsTxSuccessLog | SiemEventsTxErrorLog
): Promise<void> {
  const res = await db.integrationSyncLog.updateMany({
    where: { id, tenantId },
    data,
  });
  if (res.count !== 1) {
    // Generic on purpose: no ids in the message.
    throw new Error("sync log update affected an unexpected number of rows");
  }
}

export function createPrismaSiemEventsStore(
  client: SiemEventsPrismaClient
): SiemEventsTransactionalStore {
  return {
    async createSyncLog(data) {
      const log = await client.integrationSyncLog.create({
        data,
        select: { id: true },
      });
      return { id: log.id };
    },

    runInTransaction(fn) {
      return client.$transaction((txClient) => {
        // Tenant of the cycle: fixed by the first row, enforced for all rows
        // and for the log finalization.
        let cycleTenant: string | null = null;
        const writer: SiemEventsTxWriter = {
          async upsertEvents(rows) {
            // Sequential on purpose.
            for (const r of rows) {
              cycleTenant ??= r.tenantId;
              if (r.tenantId !== cycleTenant) {
                throw new Error("mixed tenants in event cycle");
              }
              await txClient.siemEventSnapshot.upsert({
                where: {
                  tenantId_indexName_documentId: {
                    tenantId: r.tenantId,
                    indexName: r.indexName,
                    documentId: r.documentId,
                  },
                },
                create: {
                  tenantId: r.tenantId,
                  indexName: r.indexName,
                  documentId: r.documentId,
                  occurredAt: r.occurredAt,
                  wazuhAgentId: r.wazuhAgentId,
                  agentName: r.agentName,
                  ruleId: r.ruleId,
                  ruleLevel: r.ruleLevel,
                  ruleDescription: r.ruleDescription,
                  syncedAt: r.syncedAt,
                },
                update: {
                  occurredAt: r.occurredAt,
                  wazuhAgentId: r.wazuhAgentId,
                  agentName: r.agentName,
                  ruleId: r.ruleId,
                  ruleLevel: r.ruleLevel,
                  ruleDescription: r.ruleDescription,
                  syncedAt: r.syncedAt,
                },
              });
            }
          },
          finishSyncLogSuccess(tenantId, id, data) {
            if (cycleTenant !== null && tenantId !== cycleTenant) {
              return Promise.reject(new Error("log tenant differs from rows"));
            }
            return finishScoped(txClient, tenantId, id, data);
          },
        };
        return fn(writer);
      });
    },

    markSyncLogError(tenantId, id, data) {
      return finishScoped(client, tenantId, id, data);
    },
  };
}
