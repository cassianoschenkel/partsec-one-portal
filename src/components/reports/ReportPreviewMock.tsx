import { FileText } from "lucide-react";

const previewSections = [
  "Resumo executivo",
  "Principais riscos",
  "Vulnerabilidades críticas e altas",
  "Eventos de segurança relevantes",
  "Chamados abertos e resolvidos",
  "Recomendações priorizadas",
];

export function ReportPreviewMock() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <FileText className="h-6 w-6 text-slate-800" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Pré-visualização de um relatório
            </h3>
            <p className="text-sm text-slate-500">
              Estrutura ilustrativa das seções que um relatório poderá conter.
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          Mockup
        </span>
      </div>

      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <ol className="space-y-4">
          {previewSections.map((section, index) => (
            <li
              key={section}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                  {index + 1}
                </div>
                <span className="text-sm font-bold text-slate-800">
                  {section}
                </span>
              </div>

              <div className="mt-3 space-y-2 pl-10">
                <div className="h-2 w-full max-w-md rounded-full bg-slate-100" />
                <div className="h-2 w-full max-w-xs rounded-full bg-slate-100" />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
