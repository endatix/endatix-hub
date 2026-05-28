import { DATA_LIST_NAME_MAX_LENGTH } from "../constants";
import { resolveLocalizedText, toPlainText } from "./survey-localized-text";

/**
 * Derives a unique data list name from a question title or name.
 */
export function getQuestionDataListName(
  question: { title?: unknown; name: string },
  existingNames: Set<string>,
): string {
  const fromTitle = toPlainText(resolveLocalizedText(question.title));
  const fromName = toPlainText(question.name || "");
  const baseSource =
    fromTitle || (fromName.length > 0 ? fromName : "Data list");
  const sanitized = baseSource
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DATA_LIST_NAME_MAX_LENGTH);
  const base = sanitized.length > 0 ? sanitized : "Data list";

  let candidate = base;
  let n = 2;
  while (existingNames.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`;
    const maxBaseLength = Math.max(
      1,
      DATA_LIST_NAME_MAX_LENGTH - suffix.length,
    );
    const trimmedBase = base.slice(0, maxBaseLength).trim();
    const normalizedBase = trimmedBase.length > 0 ? trimmedBase : "Data list";
    candidate = `${normalizedBase}${suffix}`;
    n++;
  }
  existingNames.add(candidate.toLowerCase());
  return candidate;
}
