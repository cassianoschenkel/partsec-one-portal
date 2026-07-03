import type { LucideIcon } from "lucide-react";
import { Activity, LifeBuoy, Lock, Server, ShieldAlert } from "lucide-react";

const dataSources: Array<{
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    label: "Monitoramento",
    description: "Disponibilidade e saúde dos ativos acompanhados.",
    icon: Activity,
  },
  {
    label: "SIEM",
    description: "Eventos de segurança relevantes do ambiente.",
    icon: Lock,
  },
  {
    label: "Central de Suporte",
    description: "Chamados abertos, em andamento e resolvidos.",
    icon: LifeBuoy,
  },
  {
    label: "Vulnerabilidades",
    description: "Exposições identificadas nos ativos monitorados.",
    icon: ShieldAlert,
  },
  {
    label: "Ativos",
    description: "Inventário dos itens sob monitoramento do tenant.",
    icon: Server,
  },
];

export function DataSourceGrid() {
  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
      {dataSources.map((source) => {
        const Icon = source.icon;

        return (
          <div
            key={source.label}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 w-fit rounded-2xl bg-slate-100 p-3">
              <Icon className="h-6 w-6 text-slate-800" />
            </div>
            <div className="text-sm font-bold text-slate-900">
              {source.label}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {source.description}
            </p>
          </div>
        );
      })}
    </section>
  );
}
