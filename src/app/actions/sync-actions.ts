"use server";

import { redirect } from "next/navigation";
import { syncTenantZabbixBySlug } from "@/lib/sync/zabbix-sync";

export async function syncTenantZabbixNowAction(tenantSlug: string) {
  try {
    await syncTenantZabbixBySlug(tenantSlug);

    redirect(`/admin/tenants/${tenantSlug}/sync?syncStatus=success`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido.";

    redirect(
      `/admin/tenants/${tenantSlug}/sync?syncStatus=error&message=${encodeURIComponent(
        message
      )}`
    );
  }
}
