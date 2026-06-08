-- CreateTable
CREATE TABLE "siem_agent_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "wazuhAgentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT,
    "status" TEXT,
    "version" TEXT,
    "operatingSystem" TEXT,
    "nodeName" TEXT,
    "lastKeepAlive" TIMESTAMP(3),
    "rawData" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "siem_agent_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "siem_agent_snapshots_tenantId_idx" ON "siem_agent_snapshots"("tenantId");

-- CreateIndex
CREATE INDEX "siem_agent_snapshots_wazuhAgentId_idx" ON "siem_agent_snapshots"("wazuhAgentId");

-- CreateIndex
CREATE INDEX "siem_agent_snapshots_status_idx" ON "siem_agent_snapshots"("status");

-- CreateIndex
CREATE UNIQUE INDEX "siem_agent_snapshots_tenantId_wazuhAgentId_key" ON "siem_agent_snapshots"("tenantId", "wazuhAgentId");

-- AddForeignKey
ALTER TABLE "siem_agent_snapshots" ADD CONSTRAINT "siem_agent_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
