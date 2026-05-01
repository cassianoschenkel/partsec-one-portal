import { PortalLayout } from "@/components/layout/PortalLayout";
import { getDemoTenantWithRelations } from "@/lib/queries/tenant";
import { Download, FileText } from "lucide-react";

export default async function ReportsPage() {
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

  const reports = [
    {
      title: "Relatório Executivo Mensal",
      period: "Abril/2026",
      type: "Executivo",
      status: "Disponível",
    },
    {
      title: "Relatório de Disponibilidade",
      period: "Últimos 30 dias",
      type: "Monitoramento",
      status: "Disponível",
    },
    {
      title: "Relatório de Eventos de Segurança",
      period: "Últimos 7 dias",
      type: "Segurança",
      status: "Em processamento",
    },
  ];

  return (
    <PortalLayout>
      <div className="space-y-8">
        <section>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Relatórios
          </h2>
          <p className="mt-2 text-slate-600">
            Relatórios executivos e técnicos do ambiente monitorado para{" "}
            <span className="font-semibold">{tenant.name}</span>.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {reports.map((report) => (
            <div
              key={report.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="rounded-2xl bg-slate-100 p-3">
                  <FileText className="h-6 w-6 text-slate-800" />
                </div>

                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {report.status}
                </span>
              </div>

              <h3 className="font-bold text-slate-900">{report.title}</h3>

              <div className="mt-3 space-y-1 text-sm text-slate-500">
                <div>Período: {report.period}</div>
                <div>Tipo: {report.type}</div>
              </div>

              <button
                type="button"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#071426] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0f2544] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={report.status !== "Disponível"}
              >
                <Download className="h-4 w-4" />
                Baixar relatório
              </button>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">
            Estratégia para relatórios
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            No MVP, os relatórios podem ser arquivos PDF gerados pela equipe
            Partsec e vinculados ao tenant. Em uma fase posterior, o portal pode
            gerar relatórios automaticamente a partir de dados normalizados de
            Zabbix, Wazuh e Zammad.
          </p>
        </section>
      </div>
    </PortalLayout>
  );
}
