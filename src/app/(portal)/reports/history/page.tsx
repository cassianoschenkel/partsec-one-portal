import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/../auth";
import { ArrowLeft, History } from "lucide-react";
import { getTenantReportHistory } from "@/lib/queries/report-history";
import { NoTenantNotice } from "@/components/vulnerabilities/NoTenantNotice";
import { ReportHistoryTable } from "@/components/reports/ReportHistoryTable";

export default async function ReportHistoryPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "PARTSEC_ADMIN") {
    redirect("/admin/tenants");
  }

  const history = await getTenantReportHistory();

  if (!history.hasTenant) {
    return (
      <NoTenantNotice
        title="Histórico de relatórios indisponível para este usuário"
        description="Este usuário não está associado a um tenant específico. Para visualizar o histórico de relatórios, acesse com um usuário do tenant cliente ou associe este usuário a um tenant."
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
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100">
            <History className="h-4 w-4" />
            Histórico de relatórios
          </div>

          <h2 className="text-3xl font-bold tracking-tight">
            Histórico de relatórios{history.tenantName ? ` — ${history.tenantName}` : ""}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Consulte os relatórios já gerados para o seu ambiente, com título,
            tipo, status, período de referência e data de geração.
          </p>
        </div>
      </section>

      <ReportHistoryTable reports={history.reports} />
    </div>
  );
}
