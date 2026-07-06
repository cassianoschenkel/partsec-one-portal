import { formatDate } from "@/components/vulnerabilities/vulnerability-format";

export function PrintHeader({
  tenantName,
  lastSyncedAt,
  generatedAt,
}: {
  tenantName: string | null;
  lastSyncedAt: string | null;
  generatedAt: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Partsec One
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          Relatório Executivo{tenantName ? ` — ${tenantName}` : ""}
        </h1>
      </div>

      <div className="shrink-0 text-right text-xs font-medium text-slate-500">
        <p>
          {lastSyncedAt
            ? `Última sincronização disponível: ${formatDate(lastSyncedAt)}`
            : "Visão atual"}
        </p>
        <p className="mt-1">
          Relatório gerado em: {formatDate(generatedAt)}
        </p>
      </div>
    </div>
  );
}
