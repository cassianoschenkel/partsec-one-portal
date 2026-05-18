"use server";

import { redirect } from "next/navigation";
import { syncTenantZabbixBySlug } from "@/lib/sync/zabbix-sync";
import { importZabbixAssetsForTenantBySlug } from "@/lib/sync/zabbix-assets-import";

export async function syncTenantZabbixNowAction(tenantSlug: string) {
  let redirectUrl = `/admin/tenants/${tenantSlug}/sync?syncStatus=success`;

  try {
    await syncTenantZabbixBySlug(tenantSlug);
    const importResult = await importZabbixAssetsForTenantBySlug(tenantSlug);

    redirectUrl =
      `/admin/tenants/${tenantSlug}/sync?syncStatus=success` +
      `&message=${encodeURIComponent(
        `Zabbix sincronizado. Ativos criados: ${importResult.created}. Atualizados: ${importResult.updated}. Sem alterações: ${importResult.unchanged}.`
      )}`;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido.";

    redirectUrl = `/admin/tenants/${tenantSlug}/sync?syncStatus=error&message=${encodeURIComponent(
      message
    )}`;
  }

  redirect(redirectUrl);
}
