"use client";

import { useFormStatus } from "react-dom";
import { FileCheck2 } from "lucide-react";

export function GenerateExecutiveReportButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <FileCheck2 className="h-4 w-4" />
      {pending ? "Gerando relatório..." : "Gerar e salvar relatório"}
    </button>
  );
}
