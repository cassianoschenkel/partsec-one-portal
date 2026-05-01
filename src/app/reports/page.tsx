import { PortalLayout } from "@/components/layout/PortalLayout";

export default function ReportsPage() {
  return (
    <PortalLayout>
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Relatórios
        </h2>
        <p className="mt-2 text-slate-600">
          Relatórios executivos e técnicos do ambiente monitorado.
        </p>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-500">
            Esta área permitirá visualizar e baixar relatórios mensais, semanais ou sob demanda.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}
