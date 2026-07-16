/** Wire key for a column naming convention (e.g. native, crunch). Sourced from OSS. */
export type ColumnAliasProfile = string;

export type ExportTarget = "Submissions" | "Codebook";
export type ExportDeliveryFormat = "Csv" | "Json";
export type ExportProfile = "Native" | "Shoji";

export interface ColumnAliasNamingConventionDto {
  wireKey: ColumnAliasProfile;
  label: string;
  description: string;
  example?: string | null;
}

export const EXPORT_PROFILE_OPTIONS: ReadonlyArray<{
  value: ExportProfile;
  label: string;
}> = [
  { value: "Native", label: "Standard" },
  { value: "Shoji", label: "Shoji (Crunch codebook)" },
];

export interface ExportCapabilityDto {
  target: ExportTarget;
  deliveryFormat: ExportDeliveryFormat;
  profile: ExportProfile;
  wireKey: string;
  label: string;
  itemTypeName: string;
  description: string;
}

/** Persisted export format settings (locale / columnScope are request-time only). */
export interface ExportFormatSettingsDto {
  aliasProfile: ColumnAliasProfile;
  keySeparator: string;
  includeTestSubmissions: boolean;
}

export interface ExportFormatListItem {
  id: string;
  name: string;
  exportTarget: ExportTarget;
  deliveryFormat: ExportDeliveryFormat;
  profile: ExportProfile;
  wireKey: string;
  label: string;
  description?: string | null;
  settings: ExportFormatSettingsDto;
  createdAt: string;
  modifiedAt?: string | null;
}

export interface ExportFormatSettingsInput {
  aliasProfile?: ColumnAliasProfile;
  keySeparator?: string;
  includeTestSubmissions?: boolean;
}

export interface CreateExportFormatRequestBody {
  name: string;
  exportTarget: ExportTarget;
  deliveryFormat: ExportDeliveryFormat;
  profile?: ExportProfile;
  description?: string;
  settings?: ExportFormatSettingsInput;
}

export interface UpdateExportFormatRequestBody {
  name?: string;
  description?: string | null;
  settings?: ExportFormatSettingsInput;
}

export interface ExportMappingListItem {
  id: string;
  exportFormatId: string;
  surveyTypeId?: string | null;
  isDefault: boolean;
  exportFormat?: ExportFormatListItem;
}

export interface UpsertExportMappingRequestBody {
  exportFormatId: string;
  surveyTypeId?: string | null;
  isDefault: boolean;
}

export function getExportFormatLabel(format: ExportFormatListItem): string {
  if (format.name?.trim()) {
    return format.name.trim();
  }

  return format.label;
}

export function getColumnAliasProfileLabel(
  aliasProfile: ColumnAliasProfile,
  namingConventions: ReadonlyArray<ColumnAliasNamingConventionDto> = [],
): string {
  return (
    namingConventions.find((option) => option.wireKey === aliasProfile)
      ?.label ?? aliasProfile
  );
}

export function getColumnAliasNamingConvention(
  aliasProfile: ColumnAliasProfile,
  namingConventions: ReadonlyArray<ColumnAliasNamingConventionDto>,
): ColumnAliasNamingConventionDto | undefined {
  return namingConventions.find((option) => option.wireKey === aliasProfile);
}

export function getExportProfileLabel(profile: ExportProfile): string {
  return (
    EXPORT_PROFILE_OPTIONS.find((option) => option.value === profile)?.label ??
    profile
  );
}

export interface ExportFormatSettingsFieldVisibility {
  includeTestSubmissions: boolean;
  variant: boolean;
}

export function getExportFormatSettingsFieldVisibility(
  exportTarget: ExportTarget,
): ExportFormatSettingsFieldVisibility {
  return {
    includeTestSubmissions: exportTarget === "Submissions",
    variant: exportTarget === "Codebook",
  };
}

export function getDefaultExportKeySeparator(profile: ExportProfile): string {
  if (profile === "Shoji") {
    return "--";
  }

  return "__";
}

export function getExportFormatTypeLabel(format: ExportFormatListItem): string {
  const delivery =
    format.deliveryFormat === "Csv"
      ? "CSV"
      : format.deliveryFormat.toUpperCase();

  if (format.exportTarget === "Codebook") {
    return `Codebook · ${delivery} · ${getExportProfileLabel(format.profile)}`;
  }

  return `Submissions · ${delivery}`;
}

