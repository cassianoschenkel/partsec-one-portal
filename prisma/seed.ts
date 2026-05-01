import "dotenv/config";
import { PrismaClient, AssetType, IntegrationStatus, IntegrationType, UserRole } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: {
      slug: "empresa-demonstracao",
    },
    update: {},
    create: {
      name: "Empresa Demonstração",
      slug: "empresa-demonstracao",
      document: "00.000.000/0001-00",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: {
      email: "admin.demo@partsec.local",
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Administrador Demo",
      email: "admin.demo@partsec.local",
      passwordHash: null,
      role: UserRole.TENANT_ADMIN,
      isActive: true,
    },
  });

  await prisma.customerAsset.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: "Servidor AD 01",
        hostname: "SRV-AD-01",
        ipAddress: "10.0.0.10",
        assetType: AssetType.SERVER,
        operatingSystem: "Windows Server",
        description: "Controlador de domínio principal",
        zabbixHostId: "demo-zbx-1001",
        wazuhAgentId: "demo-wazuh-001",
      },
      {
        tenantId: tenant.id,
        name: "Servidor SQL 01",
        hostname: "SRV-SQL-01",
        ipAddress: "10.0.0.20",
        assetType: AssetType.SERVER,
        operatingSystem: "Windows Server",
        description: "Servidor Microsoft SQL Server",
        zabbixHostId: "demo-zbx-1002",
        wazuhAgentId: "demo-wazuh-002",
      },
      {
        tenantId: tenant.id,
        name: "Firewall Principal",
        hostname: "FW-EDGE-01",
        ipAddress: "10.0.0.1",
        assetType: AssetType.FIREWALL,
        operatingSystem: "Sophos Firewall",
        description: "Firewall de borda monitorado por SNMP",
        zabbixHostId: "demo-zbx-2001",
        wazuhAgentId: null,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.integrationConfig.upsert({
    where: {
      tenantId_type: {
        tenantId: tenant.id,
        type: IntegrationType.ZABBIX,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      type: IntegrationType.ZABBIX,
      status: IntegrationStatus.INACTIVE,
      displayName: "Zabbix - Empresa Demonstração",
      baseUrl: "https://zabbix.partsec.local",
      externalGroupId: "demo-zabbix-hostgroup-id",
      notes: "Integração mockada para desenvolvimento.",
    },
  });

  await prisma.integrationConfig.upsert({
    where: {
      tenantId_type: {
        tenantId: tenant.id,
        type: IntegrationType.WAZUH,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      type: IntegrationType.WAZUH,
      status: IntegrationStatus.INACTIVE,
      displayName: "Wazuh - Empresa Demonstração",
      baseUrl: "https://wazuh.partsec.local",
      externalGroupId: "empresa-demonstracao",
      notes: "Integração mockada para desenvolvimento.",
    },
  });

  await prisma.integrationConfig.upsert({
    where: {
      tenantId_type: {
        tenantId: tenant.id,
        type: IntegrationType.ZAMMAD,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      type: IntegrationType.ZAMMAD,
      status: IntegrationStatus.INACTIVE,
      displayName: "Zammad - Empresa Demonstração",
      baseUrl: "https://suporte.partsec.local",
      externalOrgId: "demo-zammad-org-id",
      notes: "Integração mockada para desenvolvimento.",
    },
  });

  console.log("Seed concluído com sucesso.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
