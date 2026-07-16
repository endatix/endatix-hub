import type { ColumnAliasNamingConventionDto } from "./export-format-types";

export function normalizeExportNamingConvention(
  convention: ColumnAliasNamingConventionDto,
): ColumnAliasNamingConventionDto | null {
  if (
    typeof convention.wireKey !== "string" ||
    !convention.wireKey.trim() ||
    typeof convention.label !== "string" ||
    !convention.label.trim() ||
    typeof convention.description !== "string" ||
    !convention.description.trim()
  ) {
    return null;
  }

  const example =
    typeof convention.example === "string" && convention.example.trim()
      ? convention.example.trim()
      : null;

  return {
    wireKey: convention.wireKey.trim(),
    label: convention.label.trim(),
    description: convention.description.trim(),
    example,
  };
}

export function normalizeExportNamingConventions(
  conventions: ColumnAliasNamingConventionDto[],
): ColumnAliasNamingConventionDto[] {
  return conventions
    .map(normalizeExportNamingConvention)
    .filter(
      (convention): convention is ColumnAliasNamingConventionDto =>
        convention !== null,
    );
}
