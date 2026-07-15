import type { ReportingExportFormat } from "./types";

export function buildLegacyExportUrl(
  formId: string,
  exportId?: string,
): string {
  if (exportId) {
    return `/api/forms/${formId}/export?exportId=${encodeURIComponent(exportId)}`;
  }

  return `/api/forms/${formId}/export`;
}

export function buildReportingExportUrl(
  formId: string,
  format: ReportingExportFormat,
): string {
  const params = new URLSearchParams({ format });

  return `/api/forms/${formId}/export?${params.toString()}`;
}
