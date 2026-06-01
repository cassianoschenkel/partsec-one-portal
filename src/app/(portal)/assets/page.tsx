import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { getTenantAssetsWithZabbixSnapshots } from "@/lib/queries/assets";
import {
  AlertTriangle,
  CheckCircle2,
  LinkIcon,
  MonitorCheck,
  Router,
  Server,
  Shield,
  Wifi,
} from "lucide-react";

function getAssetIcon(assetType: string) {
  if (assetType === "FIREWALL") return Shield;
  if (assetType === "ACCESS_POINT") return Wifi;
  if (assetType === "LINK" || assetType === "ROUTER") return Router;
  return Server;
}

function getAssetTypeLabel(assetType: string) {
  const labels: Record<string, string> = {
    SERVER: "Servidor",
    WORKSTATION: "Estação",
    FIREWALL: "Firewall",
    SWITCH: "Switch",
    ROUTER: "Roteador",
    ACCESS_POINT: "Access Point",
    LINK: "Link",
    SERVICE: "Serviço",
    OTHER: "Outro",
  };

  return labels[assetType] ?? assetType;
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

function getZabbixStatusBadgeClass(status?: string | null) {
  if (status === "0") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "1") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
}

function formatDate(date?: Date | null) {
  if (!date) {
    return "Nunca sincronizado";
  }

  return date.toLocaleString("pt-BR");
}

function getAssetOperationalStatus(asset: {
  zabbixHostId: string | null;
  zabbixSnapshot: {
    status: string;
  } | null;
}) {
  if (asset.zabbixSnapshot?.status === "0") {
    return {
      label: "Operacional",
      className: "bg-emerald-50 text-emerald-700",
    };
  }

  if (asset.zabbixSnapshot?.status === "1") {
    return {
      label: "Não monitorado",
      className: "bg-amber-50 text-amber-700",
    };
  }

  if (asset.zabbixHostId && !asset.zabbixSnapshot) {
    return {
      label: "Vínculo pendente",
      className: "bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Sem vínculo",
    className: "bg-slate-100 text-slate-600",
  };
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
  const monitoredAssets = activeAssets.filter(
    (asset) => asset.zabbixSnapshot?.status === "0"
  );
  const assetsWithSnapshot = activeAssets.filter((asset) => asset.zabbixSnapshot);
  const assetsWithoutZabbixLink = activeAssets.filter(
    (asset) => !asset.zabbixHostId
  );
  const assetsWithMissingSnapshot = activeAssets.filter(
    (asset) => asset.zabbixHostId && !asset.zabbixSnapshot
  );

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Ativos
            </h2>
            <p className="mt-2 text-slate-600">
              Inventário operacional sincronizado a partir do Zabbix para{" "}
              <span className="font-semibold text-slate-900">
                {data.tenant.name}
              </span>
              .
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-4 text-right shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Ativos visíveis
            </div>
            <div className="mt-1 text-3xl font-bold text-slate-950">
              {activeAssets.length}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <Server className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Total de ativos
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {activeAssets.length}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-emerald-50 p-3">
            <MonitorCheck className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Monitorados
          </div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">
            {monitoredAssets.length}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <LinkIcon className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Vinculados
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {data.summary.linkedAssets}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <CheckCircle2 className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Com snapshot
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {assetsWithSnapshot.length}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 w-fit rounded-2xl bg-amber-50 p-3">
            <AlertTriangle className="h-6 w-6 text-amber-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Pendências
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-700">
            {assetsWithoutZabbixLink.length + assetsWithMissingSnapshot.length}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <MonitorCheck className="h-6 w-6 text-slate-800" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Inventário operacional
            </h3>
            <p className="text-sm text-slate-500">
              Ativos importados e atualizados automaticamente a partir dos hosts
              monitorados no Zabbix.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Ativo</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Status operacional</th>
                <th className="px-4 py-3 font-semibold">Interface</th>
                <th className="px-4 py-3 font-semibold">Zabbix</th>
                <th className="px-4 py-3 font-semibold">Última sync</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {activeAssets.map((asset) => {
                const Icon = getAssetIcon(asset.assetType);
                const snapshot = asset.zabbixSnapshot;
                const operationalStatus = getAssetOperationalStatus(asset);

                return (
                  <tr key={asset.id}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-100 p-2">
                          <Icon className="h-5 w-5 text-slate-800" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">
                            {asset.name}
                          </div>
                          <div className="mt-1 font-mono text-xs text-slate-500">
                            {asset.hostname ?? "hostname não informado"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-700">
                      {getAssetTypeLabel(asset.assetType)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-bold",
                          operationalStatus.className,
                        ].join(" ")}
                      >
                        {operationalStatus.label}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-mono text-xs text-slate-700">
                        {snapshot?.interfaceIp ||
                          snapshot?.interfaceDns ||
                          asset.ipAddress ||
                          "-"}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-xs font-bold",
                            getZabbixStatusBadgeClass(snapshot?.status),
                          ].join(" ")}
                        >
                          {getZabbixStatusLabel(snapshot?.status)}
                        </span>
                        <div className="font-mono text-xs text-slate-500">
                          {asset.zabbixHostId ?? "sem vínculo"}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-xs text-slate-500">
                      {formatDate(snapshot?.syncedAt)}
                    </td>
                  </tr>
                );
              })}

              {activeAssets.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Nenhum ativo cadastrado para este tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <LinkIcon className="h-6 w-6 text-slate-700" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Origem e sincronização
            </h3>
            <p className="text-sm text-slate-500">
              O Zabbix permanece como fonte técnica dos hosts monitorados. O
              portal importa novos hosts como ativos e atualiza dados técnicos,
              como nome, hostname e IP, sem depender da API em tempo real na
              navegação do cliente.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
