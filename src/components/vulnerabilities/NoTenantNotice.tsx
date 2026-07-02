import { ShieldAlert } from "lucide-react";

export function NoTenantNotice({
  title,
  description,
}: {
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
          <ShieldAlert className="h-4 w-4" />
          Tenant não associado
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          {title}
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </section>
    </div>
  );
}
