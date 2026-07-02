import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

export type VulnerabilitySummary = {
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
};

export function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
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

export function VulnerabilitySummaryCards({
  summary,
}: {
  summary: VulnerabilitySummary;
}) {
  return (
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
  );
}
