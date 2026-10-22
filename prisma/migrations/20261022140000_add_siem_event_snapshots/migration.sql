-- AlterEnum
ALTER TYPE "IntegrationSyncKind" ADD VALUE 'SIEM_EVENTS';

-- CreateTable
CREATE TABLE "siem_event_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "indexName" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "wazuhAgentId" TEXT NOT NULL,
    "agentName" TEXT,
    "ruleId" TEXT NOT NULL,
    "ruleLevel" INTEGER NOT NULL,
    "ruleDescription" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "siem_event_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "siem_event_snapshots_tenantId_occurredAt_idx" ON "siem_event_snapshots"("tenantId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "siem_event_snapshots_tenantId_wazuhAgentId_occurredAt_idx" ON "siem_event_snapshots"("tenantId", "wazuhAgentId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "siem_event_snapshots_tenantId_ruleLevel_occurredAt_idx" ON "siem_event_snapshots"("tenantId", "ruleLevel", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "siem_event_snapshots_tenantId_ruleId_occurredAt_idx" ON "siem_event_snapshots"("tenantId", "ruleId", "occurredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "siem_event_snapshots_tenantId_indexName_documentId_key" ON "siem_event_snapshots"("tenantId", "indexName", "documentId");

-- AddForeignKey
ALTER TABLE "siem_event_snapshots" ADD CONSTRAINT "siem_event_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
