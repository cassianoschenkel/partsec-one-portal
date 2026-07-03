import { InfoCard } from "@/components/vulnerabilities/InfoCard";

export function TopAssetsRanking({
  assets,
}: {
  assets: Array<{
    wazuhAgentId: string;
    name: string;
    ip: string | null;
    openCount: number;
  }>;
}) {
  if (assets.length === 0) {
    return (
      <InfoCard title="Ativos com mais vulnerabilidades abertas">
        <p className="text-sm text-slate-500">
          Nenhuma vulnerabilidade aberta encontrada nos ativos monitorados.
        </p>
      </InfoCard>
    );
  }

  return (
    <InfoCard title="Ativos com mais vulnerabilidades abertas">
      <ol className="space-y-3">
        {assets.map((asset, index) => (
          <li
            key={asset.wazuhAgentId}
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500 shadow-sm">
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {asset.name}
                </p>
                {asset.ip && (
                  <p className="text-xs text-slate-500">{asset.ip}</p>
                )}
              </div>
            </div>

            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
              {asset.openCount} abertas
            </span>
          </li>
        ))}
      </ol>
    </InfoCard>
  );
}
