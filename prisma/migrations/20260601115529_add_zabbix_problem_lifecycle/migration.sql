-- AlterTable
ALTER TABLE "zabbix_problem_snapshots" ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN';
