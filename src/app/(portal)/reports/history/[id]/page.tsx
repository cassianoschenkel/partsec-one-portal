import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/../auth";
import { ArrowLeft, Printer, Target } from "lucide-react";
import { getTenantExecutiveReportRun } from "@/lib/queries/report-detail";
import { parseExecutiveReportSnapshot } from "@/lib/report-snapshot";
import { formatDate } from "@/components/vulnerabilities/vulnerability-format";
import { InfoCard } from "@/components/vulnerabilities/InfoCard";
import { VulnerabilitySummaryCards } from "@/components/vulnerabilities/SummaryCard";
import { SavedReportUnavailableNotice } from "@/components/reports/SavedReportUnavailableNotice";
import { AnalysisScope } from "@/components/reports/executive/AnalysisScope";
import { ExecutiveOverviewCards } from "@/components/reports/executive/ExecutiveOverviewCards";
import { RiskInterpretation } from "@/components/reports/executive/RiskInterpretation";
import { TopAssetsRanking } from "@/components/reports/executive/TopAssetsRanking";
import { TopVulnerabilitiesRanking } from "@/components/reports/executive/TopVulnerabilitiesRanking";
import { Recommendations } from "@/components/reports/executive/Recommendations";
import { AnalysisLimitations } from "@/components/reports/executive/AnalysisLimitations";

type SavedExecutiveReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SavedExecutiveReportPage({
  params,
}: SavedExecutiveReportPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "PARTSEC_ADMIN") {
    redirect("/admin/tenants");
  }

  const { id } = await params;

  const reportRun = await getTenantExecutiveReportRun(id);

  if (!reportRun) {
    notFound();
  }

  const snapshot = parseExecutiveReportSnapshot(reportRun.data);

  if (!snapshot) {
    return <SavedReportUnavailableNotice backHref="/reports/history" />;
  }

  const report = snapshot.report;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[#071426] p-8 text-white shadow-sm">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/reports/history"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100 transition hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao histórico
            </Link>

            <Link
              href={`/reports/history/${reportRun.id}/print`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100 transition hover:bg-white/20"
            >
              <Printer className="h-4 w-4" />
              Versão para impressão
            </Link>
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100">
            <Target className="h-4 w-4" />
            Relatório Executivo salvo
          </div>

          <h2 className="text-3xl font-bold tracking-tight">
            {reportRun.title}
            {report.tenantName ? ` — ${report.tenantName}` : ""}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Visão consolidada do ambiente registrada no momento da geração
            deste relatório. Os valores exibidos não refletem alterações
            posteriores nos dados atuais.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300">
              {`Período de referência: ${reportRun.periodLabel ?? "—"}`}
            </p>

            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300">
              {`Relatório gerado em: ${formatDate(snapshot.generatedAt)}`}
            </p>

            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300">
              {`Última sincronização da fonte: ${formatDate(
                snapshot.sourceLastSyncedAt
              )}`}
            </p>
          </div>
        </div>
      </section>

      <AnalysisScope />

      <ExecutiveOverviewCards data={report} />

      <RiskInterpretation riskLevel={report.riskLevel} />

      {report.hasVulnerabilityData ? (
        <>
          <VulnerabilitySummaryCards
            summary={{
              critical: report.vulnerabilities.critical,
              high: report.vulnerabilities.high,
              medium: report.vulnerabilities.medium,
              low: report.vulnerabilities.low,
              resolved: report.vulnerabilities.resolved,
            }}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <TopAssetsRanking assets={report.vulnerabilities.topAssets} />
            <TopVulnerabilitiesRanking
              vulnerabilities={report.vulnerabilities.topVulnerabilities}
            />
          </div>
        </>
      ) : (
        <InfoCard title="Vulnerabilidades">
          <p className="text-sm text-slate-500">
            Não havia dados de vulnerabilidades disponíveis no momento da
            geração deste relatório.
          </p>
        </InfoCard>
      )}

      <Recommendations recommendations={report.recommendations} />

      <AnalysisLimitations />
    </div>
  );
}
