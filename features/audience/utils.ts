import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceProperty,
  type AudiencePropertyValues,
} from "@/lib/endatix-api/audience/types";

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

const IDENTIFIER_KIND_UI: Readonly<
  Record<
    AudienceIdentifierKind,
    { label: string; placeholder: string; help: string }
  >
> = Object.freeze({
  [AudienceIdentifierKind.Email]: {
    label: "Email",
    placeholder: "alex@example.com",
    help: "One email address. Matching ignores letter case.",
  },
  [AudienceIdentifierKind.ExternalId]: {
    label: "External ID",
    placeholder: "ext-1001",
    help: "The id from your own system. Letter case counts.",
  },
});

export const AUDIENCE_IDENTIFIER_KINDS: ReadonlyArray<{
  value: AudienceIdentifierKind;
  label: string;
}> = Object.freeze(
  Object.values(AudienceIdentifierKind).map((value) => ({
    value,
    label: IDENTIFIER_KIND_UI[value].label,
  })),
);

export function identifierKindLabel(kind: AudienceIdentifierKind): string {
  return IDENTIFIER_KIND_UI[kind]?.label ?? kind;
}

export function identifierKindPlaceholder(
  kind: AudienceIdentifierKind,
): string {
  return IDENTIFIER_KIND_UI[kind]?.placeholder ?? "";
}

export function identifierKindHelp(kind: AudienceIdentifierKind): string {
  return IDENTIFIER_KIND_UI[kind]?.help ?? "";
}

/**
 * The variable name the API derives from a property name (`Property.Slugify` in OSS): lower-case
 * ASCII letters and digits, every other run of characters becomes one `_`. Empty when the name
 * has no ASCII letter or digit, which the API refuses.
 */
export function variableNameFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replace(/^_+/, "")
    .replace(/_+$/, "");
}

/** Choice keys of a choice property; empty for other types or unparsable JSON. */
export function choiceKeysOf(property: AudienceProperty): string[] {
  if (!property.choicesJson) return [];
  try {
    const parsed: unknown = JSON.parse(property.choicesJson);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

const BOOLEAN_LABELS: Readonly<Record<string, string>> = Object.freeze({
  true: "Yes",
  false: "No",
});

/** How a stored value reads in a table cell. `undefined` means the cell is not set. */
export function formatPropertyValue(
  property: AudienceProperty,
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  switch (property.dataType) {
    case AudienceDataType.Boolean:
      return BOOLEAN_LABELS[value] ?? value;
    case AudienceDataType.DateTime:
      return value.replace("T", " ");
    case AudienceDataType.MultipleChoice:
      return parseKeys(value)?.join(", ") ?? value;
    default:
      return value;
  }
}

function parseKeys(value: string): string[] | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : undefined;
  } catch {
    return undefined;
  }
}

/** Only the values that differ from what the person has; an emptied value clears its cell. */
export function changedValues(
  saved: AudiencePropertyValues,
  edited: AudiencePropertyValues,
): AudiencePropertyValues {
  const changes: AudiencePropertyValues = {};
  for (const [propertyId, value] of Object.entries(edited)) {
    const next = value.trim();
    if (next !== (saved[propertyId] ?? "")) changes[propertyId] = next;
  }
  return changes;
}
