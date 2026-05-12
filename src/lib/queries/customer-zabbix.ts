import { getTenantZabbixOverview } from "@/lib/queries/zabbix";
import type {
  ZabbixHost,
  ZabbixProblem,
} from "@/lib/integrations/zabbix-client";

type CustomerZabbixOverviewResult =
  | {
      ok: true;
      version: string;
      hosts: ZabbixHost[];
      problems: ZabbixProblem[];
    }
  | {
      ok: false;
      errorMessage: string;
      version: null;
      hosts: [];
      problems: [];
    };

export async function getCustomerZabbixOverview(
  tenantSlug: string
): Promise<CustomerZabbixOverviewResult> {
  try {
    const data = await getTenantZabbixOverview(tenantSlug);

    return {
      ok: true,
      version: data.version,
      hosts: data.hosts,
      problems: data.problems,
    };
  } catch (error) {
    return {
      ok: false,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Erro desconhecido ao consultar o Zabbix.",
      version: null,
      hosts: [],
      problems: [],
    };
  }
}
