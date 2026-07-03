import { CheckCircle2 } from "lucide-react";
import { InfoCard } from "@/components/vulnerabilities/InfoCard";

export function Recommendations({
  recommendations,
}: {
  recommendations: string[];
}) {
  return (
    <InfoCard
      title="Recomendações"
      description="Recomendações estáticas geradas a partir dos indicadores do relatório."
    >
      <ul className="space-y-3">
        {recommendations.map((recommendation) => (
          <li
            key={recommendation}
            className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <p className="text-sm text-slate-700">{recommendation}</p>
          </li>
        ))}
      </ul>
    </InfoCard>
  );
}
