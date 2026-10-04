import {
  AudienceDataType,
  AudienceIdentifierKind,
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

export function dataTypeLabel(dataType: string): string {
  return (
    AUDIENCE_DATA_TYPES.find((entry) => entry.value === dataType)?.label ??
    dataType
  );
}

const IDENTIFIER_KIND_UI: Readonly<
  Record<AudienceIdentifierKind, { label: string; placeholder: string }>
> = Object.freeze({
  [AudienceIdentifierKind.Email]: {
    label: "Email",
    placeholder: "alex@example.com",
  },
  [AudienceIdentifierKind.ExternalId]: {
    label: "External ID",
    placeholder: "ext-1001",
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
