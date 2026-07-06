import type { LucideIcon } from "lucide-react";
import { Lock, Server, ShieldAlert, ShieldCheck } from "lucide-react";

function translateSiemStatus(status: string | null) {
  switch (status) {
    case "ACTIVE":
      return "Ativo";
    case "INACTIVE":
      return "Inativo";
    case "ERROR":
      return "Com erro";
    default:
      return "Sem integração";
  }
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
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

export function ExecutiveOverviewCards({
  data,
}: {
  data: {
    siem: { status: string | null };
    agents: { total: number; active: number };
    vulnerabilities: { open: number; resolved: number };
    assets: { total: number; active: number };
  };
}) {
  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <OverviewCard
        icon={Lock}
        label="SIEM"
        value={translateSiemStatus(data.siem.status)}
        description="Status da integração de monitoramento de segurança."
      />

      <OverviewCard
        icon={ShieldCheck}
        label="Agentes de Segurança"
        value={`${data.agents.active}/${data.agents.total}`}
        description="Agentes ativos em relação ao total instalado."
      />

      <OverviewCard
        icon={ShieldAlert}
        label="Vulnerabilidades"
        value={`${data.vulnerabilities.open}`}
        description={`${data.vulnerabilities.resolved} resolvidas na base atual.`}
      />

      <OverviewCard
        icon={Server}
        label="Ativos"
        value={`${data.assets.active}/${data.assets.total}`}
        description="Ativos ativos em relação ao total monitorado."
      />
    </section>
  );
}
