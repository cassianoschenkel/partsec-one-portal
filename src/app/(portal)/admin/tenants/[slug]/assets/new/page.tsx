import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createTenantAssetAction } from "@/app/actions/tenant-actions";
import { getAdminTenantBySlug } from "@/lib/queries/admin";
//import { ArrowLeft, MonitorPlus, Server } from "lucide-react";
//import { ArrowLeft, PlusCircle, Server } from "lucide-react";
import { PlusCircle, Server } from "lucide-react";

type NewTenantAssetPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewTenantAssetPage({
  params,
}: NewTenantAssetPageProps) {
  const { slug } = await params;
  const tenant = await getAdminTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const createAssetForTenant = createTenantAssetAction.bind(null, tenant.slug);

  return (
    <div className="space-y-8">
	<AdminPageHeader
	  backHref={`/admin/tenants/${tenant.slug}`}
	  backLabel="Voltar para o tenant"
	  badgeLabel="Novo ativo"
	  badgeIcon={PlusCircle}
	  title="Adicionar ativo"
	  description={
		<>
			Cadastre um novo ativo monitorado para o tenant{" "}
			<span className="font-semibold text-slate-900">{tenant.name}</span>.
		</>
  }
/>

      <section className="grid gap-6 xl:grid-cols-3">
        <form
          action={createAssetForTenant}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Server className="h-6 w-6 text-slate-800" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">Dados do ativo</h3>
              <p className="text-sm text-slate-500">
                Informações básicas e vínculos técnicos.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nome do ativo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Ex: Servidor SQL 02"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
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
                type="text"
                placeholder="Ex: SRV-SQL-02"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
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
                type="text"
                placeholder="Ex: 10.0.0.30"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
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
                defaultValue="SERVER"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="SERVER">Servidor</option>
                <option value="WORKSTATION">Estação de trabalho</option>
                <option value="FIREWALL">Firewall</option>
                <option value="SWITCH">Switch</option>
                <option value="ROUTER">Roteador</option>
                <option value="ACCESS_POINT">Access Point</option>
                <option value="LINK">Link</option>
                <option value="SERVICE">Serviço</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="operatingSystem"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Sistema operacional / Plataforma
              </label>
              <input
                id="operatingSystem"
                name="operatingSystem"
                type="text"
                placeholder="Ex: Windows Server 2022, Ubuntu 24.04, Sophos Firewall"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
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
                type="text"
                placeholder="Opcional"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
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
                type="text"
                placeholder="Opcional"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Observações sobre função, criticidade ou contexto do ativo"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <Link
              href={`/admin/tenants/${tenant.slug}`}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-2xl bg-[#071426] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544]"
            >
              Criar ativo
            </button>
          </div>
        </form>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900">Vínculos técnicos</h3>

          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <p>
              Os campos de Zabbix e Wazuh permitem relacionar este ativo aos
              objetos reais das ferramentas.
            </p>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">
                Uso previsto:
              </div>
              <ul className="mt-2 list-inside list-disc">
                <li>Zabbix Host ID para métricas e disponibilidade;</li>
                <li>Wazuh Agent ID para eventos e segurança;</li>
                <li>ativo sem vínculo para controle administrativo.</li>
              </ul>
            </div>

            <p>
              Em uma fase posterior, esses vínculos poderão ser preenchidos
              automaticamente ao importar dados das APIs.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
