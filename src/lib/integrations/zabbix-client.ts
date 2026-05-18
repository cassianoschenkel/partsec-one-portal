import { IntegrationType } from "@/generated/prisma/client";
import { getIntegrationCredential } from "@/lib/integrations/integration-credentials";

type ZabbixRpcResponse<T> = {
  jsonrpc: "2.0";
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: string;
  };
  id: number;
};

type ZabbixRpcRequestParams = Record<string, unknown> | unknown[];

function buildZabbixApiUrl(baseUrl: string) {
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");

  if (cleanBaseUrl.endsWith("/api_jsonrpc.php")) {
    return cleanBaseUrl;
  }

  return `${cleanBaseUrl}/api_jsonrpc.php`;
}

export type ZabbixHost = {
  hostid: string;
  host: string;
  name: string;
  status: string;
  interfaces?: Array<{
    ip?: string;
    dns?: string;
    useip?: string;
  }>;
};

export type ZabbixProblemHost = {
  hostid: string;
  host: string;
  name: string;
};

export type ZabbixProblem = {
  eventid: string;
  objectid?: string;
  name: string;
  severity: string;
  clock: string;
  acknowledged: string;
  hosts?: ZabbixProblemHost[];
};

export type ZabbixTriggerWithHosts = {
  triggerid: string;
  description: string;
  hosts?: ZabbixProblemHost[];
};

export class ZabbixClient {
  private apiUrl: string;
  private apiToken: string;

  constructor({
    baseUrl,
    apiToken,
  }: {
    baseUrl: string;
    apiToken: string;
  }) {
    this.apiUrl = buildZabbixApiUrl(baseUrl);
    this.apiToken = apiToken;
  }

  private async call<T>(
    method: string,
    params: ZabbixRpcRequestParams,
    options?: {
      authenticated?: boolean;
    }
  ) {
    const body: Record<string, unknown> = {
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
    };

    if (options?.authenticated !== false) {
      body.auth = this.apiToken;
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json-rpc",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Falha HTTP ao consultar Zabbix: ${response.status} ${response.statusText}`
      );
    }

    const payload = (await response.json()) as ZabbixRpcResponse<T>;

    if (payload.error) {
      throw new Error(
        `Erro Zabbix API ${payload.error.code}: ${payload.error.message}${
          payload.error.data ? ` - ${payload.error.data}` : ""
        }`
      );
    }

    return payload.result as T;
  }

  async getVersion() {
    return this.call<string>("apiinfo.version", [], {
      authenticated: false,
    });
  }

  async getProblemsByGroupId(groupId: string) {
    return this.call<ZabbixProblem[]>("problem.get", {
      output: ["eventid", "objectid", "name", "severity", "clock", "acknowledged"],
	  groupids: [groupId],
      sortfield: ["eventid"],
      sortorder: "DESC",
      recent: true,
    });
  }
  
async getTriggersByIds(triggerIds: string[]) {
  if (triggerIds.length === 0) {
    return [];
  }

  return this.call<ZabbixTriggerWithHosts[]>("trigger.get", {
    triggerids: triggerIds,
    output: ["triggerid", "description"],
    selectHosts: ["hostid", "host", "name"],
  });
}

  async getHostsByGroupId(groupId: string) {
    return this.call<ZabbixHost[]>("host.get", {
      output: ["hostid", "host", "name", "status"],
      groupids: [groupId],
      selectInterfaces: ["ip", "dns", "useip"],
      sortfield: "name",
    });
  }
}

export async function getZabbixClientForTenant(tenantSlug: string) {
  const { integration, value: apiToken } = await getIntegrationCredential({
    tenantSlug,
    type: IntegrationType.ZABBIX,
    key: "api_token",
  });

  if (!integration.baseUrl) {
    throw new Error("Base URL do Zabbix não configurada.");
  }

  return {
    client: new ZabbixClient({
      baseUrl: integration.baseUrl,
      apiToken,
    }),
    integration,
  };
}
