import type { ReportingExportFormat } from "../types";

export type CodebookExportFormat = Extract<
  ReportingExportFormat,
  "codebook" | "codebook-shoji"
>;

/**
 * TODO(E10): Remove once tenant ExportFormats API drives codebook export options.
 * Form-scoped codebook artifacts (schema + Shoji projection).
 */
export const HARDCODED_CODEBOOK_EXPORT_OPTIONS: ReadonlyArray<{
  format: CodebookExportFormat;
  label: string;
}> = [
  { format: "codebook", label: "Codebook" },
  { format: "codebook-shoji", label: "Codebook (Shoji)" },
];

export function isCodebookExportFormat(
  format: ReportingExportFormat,
): format is CodebookExportFormat {
  return format === "codebook" || format === "codebook-shoji";
}
