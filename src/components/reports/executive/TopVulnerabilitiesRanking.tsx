import { InfoCard } from "@/components/vulnerabilities/InfoCard";
import { SeverityBadge } from "@/components/vulnerabilities/VulnerabilityBadges";

export function TopVulnerabilitiesRanking({
  vulnerabilities,
}: {
  vulnerabilities: Array<{
    id: string;
    cve: string;
    title: string | null;
    severity: string | null;
    score: number | null;
    assetName: string;
  }>;
}) {
  if (vulnerabilities.length === 0) {
    return (
      <InfoCard title="Vulnerabilidades abertas mais críticas">
        <p className="text-sm text-slate-500">
          Nenhuma vulnerabilidade aberta encontrada no período acompanhado.
        </p>
      </InfoCard>
    );
  }

  return (
    <InfoCard title="Vulnerabilidades abertas mais críticas">
      <ol className="space-y-3">
        {vulnerabilities.map((vulnerability, index) => (
          <li
            key={vulnerability.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500 shadow-sm">
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {vulnerability.cve}
                </p>
                <p className="text-xs text-slate-500">
                  {vulnerability.assetName}
                </p>
              </div>
            </div>

            <SeverityBadge severity={vulnerability.severity} />
          </li>
        ))}
      </ol>
    </InfoCard>
  );
}
