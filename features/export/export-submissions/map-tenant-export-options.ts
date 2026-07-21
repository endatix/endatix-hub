import type {
  ExportFormatListItem,
  ExportProfile,
  ExportTarget,
} from "@/lib/endatix-api/reporting/reporting";
import {
  getExportFormatFallbackExtension,
  getExportFormatLabel,
} from "@/lib/endatix-api/reporting/export-format-types";

export interface TenantExportOption {
  exportFormatId: string;
  exportTarget: ExportTarget;
  profile: ExportProfile;
  formatKey: string;
  label: string;
  fallbackExtension: string;
  /** Capability allow-list for request-time filters (Reporting API names). */
  allowedFilters: readonly string[];
}

export interface TenantExportOptionGroup {
  target: ExportTarget;
  label: string;
  options: TenantExportOption[];
}

export function mapFormatsToTenantExportOptions(
  formats: ExportFormatListItem[],
): TenantExportOption[] {
  return formats.map((format) => ({
    exportFormatId: format.id,
    exportTarget: format.exportTarget,
    profile: format.profile,
    formatKey: format.wireKey,
    label: getExportFormatLabel(format),
    fallbackExtension: getExportFormatFallbackExtension(format.wireKey),
    allowedFilters: format.allowedFilters,
  }));
}

/** Stable UX order for export target groups (matches former dropdown). */
const EXPORT_TARGET_GROUP_ORDER: readonly ExportTarget[] = [
  "Submissions",
  "Codebook",
];

export function groupTenantExportOptions(
  options: TenantExportOption[],
): TenantExportOptionGroup[] {
  const grouped = new Map<ExportTarget, TenantExportOption[]>();

  for (const option of options) {
    const existing = grouped.get(option.exportTarget) ?? [];
    existing.push(option);
    grouped.set(option.exportTarget, existing);
  }

  // Group heading uses the API export-target name, not a Hub label catalog.
  const orderedTargets = [
    ...EXPORT_TARGET_GROUP_ORDER.filter((target) => grouped.has(target)),
    ...Array.from(grouped.keys()).filter(
      (target) => !EXPORT_TARGET_GROUP_ORDER.includes(target),
    ),
  ];

  return orderedTargets.map((target) => ({
    target,
    label: target,
    options: grouped.get(target) ?? [],
  }));
}
