import { TelemetryLogger } from "@/features/telemetry";
import type { ExportCapabilityDto } from "./export-format-types";
import {
  DELIVERY_VALUES,
  PROFILE_VALUES,
  TARGET_VALUES,
  normalizeEnumValue,
} from "./normalize-export-enums";

const LOGGER_NAME = "reporting.normalize-export-capabilities";

export function normalizeExportCapability(
  capability: ExportCapabilityDto,
): ExportCapabilityDto | null {
  const target = normalizeEnumValue(capability.target, TARGET_VALUES);
  const deliveryFormat = normalizeEnumValue(
    capability.deliveryFormat,
    DELIVERY_VALUES,
  );
  const profile = normalizeEnumValue(capability.profile, PROFILE_VALUES);
  const wireKey =
    typeof capability.wireKey === "string" && capability.wireKey.trim()
      ? capability.wireKey.trim()
      : undefined;

  if (!target || !deliveryFormat || !profile || !wireKey) {
    const failures: string[] = [];
    if (!target) {
      failures.push("target");
    }
    if (!deliveryFormat) {
      failures.push("deliveryFormat");
    }
    if (!profile) {
      failures.push("profile");
    }
    if (!wireKey) {
      failures.push("wireKey");
    }

    TelemetryLogger.warn(
      "Dropped invalid export capability during normalization",
      {
        "capability.target": String(capability.target ?? ""),
        "capability.deliveryFormat": String(capability.deliveryFormat ?? ""),
        "capability.profile": String(capability.profile ?? ""),
        "capability.wireKey": String(capability.wireKey ?? ""),
        "capability.label": String(capability.label ?? ""),
        "normalization.failures": failures.join(","),
      },
      LOGGER_NAME,
    );
    return null;
  }

  return {
    target,
    deliveryFormat,
    profile,
    wireKey,
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
