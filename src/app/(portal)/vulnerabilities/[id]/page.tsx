import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getTenantVulnerabilityDetail } from "@/lib/queries/vulnerability-detail";
import { NoTenantNotice } from "@/components/vulnerabilities/NoTenantNotice";
import { BackToVulnerabilitiesLink } from "@/components/vulnerabilities/BackToVulnerabilitiesLink";
import { VulnerabilityDetailHero } from "@/components/vulnerabilities/VulnerabilityDetailHero";
import {
  AssetInfoCard,
  DatesInfoCard,
  ExternalReferenceCard,
  PackageInfoCard,
} from "@/components/vulnerabilities/VulnerabilityDetailCards";

type VulnerabilityDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function VulnerabilityDetailPage({
  params,
}: VulnerabilityDetailPageProps) {
  const { id } = await params;

  const { hasTenant, vulnerability } = await getTenantVulnerabilityDetail(id);

  if (!hasTenant) {
    return (
      <NoTenantNotice
        title="Detalhe indisponível para este usuário"
        description="Este usuário não está associado a um tenant específico. Para visualizar vulnerabilidades, acesse com um usuário do tenant cliente."
      />
    );
  }

  if (!vulnerability) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <BackToVulnerabilitiesLink href="/vulnerabilities" />
      </div>

      <VulnerabilityDetailHero
        cve={vulnerability.cve}
        title={vulnerability.title}
        severity={vulnerability.severity}
        status={vulnerability.status}
        eyebrow={
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            <ShieldAlert className="h-4 w-4" />
            Detalhe da vulnerabilidade
          </div>
        }
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
    </div>
  );
}
