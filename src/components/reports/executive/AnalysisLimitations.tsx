import { InfoCard } from "@/components/vulnerabilities/InfoCard";

const LIMITATIONS = [
  "O relatório reflete os dados disponíveis no momento da geração.",
  "As informações dependem das integrações ativas e das sincronizações realizadas com sucesso.",
  "O status de remediação de vulnerabilidades pode depender da próxima sincronização dos agentes/integrações.",
  "As recomendações são determinísticas, com base nos indicadores atuais, e ainda não são geradas por análise de IA.",
];

export function AnalysisLimitations() {
  return (
    <InfoCard title="Limitações da análise">
      <ul className="space-y-3">
        {LIMITATIONS.map((limitation) => (
          <li
            key={limitation}
            className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          >
            {limitation}
          </li>
        ))}
      </ul>
    </InfoCard>
  );
}