export function getExportFormatSettingsSummary(
  format: ExportFormatListItem,
  namingConventions: ReadonlyArray<ColumnAliasNamingConventionDto> = [],
): string {
  const visibility = getExportFormatSettingsFieldVisibility(
    format.exportTarget,
  );
  const parts: string[] = [
    getColumnAliasProfileLabel(format.settings.aliasProfile, namingConventions),
    format.settings.keySeparator,
  ];

  if (visibility.includeTestSubmissions) {
    parts.push(
      format.settings.includeTestSubmissions
        ? "Includes test submissions"
        : "Excludes test submissions",
    );
  }

  return parts.join(" · ");
}

export function buildExportFormatSettingsInput(
  exportTarget: ExportTarget,
  profile: ExportProfile,
  values: {
    aliasProfile?: ColumnAliasProfile;
    keySeparator?: string;
    includeTestSubmissions?: boolean;
  },
): ExportFormatSettingsInput {
  const visibility = getExportFormatSettingsFieldVisibility(exportTarget);
  const settings: ExportFormatSettingsInput = {
    aliasProfile: values.aliasProfile ?? "native",
    keySeparator: values.keySeparator ?? getDefaultExportKeySeparator(profile),
  };

  if (visibility.includeTestSubmissions) {
    settings.includeTestSubmissions = values.includeTestSubmissions ?? false;
  }

  return settings;
}

export function getExportFormatFallbackExtension(wireKey: string): string {
  if (wireKey === "codebook" || wireKey === "codebook-shoji") {
    return "json";
  }

  return wireKey;
}

export const EXPORT_TARGET_OPTIONS: ReadonlyArray<{
  value: ExportTarget;
  label: string;
}> = [
  { value: "Submissions", label: "Submissions" },
  { value: "Codebook", label: "Codebook" },
];

export const EXPORT_DELIVERY_FORMAT_OPTIONS: ReadonlyArray<{
  value: ExportDeliveryFormat;
  label: string;
}> = [
  { value: "Csv", label: "CSV" },
  { value: "Json", label: "JSON" },
];

export function getDeliveryFormatOptionsForTarget(
  exportTarget: ExportTarget,
  capabilities: ExportCapabilityDto[],
): ReadonlyArray<{ value: ExportDeliveryFormat; label: string }> {
  const fromCapabilities = EXPORT_DELIVERY_FORMAT_OPTIONS.filter((option) =>
    capabilities.some(
      (capability) =>
        capability.target === exportTarget &&
        capability.deliveryFormat === option.value,
    ),
  );

  if (fromCapabilities.length > 0) {
    return fromCapabilities;
  }

  if (exportTarget === "Codebook") {
    return EXPORT_DELIVERY_FORMAT_OPTIONS.filter(
      (option) => option.value === "Json",
    );
  }

  return EXPORT_DELIVERY_FORMAT_OPTIONS;
}

export function getExportCapabilityForSelection(
  exportTarget: ExportTarget,
  deliveryFormat: ExportDeliveryFormat,
  profile: ExportProfile,
  capabilities: ExportCapabilityDto[],
): ExportCapabilityDto | undefined {
  return capabilities.find(
    (capability) =>
      capability.target === exportTarget &&
      capability.deliveryFormat === deliveryFormat &&
      capability.profile === profile,
  );
}

export function getProfileOptionsForSelection(
  exportTarget: ExportTarget,
  deliveryFormat: ExportDeliveryFormat,
  capabilities: ExportCapabilityDto[],
): ReadonlyArray<{ value: ExportProfile; label: string; description: string }> {
  const matchingCapabilities = capabilities.filter(
    (capability) =>
      capability.target === exportTarget &&
      capability.deliveryFormat === deliveryFormat,
  );

  const fromCapabilities = EXPORT_PROFILE_OPTIONS.filter((option) =>
    matchingCapabilities.some(
      (capability) => capability.profile === option.value,
    ),
  ).map((option) => ({
    value: option.value,
    label: option.label,
    description:
      matchingCapabilities.find(
        (capability) => capability.profile === option.value,
      )?.description ?? "",
  }));

  if (fromCapabilities.length > 0) {
    return fromCapabilities;
  }

  if (exportTarget === "Codebook" && deliveryFormat === "Json") {
    return EXPORT_PROFILE_OPTIONS.map((option) => ({
      ...option,
      description: "",
    }));
  }

  return EXPORT_PROFILE_OPTIONS.filter(
    (option) => option.value === "Native",
  ).map((option) => ({ ...option, description: "" }));
}
