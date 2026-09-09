import { FILE_KINDS, isFileKindKey, type FileKindKey } from "@/lib/file-kinds";

export const REPORTING_EXPORT_WIRE = {
  csv: { key: "csv", fileKind: "csv", isCodebook: false },
  "csv-shoji": { key: "csv-shoji", fileKind: "csv", isCodebook: false },
  xlsx: { key: "xlsx", fileKind: "xlsx", isCodebook: false },
  json: { key: "json", fileKind: "json", isCodebook: false },
  codebook: { key: "codebook", fileKind: "json", isCodebook: true },
  "codebook-shoji": {
    key: "codebook-shoji",
    fileKind: "json",
    isCodebook: true,
  },
} as const satisfies Record<
  string,
  { key: string; fileKind: FileKindKey; isCodebook: boolean }
>;

export type ReportingExportWireKey = keyof typeof REPORTING_EXPORT_WIRE;

/** Built-in / legacy download formats — closed set, not every file-kind∩wire key. */
export const BUILT_IN_EXPORT_FILE_KINDS = ["csv", "xlsx", "json"] as const;
export type BuiltInExportFileKind = (typeof BUILT_IN_EXPORT_FILE_KINDS)[number];

export function isBuiltInExportFileKind(
  value: string,
): value is BuiltInExportFileKind {
  return (BUILT_IN_EXPORT_FILE_KINDS as readonly string[]).includes(value);
}

export function isReportingExportWireKey(
  value: string,
): value is ReportingExportWireKey {
  return Object.hasOwn(REPORTING_EXPORT_WIRE, value);
}

export function getReportingExportWire(value: string) {
  if (!isReportingExportWireKey(value)) {
    return undefined;
  }

  return REPORTING_EXPORT_WIRE[value];
}

export function isCodebookFormatKey(formatKey: string): boolean {
  return getReportingExportWire(formatKey)?.isCodebook ?? false;
}

export function getExportFormatFallbackExtension(wireKey: string): string {
  const wire = getReportingExportWire(wireKey);
  if (wire) {
    return FILE_KINDS[wire.fileKind].extension;
  }

  if (isFileKindKey(wireKey)) {
    return FILE_KINDS[wireKey].extension;
  }

  return wireKey;
}
