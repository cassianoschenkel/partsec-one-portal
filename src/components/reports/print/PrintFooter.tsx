import { formatDate } from "@/components/vulnerabilities/vulnerability-format";

export function PrintFooter({
  generatedAt,
  description = "Documento gerado a partir dos dados disponíveis no portal.",
}: {
  generatedAt: string;
  description?: string;
}) {
  return (
    <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
      <p className="font-bold uppercase tracking-wide text-slate-600">
        Partsec One — Relatório Executivo
      </p>
      <p className="mt-1">Relatório gerado em: {formatDate(generatedAt)}</p>
      <p className="mt-1">{description}</p>
    </footer>
  );
}
