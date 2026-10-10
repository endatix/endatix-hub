import { AudienceDataType } from "@/lib/endatix-api/audience/types";

export const AUDIENCE_DATA_TYPES: ReadonlyArray<{
  value: AudienceDataType;
  label: string;
}> = Object.freeze([
  { value: AudienceDataType.Text, label: "Text" },
  { value: AudienceDataType.Number, label: "Number" },
  { value: AudienceDataType.Boolean, label: "Boolean" },
  { value: AudienceDataType.Date, label: "Date" },
  { value: AudienceDataType.DateTime, label: "Date & time" },
  { value: AudienceDataType.SingleChoice, label: "Single choice" },
  { value: AudienceDataType.MultipleChoice, label: "Multiple choice" },
]);

/**
 * Types a new property can use. Choice types need choices, which the API requires and this tab
 * has no editor for yet, so they are left out until the import wizard adds one.
 */
export const CREATABLE_DATA_TYPES = Object.freeze(
  AUDIENCE_DATA_TYPES.filter(
    (entry) =>
      entry.value !== AudienceDataType.SingleChoice &&
      entry.value !== AudienceDataType.MultipleChoice,
  ),
);

export function dataTypeLabel(dataType: string): string {
  return (
    AUDIENCE_DATA_TYPES.find((entry) => entry.value === dataType)?.label ??
    dataType
  );
}

function isAsciiLetterOrDigit(char: string): boolean {
  const code = char.codePointAt(0) ?? -1;
  return (code >= 48 && code <= 57) || (code >= 97 && code <= 122);
}

function appendSlugChar(slug: string, char: string, gap: boolean): string {
  return gap && slug.length > 0 ? `${slug}_${char}` : slug + char;
}

/**
 * The variable name the API derives from a property name (`Property.Slugify` in OSS): lower-case
 * ASCII letters and digits, every other run of characters becomes one `_`. Empty when the name
 * has no ASCII letter or digit, which the API refuses.
 */
export function variableNameFromName(name: string): string {
  let slug = "";
  let gap = false;
  for (const char of name.trim().toLowerCase()) {
    if (!isAsciiLetterOrDigit(char)) {
      gap = true;
      continue;
    }
    slug = appendSlugChar(slug, char, gap);
    gap = false;
  }
  return slug;
}
