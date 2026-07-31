import Link from "next/link";
import { ArrowLeft, FileWarning } from "lucide-react";

export function SavedReportUnavailableNotice({
  backHref,
}: {
  backHref: string;
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
          <FileWarning className="h-4 w-4" />
          Relatório indisponível
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          Não foi possível abrir este relatório salvo.
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          O formato do relatório é incompatível ou os dados armazenados estão
          incompletos.
        </p>

        <Link
          href={backHref}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 transition hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao histórico
        </Link>
      </section>
    </div>
  );
}
