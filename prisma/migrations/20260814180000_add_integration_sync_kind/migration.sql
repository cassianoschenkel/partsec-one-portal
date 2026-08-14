-- CreateEnum
CREATE TYPE "IntegrationSyncKind" AS ENUM ('ZABBIX_SNAPSHOT', 'SIEM_AGENTS', 'SIEM_VULNERABILITIES');

-- AlterTable
ALTER TABLE "integration_sync_logs" ADD COLUMN     "syncKind" "IntegrationSyncKind";

-- CreateIndex
CREATE INDEX "integration_sync_logs_tenantId_integrationType_syncKind_sta_idx" ON "integration_sync_logs"("tenantId", "integrationType", "syncKind", "startedAt");

