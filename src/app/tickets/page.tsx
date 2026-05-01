import { PortalLayout } from "@/components/layout/PortalLayout";

export default function TicketsPage() {
  return (
    <PortalLayout>
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Chamados
        </h2>
        <p className="mt-2 text-slate-600">
          Acompanhamento dos chamados vinculados ao atendimento Partsec.
        </p>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-500">
            Esta área exibirá tickets do Zammad vinculados à organização do cliente.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}
