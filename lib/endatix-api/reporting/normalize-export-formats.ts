import type {
  ColumnAliasProfile,
  ExportDeliveryFormat,
  ExportFormatListItem,
  ExportFormatSettingsDto,
  ExportProfile,
  ExportTarget,
} from "./export-format-types";

const TARGET_VALUES: ExportTarget[] = ["Submissions", "Codebook"];
const DELIVERY_VALUES: ExportDeliveryFormat[] = ["Csv", "Json"];
const PROFILE_VALUES: ExportProfile[] = ["Native", "Shoji"];

/** Legacy numeric enum values from older API responses. */
const LEGACY_ALIAS_PROFILE_BY_INDEX: ColumnAliasProfile[] = [
  "native",
  "crunch",
];

function normalizeEnumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  if (typeof value === "string") {
    const exact = allowed.find((option) => option === value);
    if (exact) {
      return exact;
    }

    const caseInsensitive = allowed.find(
      (option) => option.toLowerCase() === value.toLowerCase(),
    );
    if (caseInsensitive) {
      return caseInsensitive;
    }
  }

  if (typeof value === "number" && value >= 0 && value < allowed.length) {
    return allowed[value];
  }

  return undefined;
}

function normalizeAliasProfile(value: unknown): ColumnAliasProfile {
  if (typeof value === "string" && value.trim()) {
    return value.trim().toLowerCase();
  }

  if (
    typeof value === "number" &&
    value >= 0 &&
    value < LEGACY_ALIAS_PROFILE_BY_INDEX.length
  ) {
    return LEGACY_ALIAS_PROFILE_BY_INDEX[value];
  }

  return "native";
}

function normalizeSettings(
  settings: ExportFormatSettingsDto,
): ExportFormatSettingsDto {
  return {
    aliasProfile: normalizeAliasProfile(settings.aliasProfile),
    keySeparator: settings.keySeparator ?? "__",
    includeTestSubmissions: settings.includeTestSubmissions ?? false,
  };
}

export function normalizeExportFormat(
  format: ExportFormatListItem,
): ExportFormatListItem {
  return {
    ...format,
    exportTarget:
      normalizeEnumValue(format.exportTarget, TARGET_VALUES) ?? "Submissions",
    deliveryFormat:
      normalizeEnumValue(format.deliveryFormat, DELIVERY_VALUES) ?? "Csv",
    profile: normalizeEnumValue(format.profile, PROFILE_VALUES) ?? "Native",
    settings: normalizeSettings(format.settings),
  };
}

export function normalizeExportFormats(
  formats: ExportFormatListItem[],
): ExportFormatListItem[] {
  return formats.map(normalizeExportFormat);
}
