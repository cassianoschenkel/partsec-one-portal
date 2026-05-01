import { PortalLayout } from "@/components/layout/PortalLayout";

export default function AssetsPage() {
  return (
    <PortalLayout>
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Ativos
        </h2>
        <p className="mt-2 text-slate-600">
          Inventário de servidores, estações, firewalls, links e serviços monitorados.
        </p>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-500">
            Esta área exibirá os ativos vinculados ao tenant do cliente.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}
