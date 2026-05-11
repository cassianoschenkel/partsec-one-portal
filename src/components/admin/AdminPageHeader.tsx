import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type AdminPageHeaderProps = {
  backHref?: string;
  backLabel?: string;
  badgeLabel: string;
  badgeIcon: LucideIcon;
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
};

export function AdminPageHeader({
  backHref,
  backLabel = "Voltar",
  badgeLabel,
  badgeIcon: BadgeIcon,
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <section>
      <div className="mb-6 flex flex-col gap-5">
        {backHref && (
          <Link
            href={backHref}
            className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            ← {backLabel}
          </Link>
        )}

        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              <BadgeIcon className="h-4 w-4" />
              {badgeLabel}
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {title}
            </h2>

            <div className="mt-2 text-slate-600">{description}</div>
          </div>

          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>
    </section>
  );
}
