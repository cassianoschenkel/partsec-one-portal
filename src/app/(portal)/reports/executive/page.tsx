import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/../auth";
import { ArrowLeft, Printer, Target } from "lucide-react";
import { getTenantExecutiveReport } from "@/lib/queries/executive-report";
import { NoTenantNotice } from "@/components/vulnerabilities/NoTenantNotice";
import { InfoCard } from "@/components/vulnerabilities/InfoCard";
import { formatDate } from "@/components/vulnerabilities/vulnerability-format";
import { VulnerabilitySummaryCards } from "@/components/vulnerabilities/SummaryCard";
import { ExecutiveOverviewCards } from "@/components/reports/executive/ExecutiveOverviewCards";
import { TopAssetsRanking } from "@/components/reports/executive/TopAssetsRanking";
import { TopVulnerabilitiesRanking } from "@/components/reports/executive/TopVulnerabilitiesRanking";
import { RiskInterpretation } from "@/components/reports/executive/RiskInterpretation";
import { Recommendations } from "@/components/reports/executive/Recommendations";

export default async function ExecutiveReportPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "PARTSEC_ADMIN") {
    redirect("/admin/tenants");
  }

  const report = await getTenantExecutiveReport();

  if (!report.hasTenant) {
    return (
      <NoTenantNotice
        title="Relatório Executivo indisponível para este usuário"
        description="Este usuário não está associado a um tenant específico. Para visualizar o relatório executivo, acesse com um usuário do tenant cliente ou associe este usuário a um tenant."
      />
    );
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[#071426] p-8 text-white shadow-sm">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100 transition hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para relatórios
            </Link>

            <Link
              href="/reports/executive/print"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100 transition hover:bg-white/20"
            >
              <Printer className="h-4 w-4" />
              Versão para impressão
            </Link>
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100">
            <Target className="h-4 w-4" />
            Relatório Executivo
          </div>

          <h2 className="text-3xl font-bold tracking-tight">
            Relatório Executivo{report.tenantName ? ` — ${report.tenantName}` : ""}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Visão de alto nível do ambiente, consolidando os principais
            indicadores de SIEM, agentes de segurança, vulnerabilidades e
            ativos monitorados.
          </p>

          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300">
            {report.siem.lastSyncedAt
              ? `Última sincronização disponível: ${formatDate(
                  report.siem.lastSyncedAt
                )}`
              : "Visão atual"}
          </p>
        </div>
      </section>

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
            Ainda não há dados de vulnerabilidades disponíveis para este
            tenant.
          </p>
        </InfoCard>
      )}

      <Recommendations recommendations={report.recommendations} />
    </div>
  );
}
