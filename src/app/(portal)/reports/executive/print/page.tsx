import { redirect } from "next/navigation";
import { auth } from "@/../auth";
import { getTenantExecutiveReport } from "@/lib/queries/executive-report";
import { NoTenantNotice } from "@/components/vulnerabilities/NoTenantNotice";
import { InfoCard } from "@/components/vulnerabilities/InfoCard";
import { VulnerabilitySummaryCards } from "@/components/vulnerabilities/SummaryCard";
import { ExecutiveOverviewCards } from "@/components/reports/executive/ExecutiveOverviewCards";
import { TopAssetsRanking } from "@/components/reports/executive/TopAssetsRanking";
import { TopVulnerabilitiesRanking } from "@/components/reports/executive/TopVulnerabilitiesRanking";
import { RiskInterpretation } from "@/components/reports/executive/RiskInterpretation";
import { Recommendations } from "@/components/reports/executive/Recommendations";
import { PrintHeader } from "@/components/reports/print/PrintHeader";
import { PrintActions } from "@/components/reports/print/PrintActions";
import { PrintFooter } from "@/components/reports/print/PrintFooter";
import { ExecutiveSummary } from "@/components/reports/print/ExecutiveSummary";
import { AnalysisScope } from "@/components/reports/executive/AnalysisScope";
import { AnalysisLimitations } from "@/components/reports/executive/AnalysisLimitations";

export default async function ExecutiveReportPrintPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "PARTSEC_ADMIN") {
    redirect("/admin/tenants");
  }

  const report = await getTenantExecutiveReport();
  const generatedAt = new Date().toISOString();

  if (!report.hasTenant) {
    return (
      <div className="mx-auto max-w-4xl">
        <PrintActions />
        <NoTenantNotice
          title="Relatório Executivo indisponível para este usuário"
          description="Este usuário não está associado a um tenant específico. Para visualizar o relatório executivo, acesse com um usuário do tenant cliente ou associe este usuário a um tenant."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 bg-white print:space-y-6">
      <PrintActions />

      <PrintHeader
        tenantName={report.tenantName}
        lastSyncedAt={report.siem.lastSyncedAt}
        generatedAt={generatedAt}
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
            Ainda não há dados de vulnerabilidades disponíveis para este
            tenant.
          </p>
        </InfoCard>
      )}

      <TopAssetsRanking assets={report.vulnerabilities.topAssets} />
      <TopVulnerabilitiesRanking
        vulnerabilities={report.vulnerabilities.topVulnerabilities}
      />

      <Recommendations recommendations={report.recommendations} />

      <AnalysisLimitations />

      <PrintFooter generatedAt={generatedAt} />
    </div>
  );
}
