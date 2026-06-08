import { IntegrationType } from "@/generated/prisma/client";
import { getIntegrationCredential } from "@/lib/integrations/integration-credentials";

type SiemAgentRaw = {
  id: string;
  name: string;
  ip?: string;
  status?: string;
  version?: string;
  node_name?: string;
  lastKeepAlive?: string;
  os?: {
    name?: string;
    platform?: string;
    version?: string;
  };
};

type WazuhApiResponse<T> = {
  data?: {
    affected_items?: T[];
    total_affected_items?: number;
  };
  error?: number;
  message?: string;
};

function buildApiUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

export class SiemClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private token: string | null = null;

  constructor({
    baseUrl,
    username,
    password,
  }: {
    baseUrl: string;
    username: string;
    password: string;
  }) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    this.baseUrl = buildApiUrl(baseUrl);
    this.username = username;
    this.password = password;
  }

  private async authenticate() {
    if (this.token) {
      return this.token;
    }

    const basicAuth = Buffer.from(
      `${this.username}:${this.password}`
    ).toString("base64");

    const response = await fetch(`${this.baseUrl}/security/user/authenticate`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Falha ao autenticar no SIEM. HTTP ${response.status} ${response.statusText}`
      );
    }

    const payload = await response.json();

    const token = payload?.data?.token;

    if (!token) {
      throw new Error("Token de autenticação SIEM não retornado pela API.");
    }

    this.token = token;

    return token;
  }

  private async get<T>(path: string, query?: Record<string, string | number>) {
    const token = await this.authenticate();

    const url = new URL(`${this.baseUrl}${path}`);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Falha ao consultar SIEM. HTTP ${response.status} ${response.statusText}`
      );
    }

    const payload = (await response.json()) as WazuhApiResponse<T>;

    if (payload.error && payload.error !== 0) {
      throw new Error(
        `Erro SIEM API ${payload.error}: ${payload.message ?? "sem mensagem"}`
      );
    }

    return payload;
  }

  async getAgents() {
    const agents: SiemAgentRaw[] = [];
    let offset = 0;
    const limit = 500;

    while (true) {
      const payload = await this.get<SiemAgentRaw>("/agents", {
        limit,
        offset,
        sort: "+name",
      });

      const items = payload.data?.affected_items ?? [];

      agents.push(...items);

      if (items.length < limit) {
        break;
      }

      offset += limit;
    }

    return agents;
  }
}

export async function getSiemClientForTenant(tenantSlug: string) {
  const { integration, value: username } = await getIntegrationCredential({
    tenantSlug,
    type: IntegrationType.WAZUH,
    key: "api_username",
  });

  const { value: password } = await getIntegrationCredential({
    tenantSlug,
    type: IntegrationType.WAZUH,
    key: "api_password",
  });

  if (!integration.baseUrl) {
    throw new Error(
      `URL base da integração SIEM não configurada para ${tenantSlug}.`
    );
  }

  if (!username || !password) {
    throw new Error("Credenciais da integração SIEM não configuradas.");
  }

  return {
    integration,
    client: new SiemClient({
      baseUrl: integration.baseUrl,
      username,
      password,
    }),
  };
}
