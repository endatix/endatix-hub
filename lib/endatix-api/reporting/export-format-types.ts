/** Wire enum values from the Reporting API contract — not UI copy. */
export type ExportTarget = "Submissions" | "Codebook";
export type ExportDeliveryFormat = "Csv" | "Json";
export type ExportProfile = "Native" | "Shoji";

export interface ColumnAliasNamingConventionDto {
  wireKey: string;
  label: string;
  description: string;
  example?: string | null;
}

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
  aliasProfile: string;
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
  aliasProfile?: string;
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

export interface ExportSelectOption<T extends string> {
  value: T;
  label: string;
}

export interface ExportProfileSelectOption extends ExportSelectOption<ExportProfile> {
  description: string;
}

export function getExportFormatLabel(format: ExportFormatListItem): string {
  if (format.name?.trim()) {
    return format.name.trim();
  }

  return format.label;
}

export function getColumnAliasProfileLabel(
  aliasProfile: string,
  namingConventions: ReadonlyArray<ColumnAliasNamingConventionDto> = [],
): string {
  return (
    namingConventions.find((option) => option.wireKey === aliasProfile)
      ?.label ?? aliasProfile
  );
}

export function getColumnAliasNamingConvention(
  aliasProfile: string,
  namingConventions: ReadonlyArray<ColumnAliasNamingConventionDto>,
): ColumnAliasNamingConventionDto | undefined {
  return namingConventions.find((option) => option.wireKey === aliasProfile);
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

/**
 * Display label for an export format's type — prefers the API capability/format label.
 */
export function getExportFormatTypeLabel(
  format: ExportFormatListItem,
  capabilities: ReadonlyArray<ExportCapabilityDto> = [],
): string {
  const capability = getExportCapabilityForSelection(
    format.exportTarget,
    format.deliveryFormat,
    format.profile,
    capabilities,
  );

  return capability?.label ?? format.label;
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
    aliasProfile?: string;
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

function formatDeliveryLabel(deliveryFormat: ExportDeliveryFormat): string {
  if (deliveryFormat === "Csv") {
    return "CSV";
  }

  return deliveryFormat.toUpperCase();
}

/** Distinct export targets present in the capabilities catalog. */
export function getExportTargetOptions(
  capabilities: ReadonlyArray<ExportCapabilityDto>,
): ReadonlyArray<ExportSelectOption<ExportTarget>> {
  const options: ExportSelectOption<ExportTarget>[] = [];
  const seen = new Set<ExportTarget>();

  for (const capability of capabilities) {
    if (seen.has(capability.target)) {
      continue;
    }

    seen.add(capability.target);
    options.push({
      value: capability.target,
      label: capability.target,
    });
  }

  return options;
}

/** Delivery formats for a target, derived from capabilities (no Hub fallback catalog). */
export function getDeliveryFormatOptionsForTarget(
  exportTarget: ExportTarget,
  capabilities: ReadonlyArray<ExportCapabilityDto>,
): ReadonlyArray<ExportSelectOption<ExportDeliveryFormat>> {
  const options: ExportSelectOption<ExportDeliveryFormat>[] = [];
  const seen = new Set<ExportDeliveryFormat>();

  for (const capability of capabilities) {
    if (
      capability.target !== exportTarget ||
      seen.has(capability.deliveryFormat)
    ) {
      continue;
    }

    seen.add(capability.deliveryFormat);
    options.push({
      value: capability.deliveryFormat,
      label: formatDeliveryLabel(capability.deliveryFormat),
    });
  }

  return options;
}

export function getExportCapabilityForSelection(
  exportTarget: ExportTarget,
  deliveryFormat: ExportDeliveryFormat,
  profile: ExportProfile,
  capabilities: ReadonlyArray<ExportCapabilityDto>,
): ExportCapabilityDto | undefined {
  return capabilities.find(
    (capability) =>
      capability.target === exportTarget &&
      capability.deliveryFormat === deliveryFormat &&
      capability.profile === profile,
  );
}

/** Profile/variant options for a target+delivery pair — labels/descriptions from capabilities. */
export function getProfileOptionsForSelection(
  exportTarget: ExportTarget,
  deliveryFormat: ExportDeliveryFormat,
  capabilities: ReadonlyArray<ExportCapabilityDto>,
): ReadonlyArray<ExportProfileSelectOption> {
  const options: ExportProfileSelectOption[] = [];
  const seen = new Set<ExportProfile>();

  for (const capability of capabilities) {
    if (
      capability.target !== exportTarget ||
      capability.deliveryFormat !== deliveryFormat ||
      seen.has(capability.profile)
    ) {
      continue;
    }

    seen.add(capability.profile);
    options.push({
      value: capability.profile,
      label: capability.label,
      description: capability.description,
    });
  }

  return options;
}

/** First valid create selection from the capabilities catalog, or null when empty. */
export function getDefaultExportFormatSelection(
  capabilities: ReadonlyArray<ExportCapabilityDto>,
): {
  exportTarget: ExportTarget;
  deliveryFormat: ExportDeliveryFormat;
  profile: ExportProfile;
} | null {
  const first = capabilities[0];
  if (!first) {
    return null;
  }

  return {
    exportTarget: first.target,
    deliveryFormat: first.deliveryFormat,
    profile: first.profile,
  };
}

/** Whether create UI has the catalogs needed for a valid export format. */
export function canCreateExportFormat(
  capabilities: ReadonlyArray<ExportCapabilityDto>,
  namingConventions: ReadonlyArray<ColumnAliasNamingConventionDto>,
): boolean {
  return (
    getDefaultExportFormatSelection(capabilities) !== null &&
    namingConventions.length > 0
  );
}
