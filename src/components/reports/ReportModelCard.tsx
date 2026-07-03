import type { LucideIcon } from "lucide-react";

export function ReportModelCard({
  icon: Icon,
  title,
  audience,
  purpose,
  examples,
}: {
  icon: LucideIcon;
  title: string;
  audience: string;
  purpose: string;
  examples: string[];
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon className="h-5 w-5 text-slate-800" />
        </div>
        <h4 className="text-lg font-bold text-slate-900">{title}</h4>
      </div>

      <p className="text-sm leading-6 text-slate-500">{purpose}</p>

      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Público-alvo
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-800">
          {audience}
        </p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Exemplos de conteúdo
        </p>
        <ul className="mt-2 space-y-2">
          {examples.map((example) => (
            <li
              key={example}
              className="flex items-start gap-2 text-sm leading-6 text-slate-600"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              {example}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
