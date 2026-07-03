import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { FileText, Gauge, Target, Wrench } from "lucide-react";
import { DataSourceGrid } from "@/components/reports/DataSourceGrid";
import { ReportModelCard } from "@/components/reports/ReportModelCard";
import { AiAnalysisRoadmapCard } from "@/components/reports/AiAnalysisRoadmapCard";
import { ReportPreviewMock } from "@/components/reports/ReportPreviewMock";

const reportModels = [
  {
    title: "Relatório Executivo",
    icon: Target,
    audience: "Diretoria e tomadores de decisão.",
    purpose:
      "Visão de alto nível do ambiente, com foco em risco geral e prioridades para apoiar decisões estratégicas.",
    examples: [
      "Resumo do nível de risco do período",
      "Principais indicadores consolidados",
      "Evolução em relação ao período anterior",
      "Recomendações estratégicas",
    ],
  },
  {
    title: "Relatório Gerencial",
    icon: Gauge,
    audience: "Gestores de TI e segurança.",
    purpose:
      "Acompanhamento tático do ambiente, cobrindo indicadores operacionais e de atendimento para gestão do dia a dia.",
    examples: [
      "Status dos ativos monitorados",
      "Volume e atendimento de chamados",
      "Vulnerabilidades por severidade",
      "Eventos de segurança do período",
    ],
  },
  {
    title: "Relatório Técnico",
    icon: Wrench,
    audience: "Times técnicos e de segurança.",
    purpose:
      "Detalhamento técnico com dados granulares para investigação, priorização e remediação.",
    examples: [
      "Lista detalhada de vulnerabilidades",
      "Eventos relevantes do SIEM",
      "Ativos afetados por ocorrência",
      "Chamados técnicos relacionados",
    ],
  },
];

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "PARTSEC_ADMIN") {
    redirect("/admin/tenants");
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[#071426] p-8 text-white shadow-sm">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100">
            <FileText className="h-4 w-4" />
            Relatórios
          </div>

          <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Os relatórios consolidam, em um só lugar, as informações de
            monitoramento, segurança, vulnerabilidades e suporte do seu
            ambiente, oferecendo uma visão executiva e técnica do que está
            sendo protegido e acompanhado.
          </p>
        </div>
      </section>

      <DataSourceGrid />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900">
            Modelos de relatório
          </h3>
          <p className="text-sm text-slate-500">
            Três formatos pensados para públicos e níveis de detalhe
            diferentes.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {reportModels.map((model) => (
            <ReportModelCard
              key={model.title}
              icon={model.icon}
              title={model.title}
              audience={model.audience}
              purpose={model.purpose}
              examples={model.examples}
            />
          ))}
        </div>
      </section>

      <AiAnalysisRoadmapCard />

      <ReportPreviewMock />
    </div>
  );
}
