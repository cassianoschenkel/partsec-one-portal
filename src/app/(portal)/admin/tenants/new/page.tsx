import Link from "next/link";
import { createTenantAction } from "@/app/actions/tenant-actions";
import { ArrowLeft, Building2, PlusCircle } from "lucide-react";

export default function NewTenantPage() {
  return (
    <div className="space-y-8">
      <section>
        <Link
          href="/admin/tenants"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para tenants
        </Link>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          <PlusCircle className="h-4 w-4" />
          Novo tenant
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Cadastrar novo tenant
        </h2>

        <p className="mt-2 text-slate-600">
          Crie um novo cliente na estrutura multi-tenant do Partsec One.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <form
          action={createTenantAction}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Building2 className="h-6 w-6 text-slate-800" />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">Dados do cliente</h3>
              <p className="text-sm text-slate-500">
                Informações principais do tenant.
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nome do cliente
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Ex: Empresa ABC Ltda"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="document"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Documento
              </label>
              <input
                id="document"
                name="document"
                type="text"
                placeholder="CNPJ ou identificação interna"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="slug"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Slug
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                placeholder="Opcional. Ex: empresa-abc"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Se vazio, o slug será gerado automaticamente a partir do nome do
                cliente. O slug será usado nas URLs administrativas e nos
                vínculos internos.
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <Link
              href="/admin/tenants"
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="rounded-2xl bg-[#071426] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544]"
            >
              Criar tenant
            </button>
          </div>
        </form>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-bold text-slate-900">O que será criado?</h3>

          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <p>
              Ao cadastrar um tenant, o portal criará o registro principal do
              cliente e os vínculos iniciais de integração.
            </p>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">
                Integrações criadas como inativas:
              </div>
              <ul className="mt-2 list-inside list-disc">
                <li>Zabbix</li>
                <li>Wazuh</li>
                <li>Zammad</li>
              </ul>
            </div>

            <p>
              Depois, na tela de detalhe do tenant, poderemos evoluir para
              configurar URLs, grupos externos, organizações, usuários e ativos.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
