import type { ExportFormat } from "../types";

export function parseLegacyExportFormat(
  format: string | null,
): ExportFormat | undefined {
  if (format === "csv" || format === "xlsx" || format === "json") {
    return format;
  }

  return undefined;
}

export function parseReportingExportFormat(
  format: string | null,
): ExportFormat {
  // TODO(E10): Resolve format from tenant ExportFormats API (by id or slug) instead of hardcoded allow-list.
  if (
    format === "csv" ||
    format === "json" ||
    format === "codebook" ||
    format === "codebook-shoji"
  ) {
    return format;
  }

  return "csv";
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
