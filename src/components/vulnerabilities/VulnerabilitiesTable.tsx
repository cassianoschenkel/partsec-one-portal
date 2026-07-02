import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { formatDate } from "./vulnerability-format";
import { SeverityBadge, StatusBadge } from "./VulnerabilityBadges";

export type VulnerabilityListItem = {
  id: string;
  status: string | null;
  severity: string | null;
  cve: string;
  title: string | null;
  assetName: string;
  assetIp: string | null;
  operatingSystem?: string | null;
  packageName: string | null;
  condition: string | null;
  packageVersion: string | null;
  score: number | string | null;
  lastSeenAt: string | null;
};

export function VulnerabilitiesTable({
  vulnerabilities,
  maxItems,
  hrefFor,
}: {
  vulnerabilities: VulnerabilityListItem[];
  maxItems: number;
  hrefFor: (vulnerability: VulnerabilityListItem) => string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-950">
          Vulnerabilidades encontradas
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Listagem limitada aos {maxItems} itens mais relevantes conforme os
          filtros aplicados.
        </p>
      </div>

      {vulnerabilities.length === 0 ? (
        <div className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
            <ShieldCheck className="h-6 w-6 text-emerald-700" />
          </div>

          <h3 className="text-base font-bold text-slate-950">
            Nenhuma vulnerabilidade encontrada
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Não há vulnerabilidades para os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Severidade</th>
                <th className="px-6 py-4 font-bold">CVE</th>
                <th className="px-6 py-4 font-bold">Ativo</th>
                <th className="px-6 py-4 font-bold">Pacote</th>
                <th className="px-6 py-4 font-bold">Versão</th>
                <th className="px-6 py-4 font-bold">Score</th>
                <th className="px-6 py-4 font-bold">Última detecção</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {vulnerabilities.map((vulnerability) => (
                <tr key={vulnerability.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 align-top">
                    <StatusBadge status={vulnerability.status} />
                  </td>

                  <td className="px-6 py-4 align-top">
                    <SeverityBadge severity={vulnerability.severity} />
                  </td>

                  <td className="px-6 py-4 align-top">
                    <Link
                      href={hrefFor(vulnerability)}
                      className="font-bold text-slate-950 underline decoration-slate-300 underline-offset-4 transition hover:text-slate-700"
                    >
                      {vulnerability.cve}
                    </Link>
                    <p className="mt-1 line-clamp-2 max-w-md text-xs leading-5 text-slate-500">
                      {vulnerability.title ?? "Sem descrição disponível."}
                    </p>
                  </td>

                  <td className="px-6 py-4 align-top">
                    <div className="font-semibold text-slate-900">
                      {vulnerability.assetName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {vulnerability.assetIp ?? "IP não informado"}
                    </div>
                    {vulnerability.operatingSystem && (
                      <div className="mt-1 max-w-xs truncate text-xs text-slate-400">
                        {vulnerability.operatingSystem}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 align-top">
                    <div className="font-medium text-slate-900">
                      {vulnerability.packageName || "—"}
                    </div>
                    {vulnerability.condition && (
                      <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                        {vulnerability.condition}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 align-top text-slate-600">
                    {vulnerability.packageVersion || "—"}
                  </td>

                  <td className="px-6 py-4 align-top font-semibold text-slate-900">
                    {vulnerability.score ?? "—"}
                  </td>

                  <td className="px-6 py-4 align-top text-slate-600">
                    {formatDate(vulnerability.lastSeenAt)}
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
