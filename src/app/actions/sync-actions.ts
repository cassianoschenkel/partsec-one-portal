"use server";

import { redirect } from "next/navigation";
import { syncTenantZabbixBySlug } from "@/lib/sync/zabbix-sync";

export async function syncTenantZabbixNowAction(tenantSlug: string) {
  let redirectUrl = `/admin/tenants/${tenantSlug}/sync?syncStatus=success`;

  try {
    await syncTenantZabbixBySlug(tenantSlug);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido.";

    redirectUrl = `/admin/tenants/${tenantSlug}/sync?syncStatus=error&message=${encodeURIComponent(
      message
    )}`;
  }

  redirect(redirectUrl);
}
