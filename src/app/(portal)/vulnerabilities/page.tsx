import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { getTenantVulnerabilitiesOverview } from "@/lib/queries/vulnerabilities";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getSeverityBadgeClass(severity: string | null) {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-100 text-red-800 border-red-200";
    case "HIGH":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "LOW":
      return "bg-sky-100 text-sky-800 border-sky-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function translateSeverity(severity: string | null) {
  switch (severity) {
    case "CRITICAL":
      return "Crítica";
    case "HIGH":
      return "Alta";
    case "MEDIUM":
      return "Média";
    case "LOW":
      return "Baixa";
    default:
      return "Não classificada";
  }
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof ShieldAlert;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        </div>

        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon className="h-6 w-6 text-slate-800" />
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

export default async function VulnerabilitiesPage() {
const { hasTenant, summary, vulnerabilities } =
  await getTenantVulnerabilitiesOverview();

if (!hasTenant) {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
          <ShieldAlert className="h-4 w-4" />
          Tenant não associado
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Vulnerabilidades indisponíveis para este usuário
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Este usuário não está associado a um tenant específico. Para visualizar
          vulnerabilidades, acesse com um usuário do tenant cliente ou associe
          este usuário a um tenant.
        </p>
      </section>
    </div>
  );
}

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              <ShieldAlert className="h-4 w-4" />
              Vulnerabilidades
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Exposição técnica dos ativos monitorados
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Visão consolidada das vulnerabilidades identificadas nos ativos
              com agente de segurança associado ao tenant.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">
              {summary.open}
            </span>{" "}
            vulnerabilidades abertas
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Críticas"
          value={summary.critical}
          description="Exigem priorização máxima."
          icon={ShieldAlert}
        />

        <SummaryCard
          title="Altas"
          value={summary.high}
          description="Devem entrar no próximo ciclo de correção."
          icon={AlertTriangle}
        />

        <SummaryCard
          title="Médias"
          value={summary.medium}
          description="Acompanhar por exposição e criticidade do ativo."
          icon={Bug}
        />

        <SummaryCard
          title="Baixas"
          value={summary.low}
          description="Risco reduzido, mas devem permanecer visíveis."
          icon={ShieldCheck}
        />

        <SummaryCard
          title="Resolvidas"
          value={summary.resolved}
          description="Itens que não aparecem mais no último ciclo."
          icon={CheckCircle2}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-950">
            Vulnerabilidades abertas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Listagem limitada aos 200 itens abertos mais relevantes, ordenados
            por severidade e score.
          </p>
        </div>

        {vulnerabilities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
              <ShieldCheck className="h-6 w-6 text-emerald-700" />
            </div>

            <h3 className="text-base font-bold text-slate-950">
              Nenhuma vulnerabilidade aberta encontrada
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              O último ciclo de sincronização não encontrou vulnerabilidades
              abertas para os ativos deste tenant.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
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
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getSeverityBadgeClass(
                          vulnerability.severity
                        )}`}
                      >
                        {translateSeverity(vulnerability.severity)}
                      </span>
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="font-bold text-slate-950">
                        {vulnerability.cve}
                      </div>
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
    </div>
  );
}
