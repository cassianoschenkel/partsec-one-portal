import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  FileDown,
  ListChecks,
  Sparkles,
  Target,
} from "lucide-react";

const roadmapItems: Array<{
  label: string;
  icon: LucideIcon;
}> = [
  {
    label: "Relatórios consolidados por período",
    icon: CalendarClock,
  },
  {
    label: "Interpretação assistida por IA",
    icon: Sparkles,
  },
  {
    label: "Priorização de riscos e recomendações",
    icon: Target,
  },
  {
    label: "Exportação futura em PDF",
    icon: FileDown,
  },
];

export function AiAnalysisRoadmapCard() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3">
          <Sparkles className="h-6 w-6 text-slate-800" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">
              Análise assistida por IA
            </h3>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              Em roadmap
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Próximos passos para transformar dados em decisões mais rápidas.
          </p>
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-600">
        As próximas evoluções dos relatórios devem incluir achados
        interpretados automaticamente a partir dos dados de Monitoramento,
        SIEM, Vulnerabilidades e Central de Suporte, com priorização de
        riscos e recomendações de ação para facilitar a tomada de decisão.
      </p>

      <div className="mt-6 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-slate-400" />
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Evolução prevista
        </p>
      </div>

      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {roadmapItems.map((item, index) => {
          const Icon = item.icon;

          return (
            <li
              key={item.label}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500 shadow-sm">
                {index + 1}
              </div>
              <Icon className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                {item.label}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
