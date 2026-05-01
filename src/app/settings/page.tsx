import { PortalLayout } from "@/components/layout/PortalLayout";

export default function SettingsPage() {
  return (
    <PortalLayout>
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Configurações
        </h2>
        <p className="mt-2 text-slate-600">
          Preferências do portal, usuários autorizados e dados do cliente.
        </p>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-slate-500">
            Esta área será usada futuramente para gestão de usuários, contatos e permissões.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}
