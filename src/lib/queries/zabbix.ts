import { getZabbixClientForTenant } from "@/lib/integrations/zabbix-client";

export async function getTenantZabbixOverview(tenantSlug: string) {
  const { client, integration } = await getZabbixClientForTenant(tenantSlug);

  if (!integration.externalGroupId) {
    throw new Error("External Group ID do Zabbix não configurado.");
  }

  const [version, hosts, problems] = await Promise.all([
    client.getVersion(),
    client.getHostsByGroupId(integration.externalGroupId),
    client.getProblemsByGroupId(integration.externalGroupId),
  ]);

  return {
    integration,
    version,
    hosts,
    problems,
  };
}
