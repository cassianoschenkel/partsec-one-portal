import { FileClock } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/components/vulnerabilities/vulnerability-format";
import {
  getReportStatusBadgeClass,
  translateReportStatus,
  translateReportType,
} from "./report-history-format";
import type { ReportHistoryItem } from "@/lib/queries/report-history";

export function ReportHistoryTable({
  reports,
}: {
  reports: ReportHistoryItem[];
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-950">
          Relatórios salvos
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Histórico de relatórios gerados para o seu ambiente.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
            <FileClock className="h-6 w-6 text-slate-500" />
          </div>

          <h3 className="text-base font-bold text-slate-950">
            Nenhum relatório salvo ainda.
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Os relatórios gerados futuramente ficarão disponíveis nesta área.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4 font-bold">Título</th>
                <th className="px-6 py-4 font-bold">Tipo</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Período</th>
                <th className="px-6 py-4 font-bold">Gerado em</th>
                <th className="px-6 py-4 font-bold">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 align-top font-bold text-slate-950">
                    {report.title}
                  </td>

                  <td className="px-6 py-4 align-top text-slate-600">
                    {translateReportType(report.type)}
                  </td>

                  <td className="px-6 py-4 align-top">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getReportStatusBadgeClass(
                        report.status
                      )}`}
                    >
                      {translateReportStatus(report.status)}
                    </span>
                  </td>

                  <td className="px-6 py-4 align-top text-slate-600">
                    {report.periodLabel ?? "—"}
                  </td>

                  <td className="px-6 py-4 align-top text-slate-600">
                    {formatDate(report.generatedAt)}
                  </td>

                  <td className="px-6 py-4 align-top">
                    {report.type === "EXECUTIVE" &&
                    report.status === "GENERATED" ? (
                      <Link
                        href={`/reports/history/${report.id}`}
                        className="font-bold text-cyan-700 hover:underline"
                      >
                        Abrir relatório
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
