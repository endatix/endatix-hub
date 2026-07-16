import type {
  ExportCapabilityDto,
  ExportDeliveryFormat,
  ExportProfile,
  ExportTarget,
} from "./export-format-types";

const TARGET_VALUES: ExportTarget[] = ["Submissions", "Codebook"];
const DELIVERY_VALUES: ExportDeliveryFormat[] = ["Csv", "Json"];
const PROFILE_VALUES: ExportProfile[] = ["Native", "Shoji"];

function normalizeEnumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  if (typeof value === "string" && allowed.includes(value as T)) {
    return value as T;
  }

  if (typeof value === "number" && value >= 0 && value < allowed.length) {
    return allowed[value];
  }

  return undefined;
}

export function normalizeExportCapability(
  capability: ExportCapabilityDto,
): ExportCapabilityDto | null {
  const target = normalizeEnumValue(capability.target, TARGET_VALUES);
  const deliveryFormat = normalizeEnumValue(
    capability.deliveryFormat,
    DELIVERY_VALUES,
  );
  const profile = normalizeEnumValue(capability.profile, PROFILE_VALUES);

  if (!target || !deliveryFormat || !profile || !capability.wireKey) {
    return null;
  }

  return {
    target,
    deliveryFormat,
    profile,
    wireKey: capability.wireKey,
    label: capability.label,
    itemTypeName: capability.itemTypeName,
    description: capability.description ?? "",
  };
}

export function normalizeExportCapabilities(
  capabilities: ExportCapabilityDto[],
): ExportCapabilityDto[] {
  return capabilities
    .map(normalizeExportCapability)
    .filter(
      (capability): capability is ExportCapabilityDto => capability !== null,
    );
}
