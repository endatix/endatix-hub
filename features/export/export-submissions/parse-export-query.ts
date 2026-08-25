import type { ExportFormat, ReportingExportFormat } from "../types";
import { parseCalendarDateYmd } from "@/lib/endatix-api/shared/list-query";

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
): ReportingExportFormat | undefined {
  if (
    format === "csv" ||
    format === "csv-shoji" ||
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

/**
 * Accepts UTC calendar days (`YYYY-MM-DD`) for export From/To bounds.
 * API owns exclusive next-day conversion.
 */
export function parseOptionalCalendarDateQuery(
  value: string | null,
): string | undefined {
  return parseCalendarDateYmd(value);
}

export function parseOptionalPositiveIdQuery(
  value: string | null,
): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  if (!/^\d+$/.test(value.trim())) {
    return undefined;
  }

  return value.trim();
}

export function parseOptionalLocaleQuery(
  value: string | null,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length > 32) {
    return undefined;
  }

  return trimmed;
}

export function parseCompletionStatusQuery(
  value: string | null,
): "all" | "completed" | "incomplete" | undefined {
  if (value === "all" || value === "completed" || value === "incomplete") {
    return value;
  }

  return undefined;
}
