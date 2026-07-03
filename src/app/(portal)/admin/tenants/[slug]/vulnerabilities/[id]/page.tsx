import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminTenantVulnerabilityDetail } from "@/lib/queries/vulnerability-detail";
import { BackToVulnerabilitiesLink } from "@/components/vulnerabilities/BackToVulnerabilitiesLink";
import { VulnerabilityDetailHero } from "@/components/vulnerabilities/VulnerabilityDetailHero";
import { InfoRow } from "@/components/vulnerabilities/InfoCard";
import {
  AssetInfoCard,
  DatesInfoCard,
  ExternalReferenceCard,
  PackageInfoCard,
} from "@/components/vulnerabilities/VulnerabilityDetailCards";

type AdminTenantVulnerabilityDetailPageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

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

      <VulnerabilityDetailHero
        cve={vulnerability.cve}
        title={vulnerability.title}
        severity={vulnerability.severity}
        status={vulnerability.status}
      />

      <section className="grid gap-6 xl:grid-cols-3">
        <AssetInfoCard
          assetName={vulnerability.assetName}
          assetIp={vulnerability.assetIp}
          operatingSystem={vulnerability.operatingSystem}
          agentName={vulnerability.agentName}
          wazuhAgentId={vulnerability.wazuhAgentId}
          agentStatus={vulnerability.agentStatus}
          agentVersion={vulnerability.agentVersion}
          extraRows={
            <>
              <InfoRow label="ID do agente" value={vulnerability.wazuhAgentId} />
              <InfoRow
                label="Node"
                value={vulnerability.agentNodeName ?? "—"}
              />
            </>
          }
        />

        <PackageInfoCard
          packageName={vulnerability.packageName}
          packageVersion={vulnerability.packageVersion}
          fixedVersion={vulnerability.fixedVersion}
          architecture={vulnerability.architecture}
          condition={vulnerability.condition}
        />

        <DatesInfoCard
          score={vulnerability.score}
          lastSeenAt={vulnerability.lastSeenAt}
          detectedAt={vulnerability.detectedAt}
          publishedAt={vulnerability.publishedAt}
          resolvedAt={vulnerability.resolvedAt}
          syncedAt={vulnerability.syncedAt}
        />
      </section>

      {vulnerability.externalReference && (
        <ExternalReferenceCard
          externalReference={vulnerability.externalReference}
        />
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
        <BackToVulnerabilitiesLink href={backHref} />
      </div>
    </div>
  );
}
