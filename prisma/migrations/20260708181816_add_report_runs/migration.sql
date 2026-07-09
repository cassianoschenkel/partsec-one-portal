-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('EXECUTIVE', 'MANAGERIAL', 'TECHNICAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'FAILED');

-- CreateTable
CREATE TABLE "report_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "status" "ReportStatus" NOT NULL,
    "title" TEXT NOT NULL,
    "periodLabel" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_runs_tenantId_idx" ON "report_runs"("tenantId");

-- CreateIndex
CREATE INDEX "report_runs_tenantId_type_idx" ON "report_runs"("tenantId", "type");

-- CreateIndex
CREATE INDEX "report_runs_tenantId_generatedAt_idx" ON "report_runs"("tenantId", "generatedAt");

-- CreateIndex
CREATE INDEX "report_runs_tenantId_status_idx" ON "report_runs"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
