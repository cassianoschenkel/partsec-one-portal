import { PortalLayout } from "@/components/layout/PortalLayout";
import { getDemoTenantWithRelations } from "@/lib/queries/tenant";
import { MessageCircle, TicketCheck } from "lucide-react";

export default async function TicketsPage() {
  const tenant = await getDemoTenantWithRelations();

  if (!tenant) {
    return (
      <PortalLayout>
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-800">
          Tenant de demonstração não encontrado.
        </div>
      </PortalLayout>
    );
  }

  const tickets = [
    {
      id: "#1042",
      title: "Análise de alerta crítico no Active Directory",
      status: "Em atendimento",
      priority: "Alta",
      owner: "Equipe Partsec",
      updatedAt: "há 22 min",
    },
    {
      id: "#1039",
      title: "Validação de falha no backup diário",
      status: "Aguardando cliente",
      priority: "Média",
      owner: "Equipe Partsec",
      updatedAt: "há 2h",
    },
    {
      id: "#1031",
      title: "Solicitação de inclusão de novo servidor no monitoramento",
      status: "Aberto",
      priority: "Baixa",
      owner: "NOC Partsec",
      updatedAt: "ontem",
    },
  ];

  return (
    <PortalLayout>
      <div className="space-y-8">
        <section>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Chamados
          </h2>
          <p className="mt-2 text-slate-600">
            Acompanhamento dos chamados vinculados ao atendimento Partsec para{" "}
            <span className="font-semibold">{tenant.name}</span>.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Chamados abertos
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {tickets.length}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Em atendimento
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {
                tickets.filter((ticket) => ticket.status === "Em atendimento")
                  .length
              }
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-medium text-slate-500">
              Aguardando cliente
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-950">
              {
                tickets.filter(
                  (ticket) => ticket.status === "Aguardando cliente"
                ).length
              }
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <TicketCheck className="h-6 w-6 text-slate-700" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Últimos chamados
              </h3>
              <p className="text-sm text-slate-500">
                Estrutura mockada para futura integração com Zammad.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {ticket.id} · {ticket.priority}
                    </div>

                    <h4 className="mt-1 font-bold text-slate-900">
                      {ticket.title}
                    </h4>

                    <div className="mt-2 text-sm text-slate-500">
                      Responsável: {ticket.owner}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      {ticket.status}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {ticket.updatedAt}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-1 h-5 w-5 text-slate-700" />
            <div>
              <div className="font-bold text-slate-900">Próxima evolução</div>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Integrar com a API do Zammad usando o vínculo de organização do
                tenant em <span className="font-mono">IntegrationConfig</span>.
                Inicialmente esta página pode ser somente leitura; depois pode
                permitir abertura e resposta de chamados pelo cliente.
              </p>
            </div>
          </div>
        </section>
      </div>
    </PortalLayout>
  );
}
