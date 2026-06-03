import Link from "next/link";
import { notFound } from "next/navigation";
import { updateTenantAssetAction } from "@/app/actions/tenant-actions";
import { getAdminTenantAssetById } from "@/lib/queries/admin-assets";
import { ArrowLeft, Save, Server } from "lucide-react";

type EditTenantAssetPageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

const assetTypes = [
  { value: "SERVER", label: "Servidor" },
  { value: "WORKSTATION", label: "Estação" },
  { value: "FIREWALL", label: "Firewall" },
  { value: "SWITCH", label: "Switch" },
  { value: "ROUTER", label: "Roteador" },
  { value: "ACCESS_POINT", label: "Access Point" },
  { value: "LINK", label: "Link" },
  { value: "SERVICE", label: "Serviço" },
  { value: "OTHER", label: "Outro" },
];

export default async function EditTenantAssetPage({
  params,
}: EditTenantAssetPageProps) {
  const { slug, id } = await params;

  const data = await getAdminTenantAssetById({
    tenantSlug: slug,
    assetId: id,
  });

  if (!data) {
    notFound();
  }

  const updateAsset = updateTenantAssetAction.bind(
    null,
    data.tenant.slug,
    data.asset.id
  );

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <Link
              href={`/admin/tenants/${data.tenant.slug}`}
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para o tenant
            </Link>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <Server className="h-6 w-6 text-slate-800" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Edição de ativo
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  {data.asset.name}
                </h2>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-slate-600">
              Ajuste os dados administrativos do ativo vinculado ao tenant{" "}
              <span className="font-semibold text-slate-900">
                {data.tenant.name}
              </span>
              . Campos técnicos como nome, hostname e IP podem ser atualizados
              automaticamente pelo Zabbix em sincronizações futuras.
            </p>
          </div>
        </div>

        <form action={updateAsset} className="grid gap-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nome de exibição
              </label>
              <input
                id="name"
                name="name"
                defaultValue={data.asset.name}
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="assetType"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Tipo do ativo
              </label>
              <select
                id="assetType"
                name="assetType"
                defaultValue={data.asset.assetType}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                {assetTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="hostname"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Hostname
              </label>
              <input
                id="hostname"
                name="hostname"
                defaultValue={data.asset.hostname ?? ""}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="ipAddress"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                IP
              </label>
              <input
                id="ipAddress"
                name="ipAddress"
                defaultValue={data.asset.ipAddress ?? ""}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="operatingSystem"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Sistema operacional / plataforma
              </label>
              <input
                id="operatingSystem"
                name="operatingSystem"
                defaultValue={data.asset.operatingSystem ?? ""}
                placeholder="Ex.: Ubuntu, Windows Server, Sophos SFOS, Check Point Gaia..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="zabbixHostId"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Zabbix Host ID
              </label>
              <input
                id="zabbixHostId"
                name="zabbixHostId"
                defaultValue={data.asset.zabbixHostId ?? ""}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="wazuhAgentId"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Wazuh Agent ID
              </label>
              <input
                id="wazuhAgentId"
                name="wazuhAgentId"
                defaultValue={data.asset.wazuhAgentId ?? ""}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div className="flex items-end">
              <label className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={data.asset.isActive}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Ativo visível/ativo no portal
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              defaultValue={data.asset.description ?? ""}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
            <Link
              href={`/admin/tenants/${data.tenant.slug}`}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#071426] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544]"
            >
              <Save className="h-4 w-4" />
              Salvar alterações
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
