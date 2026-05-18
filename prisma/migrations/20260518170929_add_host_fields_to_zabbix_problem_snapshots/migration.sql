-- AlterTable
ALTER TABLE "zabbix_problem_snapshots" ADD COLUMN     "hostName" TEXT,
ADD COLUMN     "hostTechnicalName" TEXT,
ADD COLUMN     "zabbixHostId" TEXT;
