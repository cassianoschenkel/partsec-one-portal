import { InfoCard } from "@/components/vulnerabilities/InfoCard";
import { translateSeverity } from "@/components/vulnerabilities/vulnerability-format";
import type { ExecutiveRiskLevel } from "@/lib/queries/executive-report";

export function ExecutiveSummary({
  tenantName,
  riskLevel,
  hasVulnerabilityData,
  vulnerabilities,
  agents,
  assets,
}: {
  tenantName: string | null;
  riskLevel: ExecutiveRiskLevel;
  hasVulnerabilityData: boolean;
  vulnerabilities: { open: number; resolved: number };
  agents: { total: number; active: number };
  assets: { total: number; active: number };
}) {
  return (
    <InfoCard title="Resumo executivo">
      <p className="text-sm leading-6 text-slate-700">
        {tenantName ? `O ambiente de ${tenantName}` : "O ambiente monitorado"}{" "}
        apresenta classificação de risco{" "}
        <strong>{translateSeverity(riskLevel)}</strong>, com {agents.active}{" "}
        de {agents.total} agentes de segurança ativos e {assets.active} de{" "}
        {assets.total} ativos monitorados em operação.{" "}
        {hasVulnerabilityData
          ? `Há ${vulnerabilities.open} vulnerabilidade(s) em aberto e ${vulnerabilities.resolved} resolvida(s) na última sincronização disponível.`
          : "Ainda não há dados de vulnerabilidades disponíveis para este tenant."}
      </p>
    </InfoCard>
  );
}
