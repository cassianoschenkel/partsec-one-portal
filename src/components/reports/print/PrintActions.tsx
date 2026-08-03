"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

type PrintActionsProps = {
  backHref?: string;
  backLabel?: string;
};

export function PrintActions({
  backHref = "/reports/executive",
  backLabel = "Voltar para relatório",
}: PrintActionsProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
      <Link
        href={backHref}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-slate-800"
      >
        <Printer className="h-4 w-4" />
        Imprimir / Salvar como PDF
      </button>
    </div>
  );
}
