import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Package,
  Server,
  ShieldAlert,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminTenantVulnerabilityDetail } from "@/lib/queries/vulnerability-detail";

type AdminTenantVulnerabilityDetailPageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

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

function getStatusBadgeClass(status: string | null) {
  switch (status) {
    case "OPEN":
      return "bg-red-50 text-red-700 border-red-100";
    case "RESOLVED":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
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

function translateStatus(status: string | null) {
  switch (status) {
    case "OPEN":
      return "Aberta";
    case "RESOLVED":
      return "Resolvida";
    default:
      return "Indefinido";
  }
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-bold text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

export default async function AdminTenantVulnerabilityDetailPage({
  params,
}: AdminTenantVulnerabilityDetailPageProps) {
  const { slug, id } = await params;

  const data = await getAdminTenantVulnerabilityDetail({
    tenantSlug: slug,
    vulnerabilityId: id,
  });

  if (!data) {
    notFound();
  }

  const { tenant, vulnerability } = data;

  if (!vulnerability) {
    notFound();
  }

  const backHref = `/admin/tenants/${tenant.slug}/vulnerabilities`;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        backHref={backHref}
        backLabel="Voltar para vulnerabilidades"
        badgeLabel="Detalhe técnico"
        badgeIcon={ShieldAlert}
        title={`${vulnerability.cve} — ${tenant.name}`}
        description={
          <>
            Detalhe administrativo da vulnerabilidade identificada no tenant{" "}
            <span className="font-semibold text-slate-900">
              {tenant.name}
            </span>
            .
          </>
        }
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              {vulnerability.cve}
            </h1>

            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500">
              {vulnerability.title ?? "Sem descrição disponível."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getSeverityBadgeClass(
                vulnerability.severity
              )}`}
            >
              {translateSeverity(vulnerability.severity)}
            </span>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                vulnerability.status
              )}`}
            >
              {translateStatus(vulnerability.status)}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <InfoCard title="Ativo afetado">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Server className="h-5 w-5 text-slate-800" />
            </div>

            <div>
              <p className="font-bold text-slate-950">
                {vulnerability.assetName}
              </p>
              <p className="text-xs text-slate-500">
                {vulnerability.assetIp ?? "IP não informado"}
              </p>
            </div>
          </div>

          <dl>
            <InfoRow
              label="Sistema operacional"
              value={vulnerability.operatingSystem ?? "—"}
            />
            <InfoRow
              label="Agente"
              value={vulnerability.agentName ?? vulnerability.wazuhAgentId}
            />
            <InfoRow
              label="ID do agente"
              value={vulnerability.wazuhAgentId}
            />
            <InfoRow
              label="Status do agente"
              value={vulnerability.agentStatus ?? "—"}
            />
            <InfoRow
              label="Versão do agente"
              value={vulnerability.agentVersion ?? "—"}
            />
            <InfoRow
              label="Node"
              value={vulnerability.agentNodeName ?? "—"}
            />
          </dl>
        </InfoCard>

        <InfoCard title="Pacote vulnerável">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <Package className="h-5 w-5 text-slate-800" />
            </div>

            <div>
              <p className="font-bold text-slate-950">
                {vulnerability.packageName || "Pacote não informado"}
              </p>
              <p className="text-xs text-slate-500">
                Versão instalada: {vulnerability.packageVersion || "—"}
              </p>
            </div>
          </div>

          <dl>
            <InfoRow
              label="Versão corrigida"
              value={vulnerability.fixedVersion ?? "—"}
            />
            <InfoRow
              label="Arquitetura"
              value={vulnerability.architecture ?? "—"}
            />
            <InfoRow
              label="Condição"
              value={vulnerability.condition ?? "—"}
            />
          </dl>
        </InfoCard>

        <InfoCard title="Datas e score">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <CalendarClock className="h-5 w-5 text-slate-800" />
            </div>

            <div>
              <p className="font-bold text-slate-950">
                Score {vulnerability.score ?? "—"}
              </p>
              <p className="text-xs text-slate-500">
                Última detecção: {formatDate(vulnerability.lastSeenAt)}
              </p>
            </div>
          </div>

          <dl>
            <InfoRow
              label="Detectada em"
              value={formatDate(vulnerability.detectedAt)}
            />
            <InfoRow
              label="Publicada em"
              value={formatDate(vulnerability.publishedAt)}
            />
            <InfoRow
              label="Resolvida em"
              value={formatDate(vulnerability.resolvedAt)}
            />
            <InfoRow
              label="Última sincronização"
              value={formatDate(vulnerability.syncedAt)}
            />
          </dl>
        </InfoCard>
      </section>

      {vulnerability.externalReference && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-950">
            Referência externa
          </h2>

          <a
            href={vulnerability.externalReference}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 underline decoration-slate-300 underline-offset-4 hover:text-slate-950"
          >
            Abrir referência técnica
            <ExternalLink className="h-4 w-4" />
          </a>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-slate-950">
          Dados técnicos brutos
        </h2>

        <p className="mb-4 text-sm leading-6 text-slate-500">
          Conteúdo original retornado pela fonte SIEM/Indexer para auditoria e
          troubleshooting administrativo.
        </p>

        <pre className="max-h-[520px] overflow-auto rounded-2xl bg-slate-950 p-5 text-xs leading-5 text-slate-100">
          {JSON.stringify(vulnerability.rawData, null, 2)}
        </pre>
      </section>

      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para vulnerabilidades
        </Link>
      </div>
    </div>
  );
}
