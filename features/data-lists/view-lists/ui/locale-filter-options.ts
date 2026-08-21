import "survey-core/i18n";
import { surveyLocalization } from "survey-core";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import type { FacetedFilterOption } from "@/components/table";

/**
 * SurveyJS locale catalog options for FacetedFilter (code + friendly label).
 */
export function getSurveyLocaleFilterOptions(): FacetedFilterOption[] {
  const names = surveyLocalization.localeNames as
    | Record<string, string>
    | undefined;
  const codes = Object.keys(names ?? {})
    .map((code) => code.trim().toLowerCase())
    .filter((code) => code.length > 0);

  const unique = [...new Set(codes)].sort((a, b) => a.localeCompare(b));
  return unique.map((value) => ({
    value,
    label: formatLocaleLabel(value),
  }));
}
