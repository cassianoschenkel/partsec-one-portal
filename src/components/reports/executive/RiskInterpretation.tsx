import { InfoCard } from "@/components/vulnerabilities/InfoCard";
import {
  getSeverityBadgeClass,
  translateSeverity,
} from "@/components/vulnerabilities/vulnerability-format";
import type { ExecutiveRiskLevel } from "@/lib/queries/executive-report";

const riskDescriptions: Record<ExecutiveRiskLevel, string> = {
  CRITICAL:
    "Existem vulnerabilidades críticas em aberto. O ambiente requer ação imediata.",
  HIGH: "Existem vulnerabilidades de severidade alta em aberto. O ambiente requer atenção prioritária.",
  MEDIUM:
    "Existem vulnerabilidades em aberto de severidade média ou inferior. O ambiente requer acompanhamento.",
  LOW: "Não há vulnerabilidades em aberto no momento. O ambiente está em conformidade com o esperado.",
};

export function RiskInterpretation({
  riskLevel,
}: {
  riskLevel: ExecutiveRiskLevel;
}) {
  return (
    <InfoCard
      title="Interpretação de risco"
      description="Classificação calculada de forma determinística a partir dos dados de vulnerabilidades do tenant."
    >
      <div className="flex items-center gap-4">
        <span
          className={`inline-flex rounded-full border px-4 py-1.5 text-sm font-bold ${getSeverityBadgeClass(
            riskLevel
          )}`}
        >
          {translateSeverity(riskLevel)}
        </span>

        <p className="text-sm text-slate-600">
          {riskDescriptions[riskLevel]}
        </p>
      </div>
    </InfoCard>
  );
}
