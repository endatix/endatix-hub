import type {
  ExportDeliveryFormat,
  ExportProfile,
  ExportTarget,
} from "./export-format-types";

export const TARGET_VALUES: readonly ExportTarget[] = [
  "Submissions",
  "Codebook",
];
export const DELIVERY_VALUES: readonly ExportDeliveryFormat[] = ["Csv", "Json"];
export const PROFILE_VALUES: readonly ExportProfile[] = ["Native", "Shoji"];

/**
 * Normalizes API enum values that may arrive as strings (any casing) or
 * legacy numeric indexes. Returns undefined when the value is unsupported.
 */
export function normalizeEnumValue<T extends string>(
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
