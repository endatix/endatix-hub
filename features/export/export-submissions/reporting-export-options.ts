import {
  isCodebookExportFormat,
  HARDCODED_CODEBOOK_EXPORT_OPTIONS,
} from "../export-codebook";
import type { ReportingExportFormat } from "../types";

/**
 * TODO(E10): Replace with tenant ExportFormats from API.
 */
export const HARDCODED_REPORTING_EXPORT_OPTIONS: ReadonlyArray<{
  format: ReportingExportFormat;
  label: string;
}> = [
  { format: "csv", label: "CSV" },
  { format: "json", label: "JSON" },
  ...HARDCODED_CODEBOOK_EXPORT_OPTIONS,
];

export function getReportingExportFallbackExtension(
  format: ReportingExportFormat,
): string {
  if (isCodebookExportFormat(format)) {
    return "json";
  }

  return format;
}
