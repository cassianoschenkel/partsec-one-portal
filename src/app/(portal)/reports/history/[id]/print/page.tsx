import { notFound, redirect } from "next/navigation";
import { auth } from "@/../auth";
import { getTenantExecutiveReportRun } from "@/lib/queries/report-detail";
import { parseExecutiveReportSnapshot } from "@/lib/report-snapshot";
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
import { PrintHeader } from "@/components/reports/print/PrintHeader";
import { PrintActions } from "@/components/reports/print/PrintActions";
import { PrintFooter } from "@/components/reports/print/PrintFooter";
import { ExecutiveSummary } from "@/components/reports/print/ExecutiveSummary";

type SavedExecutiveReportPrintPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SavedExecutiveReportPrintPage({
  params,
}: SavedExecutiveReportPrintPageProps) {
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
    return (
      <SavedReportUnavailableNotice
        backHref={`/reports/history/${reportRun.id}`}
      />
    );
  }

  const report = snapshot.report;
  const generatedAt = snapshot.generatedAt;
  const lastSyncedAt = snapshot.sourceLastSyncedAt;
  const title = reportRun.title;
  const periodLabel = reportRun.periodLabel;

  return (
    <div className="mx-auto max-w-4xl space-y-8 bg-white print:space-y-6">
      <PrintActions
        backHref={`/reports/history/${reportRun.id}`}
        backLabel="Voltar ao relatório salvo"
      />

      <PrintHeader
        tenantName={report.tenantName}
        lastSyncedAt={lastSyncedAt}
        generatedAt={generatedAt}
        title={title}
        periodLabel={periodLabel}
        savedReport
      />

      <ExecutiveSummary
        tenantName={report.tenantName}
        riskLevel={report.riskLevel}
        hasVulnerabilityData={report.hasVulnerabilityData}
        vulnerabilities={report.vulnerabilities}
        agents={report.agents}
        assets={report.assets}
      />

      <AnalysisScope />

      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-950">
          Indicadores principais
        </h2>
        <ExecutiveOverviewCards data={report} />
      </section>

      <RiskInterpretation riskLevel={report.riskLevel} />

      {report.hasVulnerabilityData ? (
        <section>
          <h2 className="mb-4 text-lg font-bold text-slate-950">
            Vulnerabilidades por severidade
          </h2>
          <VulnerabilitySummaryCards
            summary={{
              critical: report.vulnerabilities.critical,
              high: report.vulnerabilities.high,
              medium: report.vulnerabilities.medium,
              low: report.vulnerabilities.low,
              resolved: report.vulnerabilities.resolved,
            }}
          />
        </section>
      ) : (
        <InfoCard title="Vulnerabilidades por severidade">
          <p className="text-sm text-slate-500">
            Não havia dados de vulnerabilidades disponíveis no momento da
            geração deste relatório.
          </p>
        </InfoCard>
      )}

      <TopAssetsRanking assets={report.vulnerabilities.topAssets} />
      <TopVulnerabilitiesRanking
        vulnerabilities={report.vulnerabilities.topVulnerabilities}
      />

      <Recommendations recommendations={report.recommendations} />

      <AnalysisLimitations />

      <PrintFooter
        generatedAt={generatedAt}
        description="Documento gerado a partir do snapshot salvo no portal."
      />
    </div>
  );
}
