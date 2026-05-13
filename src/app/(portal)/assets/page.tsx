import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { getTenantAssetsWithZabbixSnapshots } from "@/lib/queries/assets";
import {
  AlertTriangle,
  CheckCircle2,
  LinkIcon,
  MonitorCheck,
  Server,
  Shield,
  Wifi,
} from "lucide-react";

function getAssetIcon(assetType: string) {
  if (assetType === "FIREWALL") return Shield;
  if (assetType === "ACCESS_POINT" || assetType === "LINK") return Wifi;
  return Server;
}

function getZabbixStatusLabel(status?: string | null) {
  if (status === "0") {
    return "Monitorado";
  }

  if (status === "1") {
    return "Não monitorado";
  }

  return "Sem snapshot";
}

function formatDate(date?: Date | null) {
  if (!date) {
    return "Nunca sincronizado";
  }

  return date.toLocaleString("pt-BR");
}

export default async function AssetsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "PARTSEC_ADMIN") {
    redirect("/admin/tenants");
  }

  if (!session.user.tenantId) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800">
        Usuário sem tenant vinculado.
      </div>
    );
  }

  const data = await getTenantAssetsWithZabbixSnapshots(session.user.tenantId);

  if (!data) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800">
        Tenant não encontrado.
      </div>
    );
  }

  const activeAssets = data.assets.filter((asset) => asset.isActive);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Ativos
            </h2>
            <p className="mt-2 text-slate-600">
              Inventário de servidores, firewalls, links, serviços e demais
              ativos monitorados para{" "}
              <span className="font-semibold text-slate-900">
                {data.tenant.name}
              </span>
              .
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Total de ativos
            </div>
            <div className="mt-1 text-3xl font-bold text-slate-950">
              {activeAssets.length}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <Server className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Ativos ativos
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {activeAssets.length}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-emerald-50 p-3">
            <LinkIcon className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Vinculados ao Zabbix
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {data.summary.linkedAssets}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <MonitorCheck className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Com snapshot
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {data.summary.assetsWithValidSnapshot}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-amber-50 p-3">
            <AlertTriangle className="h-6 w-6 text-amber-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Sem vínculo/snapshot
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-700">
            {data.summary.assetsWithoutZabbixLink +
              data.summary.assetsWithMissingSnapshot}
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {activeAssets.map((asset) => {
          const Icon = getAssetIcon(asset.assetType);
          const snapshot = asset.zabbixSnapshot;
          const hasZabbixLink = Boolean(asset.zabbixHostId);
          const hasValidSnapshot = Boolean(snapshot);

          return (
            <div
              key={asset.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="rounded-2xl bg-slate-100 p-3">
                  <Icon className="h-6 w-6 text-slate-800" />
                </div>

                <span
                  className={
                    hasValidSnapshot
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                      : hasZabbixLink
                        ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                        : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                  }
                >
                  {hasValidSnapshot
                    ? "Snapshot OK"
                    : hasZabbixLink
                      ? "Vínculo sem snapshot"
                      : "Sem vínculo Zabbix"}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{asset.name}</h3>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div>
                  <span className="font-semibold text-slate-800">
                    Hostname:
                  </span>{" "}
                  {asset.hostname ?? "Não informado"}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">IP:</span>{" "}
                  {asset.ipAddress ?? "Não informado"}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Tipo:</span>{" "}
                  {asset.assetType}
                </div>
                <div>
                  <span className="font-semibold text-slate-800">SO:</span>{" "}
                  {asset.operatingSystem ?? "Não informado"}
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                <div>
                  Zabbix Host ID:{" "}
                  <span className="font-mono">
                    {asset.zabbixHostId ?? "não vinculado"}
                  </span>
                </div>
                <div className="mt-1">
                  Wazuh Agent ID:{" "}
                  <span className="font-mono">
                    {asset.wazuhAgentId ?? "não vinculado"}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                  {hasValidSnapshot ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                  )}
                  Dados Zabbix
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">
                      Status:
                    </span>{" "}
                    {getZabbixStatusLabel(snapshot?.status)}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">
                      Nome Zabbix:
                    </span>{" "}
                    {snapshot?.name ?? "Sem snapshot"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">
                      Interface:
                    </span>{" "}
                    {snapshot?.interfaceIp ||
                      snapshot?.interfaceDns ||
                      "Sem snapshot"}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">
                      Última sync:
                    </span>{" "}
                    {formatDate(snapshot?.syncedAt)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {activeAssets.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm md:col-span-2 xl:col-span-3">
            Nenhum ativo cadastrado para este tenant.
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <MonitorCheck className="h-6 w-6 text-slate-700" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Como interpretar os vínculos
            </h3>
            <p className="text-sm text-slate-500">
              O ativo cadastrado no portal é cruzado com o snapshot do Zabbix
              usando o campo Zabbix Host ID. Se o ID estiver vazio ou não for
              encontrado na última sincronização, o portal sinaliza o vínculo
              como pendente.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
