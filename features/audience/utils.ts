import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceProperty,
  type AudiencePropertyValues,
} from "@/lib/endatix-api/audience/types";

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

/** A JSON array of keys (choices, or a multiple-choice value); `undefined` when it is not one. */
export function parseKeyArray(
  json: string | null | undefined,
): string[] | undefined {
  if (!json) return undefined;
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : undefined;
  } catch {
    return undefined;
  }
}

/** Choice keys of a choice property; empty for other types or unparsable JSON. */
export function choiceKeysOf(property: AudienceProperty): string[] {
  return parseKeyArray(property.choicesJson) ?? [];
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * A stored date-time as a `datetime-local` value in the reader's time zone. A stored value with
 * no offset is UTC, as the API reads it (`DateTimeStyles.AssumeUniversal`). Empty when unreadable.
 */
export function toLocalDateTimeInput(value: string): string {
  if (!value) return "";
  const date = new Date(HAS_OFFSET.test(value) ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return "";
  const day = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  return `${day}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/**
 * A `datetime-local` value as ISO 8601 with the reader's offset (`2026-03-01T09:00+02:00`), so the
 * API stores the instant they meant instead of reading the wall time as UTC.
 */
export function fromLocalDateTimeInput(local: string): string {
  if (!local) return "";
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return local;
  const minutes = -date.getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  return `${local.slice(0, 16)}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
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
      return toLocalDateTimeInput(value).replace("T", " ") || value;
    case AudienceDataType.MultipleChoice:
      return parseKeyArray(value)?.join(", ") ?? value;
    default:
      return value;
  }
}

/**
 * Only the values that differ from what the person has; an emptied value clears its cell. Both
 * sides are compared trimmed, so a stored value with stray spaces is not rewritten untouched.
 */
export function changedValues(
  saved: AudiencePropertyValues,
  edited: AudiencePropertyValues,
): AudiencePropertyValues {
  const changes: AudiencePropertyValues = {};
  for (const [propertyId, value] of Object.entries(edited)) {
    const next = value.trim();
    if (next !== (saved[propertyId] ?? "").trim()) changes[propertyId] = next;
  }
  return changes;
}
