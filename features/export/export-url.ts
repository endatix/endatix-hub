export function buildReportingExportUrl(
  formId: string,
  wireKey: string,
  exportFormatId: string,
): string {
  const params = new URLSearchParams({
    format: wireKey,
    exportFormatId,
  });

  return `/api/forms/${formId}/export?${params.toString()}`;
}

export function buildLegacyExportUrl(
  formId: string,
  exportId?: string,
): string {
  if (exportId) {
    return `/api/forms/${formId}/export?exportId=${encodeURIComponent(exportId)}`;
  }

  return `/api/forms/${formId}/export`;
}
