import type {
  ExportFormatListItem,
  ExportTarget,
} from "@/lib/endatix-api/reporting/reporting";
import {
  getExportFormatFallbackExtension,
  getExportFormatLabel,
} from "@/lib/endatix-api/reporting/export-format-types";

export interface TenantExportOption {
  exportFormatId: string;
  exportTarget: ExportTarget;
  wireKey: string;
  label: string;
  fallbackExtension: string;
}

export interface TenantExportOptionGroup {
  target: ExportTarget;
  label: string;
  options: TenantExportOption[];
}

const TARGET_LABELS: Record<ExportTarget, string> = {
  Submissions: "Submissions",
  Codebook: "Codebook",
};

export function mapFormatsToTenantExportOptions(
  formats: ExportFormatListItem[],
): TenantExportOption[] {
  return formats.map((format) => ({
    exportFormatId: format.id,
    exportTarget: format.exportTarget,
    wireKey: format.wireKey,
    label: getExportFormatLabel(format),
    fallbackExtension: getExportFormatFallbackExtension(format.wireKey),
  }));
}

export function groupTenantExportOptions(
  options: TenantExportOption[],
): TenantExportOptionGroup[] {
  const grouped = new Map<ExportTarget, TenantExportOption[]>();

  for (const option of options) {
    const existing = grouped.get(option.exportTarget) ?? [];
    existing.push(option);
    grouped.set(option.exportTarget, existing);
  }

  return Array.from(grouped.entries()).map(([target, groupOptions]) => ({
    target,
    label: TARGET_LABELS[target],
    options: groupOptions,
  }));
}
