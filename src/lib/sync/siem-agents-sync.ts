import { prisma } from "@/lib/prisma";
import { IntegrationSyncKind, IntegrationType } from "@/generated/prisma/client";
import { getSiemClientForTenant } from "@/lib/integrations/siem-client";
import { getTenantsWithActiveSiemIntegration } from "@/lib/queries/siem-sync";

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getOperatingSystem(agent: {
  os?: {
    name?: string;
    platform?: string;
    version?: string;
  };
}) {
  const values = [agent.os?.name, agent.os?.version]
    .filter(Boolean)
    .join(" ");

  return values || agent.os?.platform || null;
}

export async function syncTenantSiemAgentsBySlug(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
  });

  if (!tenant) {
    throw new Error(`Tenant não encontrado: ${tenantSlug}`);
  }

  return syncTenantSiemAgents({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
  });
}

export async function syncTenantSiemAgents({
  tenantId,
  tenantSlug,
}: {
  tenantId: string;
  tenantSlug: string;
}) {
  const startedAt = new Date();
  const startTime = Date.now();

  const syncLog = await prisma.integrationSyncLog.create({
    data: {
      tenantId,
      integrationType: IntegrationType.WAZUH,
      syncKind: IntegrationSyncKind.SIEM_AGENTS,
      status: "RUNNING",
      startedAt,
      message: "Sincronização SIEM iniciada.",
    },
  });

  try {
	const { client, integration } = await getSiemClientForTenant(tenantSlug);
	const agents = await client.getAgents(integration.externalGroupId);

    const syncedAt = new Date();

    for (const agent of agents) {
      await prisma.siemAgentSnapshot.upsert({
        where: {
          tenantId_wazuhAgentId: {
            tenantId,
            wazuhAgentId: agent.id,
          },
        },
        update: {
          name: agent.name,
          ip: agent.ip ?? null,
          status: agent.status ?? null,
          version: agent.version ?? null,
          operatingSystem: getOperatingSystem(agent),
          nodeName: agent.node_name ?? null,
          lastKeepAlive: parseDate(agent.lastKeepAlive),
          rawData: agent,
          syncedAt,
        },
        create: {
          tenantId,
          wazuhAgentId: agent.id,
          name: agent.name,
          ip: agent.ip ?? null,
          status: agent.status ?? null,
          version: agent.version ?? null,
          operatingSystem: getOperatingSystem(agent),
          nodeName: agent.node_name ?? null,
          lastKeepAlive: parseDate(agent.lastKeepAlive),
          rawData: agent,
          syncedAt,
        },
      });
    }
	
	const currentAgentIds = agents.map((agent) => agent.id);

	if (currentAgentIds.length > 0) {
	  await prisma.siemAgentSnapshot.deleteMany({
		where: {
		  tenantId,
		  wazuhAgentId: {
			notIn: currentAgentIds,
		  },
		},
	  });
	}
	
	//const currentAgentIds = agents.map((agent) => agent.id);

	if (currentAgentIds.length > 0) {
	  await prisma.siemAgentSnapshot.deleteMany({
		where: {
		  tenantId,
		  wazuhAgentId: {
			notIn: currentAgentIds,
		  },
		},
	  });
	}

    const durationMs = Date.now() - startTime;

    await prisma.integrationSyncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        status: "SUCCESS",
		message: `Sincronização SIEM concluída. Grupo: ${
		  integration.externalGroupId ?? "todos"
		}. Agentes: ${agents.length}.`,
        finishedAt: new Date(),
        durationMs,
      },
    });

    return {
      status: "SUCCESS",
      tenantSlug,
      agents: agents.length,
      durationMs,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido.";

    const durationMs = Date.now() - startTime;

    await prisma.integrationSyncLog.update({
      where: {
        id: syncLog.id,
      },
      data: {
        status: "ERROR",
        message,
        finishedAt: new Date(),
        durationMs,
      },
    });

    throw new Error(`[${tenantSlug}] ${message}`);
  }
}

export async function syncAllActiveSiemTenants() {
  const tenants = await getTenantsWithActiveSiemIntegration();

  const results = [];

  for (const tenant of tenants) {
    try {
      const result = await syncTenantSiemAgents({
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      });

      results.push(result);
    } catch (error) {
      results.push({
        status: "ERROR",
        tenantSlug: tenant.slug,
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      });
    }
  }

  return {
    totalTenants: tenants.length,
    results,
  };
}
