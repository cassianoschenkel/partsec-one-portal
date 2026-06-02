import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { getTenantAssetsWithZabbixSnapshots } from "@/lib/queries/assets";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  LinkIcon,
  MonitorCheck,
  Router,
  Server,
  Shield,
  Wifi,
} from "lucide-react";

type AssetsPageProps = {
  searchParams?: Promise<{
    status?: "all" | "monitored" | "linked" | "pending" | "unlinked";
    type?: string;
  }>;
};

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

function buildAssetsHref({
  status,
  type,
}: {
  status?: string;
  type?: string;
}) {
  const params = new URLSearchParams();

  if (status && status !== "all") {
    params.set("status", status);
  }

  if (type) {
    params.set("type", type);
  }

  const query = params.toString();

  return query ? `/assets?${query}` : "/assets";
}

export default async function AssetsPage({ searchParams }: AssetsPageProps) {
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

  const params = searchParams ? await searchParams : {};
  const statusFilter = params.status ?? "all";
  const typeFilter = params.type;

  const data = await getTenantAssetsWithZabbixSnapshots(session.user.tenantId, {
    status: statusFilter,
    type: typeFilter,
  });

  if (!data) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800">
        Tenant não encontrado.
      </div>
    );
  }

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
              Resultado filtrado
            </div>
            <div className="mt-1 text-3xl font-bold text-slate-950">
              {data.summary.filteredAssets}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <Link
          href={buildAssetsHref({})}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <Server className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">
            Total de ativos
          </div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {data.summary.totalAssets}
          </div>
        </Link>

        <Link
          href={buildAssetsHref({ status: "monitored" })}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 w-fit rounded-2xl bg-emerald-50 p-3">
            <MonitorCheck className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">Monitorados</div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">
            {data.summary.monitoredAssets}
          </div>
        </Link>

        <Link
          href={buildAssetsHref({ status: "linked" })}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <LinkIcon className="h-6 w-6 text-slate-800" />
          </div>
          <div className="text-sm font-medium text-slate-500">Vinculados</div>
          <div className="mt-2 text-3xl font-bold text-slate-950">
            {data.summary.linkedAssets}
          </div>
        </Link>

        <Link
          href={buildAssetsHref({ status: "pending" })}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 w-fit rounded-2xl bg-amber-50 p-3">
            <AlertTriangle className="h-6 w-6 text-amber-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">Pendências</div>
          <div className="mt-2 text-3xl font-bold text-amber-700">
            {data.summary.pendingAssets}
          </div>
        </Link>

        <Link
          href={buildAssetsHref({ status: "unlinked" })}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
            <AlertTriangle className="h-6 w-6 text-slate-700" />
          </div>
          <div className="text-sm font-medium text-slate-500">Sem vínculo</div>
          <div className="mt-2 text-3xl font-bold text-slate-700">
            {data.summary.assetsWithoutZabbixLink}
          </div>
        </Link>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <Filter className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Filtros</h3>
            <p className="text-sm text-slate-500">
              Filtre o inventário por tipo ou situação operacional.
            </p>
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" method="GET">
          <div>
            <label
              htmlFor="status"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            >
              <option value="all">Todos</option>
              <option value="monitored">Monitorados</option>
              <option value="linked">Vinculados ao Zabbix</option>
              <option value="pending">Pendências</option>
              <option value="unlinked">Sem vínculo</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="type"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Tipo
            </label>
            <select
              id="type"
              name="type"
              defaultValue={typeFilter ?? ""}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            >
              <option value="">Todos</option>
              <option value="FIREWALL">Firewall</option>
              <option value="SERVER">Servidor</option>
              <option value="SWITCH">Switch</option>
              <option value="ROUTER">Roteador</option>
              <option value="ACCESS_POINT">Access Point</option>
              <option value="LINK">Link</option>
              <option value="SERVICE">Serviço</option>
              <option value="WORKSTATION">Estação</option>
              <option value="OTHER">Outro</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-2xl bg-[#071426] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544]"
            >
              Aplicar filtro
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(data.summary.assetsByType).map(([type, count]) => {
          const Icon = getAssetIcon(type);

          return (
            <Link
              key={type}
              href={buildAssetsHref({
                status: statusFilter,
                type,
              })}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 w-fit rounded-2xl bg-slate-100 p-3">
                <Icon className="h-5 w-5 text-slate-800" />
              </div>
              <div className="text-sm font-medium text-slate-500">
                {getAssetTypeLabel(type)}
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-950">
                {count}
              </div>
            </Link>
          );
        })}
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
              {data.assets.map((asset) => {
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

              {data.assets.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Nenhum ativo encontrado para os filtros selecionados.
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
