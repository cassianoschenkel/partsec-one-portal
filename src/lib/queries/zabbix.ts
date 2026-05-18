import { getZabbixClientForTenant } from "@/lib/integrations/zabbix-client";

export async function getTenantZabbixOverview(tenantSlug: string) {
  const { client, integration } = await getZabbixClientForTenant(tenantSlug);

  if (!integration.externalGroupId) {
    throw new Error("Grupo externo do Zabbix não configurado para este tenant.");
  }

  const version = await client.getVersion();

  const hosts = await client.getHostsByGroupId(integration.externalGroupId);

  const problems = await client.getProblemsByGroupId(
    integration.externalGroupId
  );

  const triggerIds = Array.from(
    new Set(
      problems
        .map((problem) => problem.objectid)
        .filter((objectid): objectid is string => Boolean(objectid))
    )
  );

  const triggers = await client.getTriggersByIds(triggerIds);

  const triggersById = new Map(
    triggers.map((trigger) => [trigger.triggerid, trigger])
  );

  const enrichedProblems = problems.map((problem) => {
    const trigger = problem.objectid
      ? triggersById.get(problem.objectid) ?? null
      : null;

    return {
      ...problem,
      hosts: trigger?.hosts ?? [],
    };
  });

  return {
    integration,
    version,
    hosts,
    problems: enrichedProblems,
  };
}
