import "dotenv/config";
import { getZabbixClientForTenant } from "../src/lib/integrations/zabbix-client";

async function main() {
  const tenantSlug = process.argv[2];

  if (!tenantSlug) {
    console.error("Uso: npx tsx scripts/debug-zabbix-problem-hosts.ts tenant-slug");
    process.exit(1);
  }

  const { client, integration } = await getZabbixClientForTenant(tenantSlug);

  if (!integration.externalGroupId) {
    throw new Error("externalGroupId não configurado.");
  }

  const problems = await client.getProblemsByGroupId(integration.externalGroupId);

  console.log("Problemas encontrados:", problems.length);

  const triggerIds = Array.from(
    new Set(
      problems
        .map((problem) => problem.objectid)
        .filter((objectid): objectid is string => Boolean(objectid))
    )
  );

  console.log("Trigger IDs:", triggerIds);

  const triggers = await client.getTriggersByIds(triggerIds);

  console.log("Triggers retornadas:", triggers.length);

  for (const problem of problems.slice(0, 10)) {
    const trigger = problem.objectid
      ? triggers.find((item) => item.triggerid === problem.objectid)
      : null;

    console.log({
      eventid: problem.eventid,
      problemName: problem.name,
      objectid: problem.objectid,
      triggerFound: Boolean(trigger),
      hosts: trigger?.hosts ?? [],
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
