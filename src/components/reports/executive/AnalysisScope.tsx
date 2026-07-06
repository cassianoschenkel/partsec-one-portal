import { InfoCard } from "@/components/vulnerabilities/InfoCard";

export function AnalysisScope() {
  return (
    <InfoCard
      title="Base da análise"
      description="Esta primeira versão consolida os dados mais recentes disponíveis, e não representa ainda um período histórico fechado."
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {["SIEM", "Agentes de Segurança", "Vulnerabilidades", "Ativos"].map(
          (source) => (
            <li
              key={source}
              className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
            >
              {source}
            </li>
          )
        )}
      </ul>
      <p className="mt-4 text-xs text-slate-500">
        As informações refletem a última sincronização disponível de cada
        fonte, ou seja, uma visão atual do ambiente — não um recorte de um
        período encerrado.
      </p>
    </InfoCard>
  );
}
