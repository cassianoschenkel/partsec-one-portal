import { prisma } from "@/lib/prisma";
import { IntegrationType } from "@/generated/prisma/client";
import {
  getIntegrationCredential,
  getOptionalCredentialValue,
} from "@/lib/integrations/integration-credentials";

export const DEFAULT_VULNERABILITIES_INDEX = "wazuh-states-vulnerabilities*";

type SiemIndexerSearchHit = {
  _id: string;
  _index: string;
  _source: {
    agent?: {
      id?: string;
      name?: string;
      type?: string;
      version?: string;
    };
    host?: {
      os?: {
        full?: string;
        kernel?: string;
        name?: string;
        platform?: string;
        type?: string;
        version?: string;
      };
    };
    package?: {
      architecture?: string;
      description?: string;
      name?: string;
      size?: number;
      type?: string;
      version?: string;
    };
    vulnerability?: {
      category?: string;
      classification?: string;
      description?: string;
      detected_at?: string;
      enumeration?: string;
      id?: string;
      published_at?: string;
      reference?: string;
      scanner?: {
        condition?: string;
        reference?: string;
        source?: string;
        vendor?: string;
      };
      score?: {
        base?: number;
        version?: string;
      };
      severity?: string;
      under_evaluation?: boolean;
    };
    wazuh?: {
      cluster?: {
        name?: string;
      };
      schema?: {
        version?: string;
      };
    };
  };
};

type SiemIndexerSearchResponse = {
  hits?: {
    hits?: SiemIndexerSearchHit[];
  };
};

function buildApiUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

export class SiemIndexerClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private vulnerabilitiesIndex: string;

  constructor({
    baseUrl,
    username,
    password,
    vulnerabilitiesIndex,
  }: {
    baseUrl: string;
    username: string;
    password: string;
    vulnerabilitiesIndex: string;
  }) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    this.baseUrl = buildApiUrl(baseUrl);
    this.username = username;
    this.password = password;
    this.vulnerabilitiesIndex = vulnerabilitiesIndex;
  }

  private async search({
    index,
    body,
  }: {
    index: string;
    body: Record<string, unknown>;
  }) {
    const basicAuth = Buffer.from(
      `${this.username}:${this.password}`
    ).toString("base64");

    const response = await fetch(`${this.baseUrl}/${index}/_search`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `Falha ao consultar SIEM Indexer. HTTP ${response.status} ${response.statusText}`
      );
    }

    return (await response.json()) as SiemIndexerSearchResponse;
  }

  async getVulnerabilitiesByAgentIds(agentIds: string[]) {
    if (agentIds.length === 0) {
      return [];
    }

    const vulnerabilities: SiemIndexerSearchHit[] = [];
    let searchAfter: unknown[] | undefined;

    while (true) {
      const body: Record<string, unknown> = {
        size: 1000,
        query: {
          terms: {
            "agent.id": agentIds,
          },
        },
        sort: [
          {
            "agent.id": {
              order: "asc",
            },
          },
          {
            "vulnerability.id": {
              order: "asc",
            },
          },
          {
            "package.name": {
              order: "asc",
              missing: "_last",
            },
          },
          {
            "package.version": {
              order: "asc",
              missing: "_last",
            },
          },
          {
            "_id": {
              order: "asc",
            },
          },
        ],
      };

      if (searchAfter) {
        body.search_after = searchAfter;
      }

      const payload = await this.search({
        index: this.vulnerabilitiesIndex,
        body,
      });

      const hits = payload.hits?.hits ?? [];

      vulnerabilities.push(...hits);

      if (hits.length < 1000) {
        break;
      }

      searchAfter = (hits[hits.length - 1] as { sort?: unknown[] }).sort;

      if (!searchAfter) {
        break;
      }
    }

    return vulnerabilities;
  }
}

export async function getSiemIndexerClientForTenant(tenantSlug: string) {
  const { integration, value: username } = await getIntegrationCredential({
    tenantSlug,
    type: IntegrationType.WAZUH,
    key: "indexer_username",
  });

  const { value: password } = await getIntegrationCredential({
    tenantSlug,
    type: IntegrationType.WAZUH,
    key: "indexer_password",
  });

  if (!integration.externalOrgId) {
    throw new Error(
      `URL do SIEM Indexer não configurada para ${tenantSlug}. Use External Org ID temporariamente para armazenar a URL do Indexer.`
    );
  }

  if (!username || !password) {
    throw new Error("Credenciais do SIEM Indexer não configuradas.");
  }

  const configuredVulnerabilitiesIndex = getOptionalCredentialValue(
    integration,
    "indexer_vulnerabilities_index"
  )?.trim();

  const vulnerabilitiesIndex = configuredVulnerabilitiesIndex
    ? configuredVulnerabilitiesIndex
    : DEFAULT_VULNERABILITIES_INDEX;

  const vulnerabilitiesIndexSource: "tenant" | "fallback" =
    configuredVulnerabilitiesIndex ? "tenant" : "fallback";

  if (vulnerabilitiesIndexSource === "fallback") {
    console.warn(
      `[SIEM Indexer] tenant=${tenantSlug} vulnerabilitiesIndex="${vulnerabilitiesIndex}" source=fallback`
    );
  } else {
    console.log(
      `[SIEM Indexer] tenant=${tenantSlug} vulnerabilitiesIndex="${vulnerabilitiesIndex}" source=tenant`
    );
  }

  return {
    integration,
    vulnerabilitiesIndex,
    vulnerabilitiesIndexSource,
    client: new SiemIndexerClient({
      baseUrl: integration.externalOrgId,
      username,
      password,
      vulnerabilitiesIndex,
    }),
  };
}
