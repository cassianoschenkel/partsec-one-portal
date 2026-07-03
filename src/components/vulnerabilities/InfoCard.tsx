export function InfoCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2
        className={`text-lg font-bold text-slate-950 ${
          description ? "" : "mb-5"
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p className="mb-5 mt-1 text-xs text-slate-500">{description}</p>
      ) : null}
      {children}
    </section>
  );
}

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}
