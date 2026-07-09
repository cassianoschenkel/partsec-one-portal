export function translateReportType(type: string) {
  switch (type) {
    case "EXECUTIVE":
      return "Executivo";
    case "MANAGERIAL":
      return "Gerencial";
    case "TECHNICAL":
      return "Técnico";
    default:
      return "—";
  }
}

export function translateReportStatus(status: string) {
  switch (status) {
    case "GENERATED":
      return "Gerado";
    case "DRAFT":
      return "Rascunho";
    case "FAILED":
      return "Falhou";
    default:
      return "—";
  }
}

export function getReportStatusBadgeClass(status: string) {
  switch (status) {
    case "GENERATED":
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    case "DRAFT":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "FAILED":
      return "bg-red-50 text-red-700 border-red-100";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}
