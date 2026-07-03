import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackToVulnerabilitiesLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar para vulnerabilidades
    </Link>
  );
}
