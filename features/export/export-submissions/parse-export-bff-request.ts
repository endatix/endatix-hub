import type { ExportFormat, ReportingExportFormat } from "../types";

export function parseLegacyExportFormat(
  format: string | null,
): ExportFormat | undefined {
  if (format === "csv" || format === "xlsx" || format === "json") {
    return format;
  }

  return undefined;
}

export function parseReportingExportWireKey(
  format: string | null,
): ReportingExportFormat | undefined {
  if (
    format === "csv" ||
    format === "json" ||
    format === "codebook" ||
    format === "codebook-shoji"
  ) {
    return format;
  }

  return undefined;
}

export function parseIncludeTestSubmissionsQuery(
  value: string | null,
): boolean | undefined {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}
