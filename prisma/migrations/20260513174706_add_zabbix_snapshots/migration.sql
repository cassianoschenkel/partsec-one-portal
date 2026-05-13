-- CreateTable
CREATE TABLE "zabbix_host_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "zabbixHostId" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "interfaceIp" TEXT,
    "interfaceDns" TEXT,
    "rawData" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zabbix_host_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zabbix_problem_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "objectId" TEXT,
    "name" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "clock" TEXT NOT NULL,
    "acknowledged" TEXT NOT NULL,
    "rawData" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zabbix_problem_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "integrationType" "IntegrationType" NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,

    CONSTRAINT "integration_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zabbix_host_snapshots_tenantId_idx" ON "zabbix_host_snapshots"("tenantId");

-- CreateIndex
CREATE INDEX "zabbix_host_snapshots_zabbixHostId_idx" ON "zabbix_host_snapshots"("zabbixHostId");

-- CreateIndex
CREATE UNIQUE INDEX "zabbix_host_snapshots_tenantId_zabbixHostId_key" ON "zabbix_host_snapshots"("tenantId", "zabbixHostId");

-- CreateIndex
CREATE INDEX "zabbix_problem_snapshots_tenantId_idx" ON "zabbix_problem_snapshots"("tenantId");

-- CreateIndex
CREATE INDEX "zabbix_problem_snapshots_eventId_idx" ON "zabbix_problem_snapshots"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "zabbix_problem_snapshots_tenantId_eventId_key" ON "zabbix_problem_snapshots"("tenantId", "eventId");

-- CreateIndex
CREATE INDEX "integration_sync_logs_tenantId_idx" ON "integration_sync_logs"("tenantId");

-- CreateIndex
CREATE INDEX "integration_sync_logs_integrationType_idx" ON "integration_sync_logs"("integrationType");

-- CreateIndex
CREATE INDEX "integration_sync_logs_startedAt_idx" ON "integration_sync_logs"("startedAt");

-- AddForeignKey
ALTER TABLE "zabbix_host_snapshots" ADD CONSTRAINT "zabbix_host_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zabbix_problem_snapshots" ADD CONSTRAINT "zabbix_problem_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_logs" ADD CONSTRAINT "integration_sync_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
