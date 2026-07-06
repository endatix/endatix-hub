import { parseScalarString } from "@/lib/utils/type-parsers";

/**
 * Canonical string key for comparing SurveyJS choice values (handles 1 vs '1').
 */
export function normalizeChoiceKey(value: unknown): string {
  return parseScalarString(value) ?? "";
}
