import { parseErrorMessage, TelemetryLogger } from "@/features/telemetry";
import type {
  ExportDeliveryFormat,
  ExportFormatListItem,
  ExportFormatSettingsDto,
  ExportProfile,
  ExportTarget,
} from "./export-format-types";
import {
  DELIVERY_VALUES,
  PROFILE_VALUES,
  TARGET_VALUES,
  normalizeEnumValue,
} from "./normalize-export-enums";

const LOGGER_NAME = "reporting.normalize-export-formats";

/** Legacy numeric enum values from older API responses. */
const LEGACY_ALIAS_PROFILE_BY_INDEX: string[] = ["native", "crunch"];

function normalizeAliasProfile(value: unknown): string {
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

function logEnumFallback(
  format: ExportFormatListItem,
  field: "exportTarget" | "deliveryFormat" | "profile",
  originalValue: unknown,
  defaultValue: string,
): void {
  TelemetryLogger.warn(
    `Export format ${field} fell back to default during normalization`,
    {
      "format.id": format.id,
      "format.name": format.name,
      field,
      "original.value": parseErrorMessage(originalValue),
      "default.value": defaultValue,
    },
    LOGGER_NAME,
  );
}

export function normalizeExportFormat(
  format: ExportFormatListItem,
): ExportFormatListItem {
  const normalizedTarget = normalizeEnumValue(
    format.exportTarget,
    TARGET_VALUES,
  );
  const exportTarget: ExportTarget = normalizedTarget ?? "Submissions";
  if (!normalizedTarget) {
    logEnumFallback(format, "exportTarget", format.exportTarget, exportTarget);
  }

  const normalizedDelivery = normalizeEnumValue(
    format.deliveryFormat,
    DELIVERY_VALUES,
  );
  const deliveryFormat: ExportDeliveryFormat = normalizedDelivery ?? "Csv";
  if (!normalizedDelivery) {
    logEnumFallback(
      format,
      "deliveryFormat",
      format.deliveryFormat,
      deliveryFormat,
    );
  }

  const normalizedProfile = normalizeEnumValue(format.profile, PROFILE_VALUES);
  const profile: ExportProfile = normalizedProfile ?? "Native";
  if (!normalizedProfile) {
    logEnumFallback(format, "profile", format.profile, profile);
  }

  return {
    ...format,
    exportTarget,
    deliveryFormat,
    profile,
    settings: normalizeSettings(format.settings),
    allowedFilters: Array.isArray(format.allowedFilters)
      ? format.allowedFilters.filter(
          (filter): filter is string =>
            typeof filter === "string" && filter.trim().length > 0,
        )
      : [],
  };
}

export function normalizeExportFormats(
  formats: ExportFormatListItem[],
): ExportFormatListItem[] {
  return formats.map(normalizeExportFormat);
}
