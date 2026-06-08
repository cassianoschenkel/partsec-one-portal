import { prisma } from "@/lib/prisma";

function normalize(value?: string | null) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "") ?? "";
}

function getMatchScore({
  agent,
  asset,
}: {
  agent: {
    name: string;
    ip: string | null;
  };
  asset: {
    name: string;
    hostname: string | null;
    ipAddress: string | null;
    wazuhAgentId: string | null;
  };
}) {
  if (asset.wazuhAgentId) {
    return 0;
  }

  const agentName = normalize(agent.name);
  const agentIp = normalize(agent.ip);

  const assetName = normalize(asset.name);
  const assetHostname = normalize(asset.hostname);
  const assetIp = normalize(asset.ipAddress);

  if (agentIp && assetIp && agentIp === assetIp) {
    return 100;
  }

  if (agentName && assetHostname && agentName === assetHostname) {
    return 95;
  }

  if (agentName && assetName && agentName === assetName) {
    return 90;
  }

  if (
    agentName &&
    assetHostname &&
    (agentName.includes(assetHostname) || assetHostname.includes(agentName))
  ) {
    return 75;
  }

  if (
    agentName &&
    assetName &&
    (agentName.includes(assetName) || assetName.includes(agentName))
  ) {
    return 70;
  }

  return 0;
}

function getMatchReason(score: number) {
  if (score === 100) {
    return "IP idêntico";
  }

  if (score === 95) {
    return "Hostname idêntico";
  }

  if (score === 90) {
    return "Nome idêntico";
  }

  if (score === 75) {
    return "Hostname semelhante";
  }

  if (score === 70) {
    return "Nome semelhante";
  }

  return "Sem sugestão confiável";
}

export async function getTenantSiemAssetLinkSuggestions(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({
    where: {
      slug: tenantSlug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!tenant) {
    return null;
  }

  const [agents, assets] = await Promise.all([
    prisma.siemAgentSnapshot.findMany({
      where: {
        tenantId: tenant.id,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.customerAsset.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const rows = agents.map((agent) => {
    const linkedAsset = assets.find(
      (asset) => asset.wazuhAgentId === agent.wazuhAgentId
    );

    if (linkedAsset) {
      return {
        agent,
        linkedAsset,
        suggestion: null,
        status: "LINKED" as const,
      };
    }

    const suggestions = assets
      .map((asset) => ({
        asset,
        score: getMatchScore({
          agent,
          asset,
        }),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const bestSuggestion = suggestions[0];

    return {
      agent,
      linkedAsset: null,
      suggestion: bestSuggestion
        ? {
            asset: bestSuggestion.asset,
            score: bestSuggestion.score,
            reason: getMatchReason(bestSuggestion.score),
          }
        : null,
      status: bestSuggestion ? ("SUGGESTED" as const) : ("UNMATCHED" as const),
    };
  });

  return {
    tenant,
    rows,
    summary: {
      totalAgents: agents.length,
      linked: rows.filter((row) => row.status === "LINKED").length,
      suggested: rows.filter((row) => row.status === "SUGGESTED").length,
      unmatched: rows.filter((row) => row.status === "UNMATCHED").length,
    },
  };
}
