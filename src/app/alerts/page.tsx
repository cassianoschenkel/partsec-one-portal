import { PortalLayout } from "@/components/layout/PortalLayout";

export default function AlertsPage() {
  return (
    <PortalLayout>
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Alertas
        </h2>
        <p className="mt-2 text-slate-600">
          Alertas de segurança, disponibilidade e performance consolidados.
        </p>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-500">
            Esta área exibirá alertas originados do Wazuh e do Zabbix.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}
