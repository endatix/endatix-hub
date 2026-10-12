import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { variableNameFromName } from "../property-types";

export const SKIP_COLUMN = "skip";

/** What each file column feeds: a property's variable name, or `SKIP_COLUMN`. */
export type ColumnMap = Record<string, string>;

/** A choice property and its `variable__choice` columns, which the API reads by name. */
export type ChoiceColumnGroup = {
  property: AudienceProperty;
  columns: string[];
};

const CHOICE_SEPARATOR = "__";

const IDENTIFIER_KEYS: Readonly<Record<AudienceIdentifierKind, string[]>> = {
  [AudienceIdentifierKind.Email]: ["email", "email_address", "e_mail"],
  [AudienceIdentifierKind.ExternalId]: ["external_id", "externalid", "id"],
};

/** A choice property: filled from `variable__choice` columns, never mapped by hand. */
export function isChoiceProperty(property: AudienceProperty): boolean {
  return (
    property.dataType === AudienceDataType.SingleChoice ||
    property.dataType === AudienceDataType.MultipleChoice
  );
}

/** Properties a column can be mapped to; a choice property takes `variable__choice` columns. */
export function importableProperties(
  properties: readonly AudienceProperty[],
): AudienceProperty[] {
  return properties.filter((property) => !isChoiceProperty(property));
}

function choiceColumnsOf(property: AudienceProperty, headers: string[]) {
  const prefix = `${property.variableName}${CHOICE_SEPARATOR}`.toLowerCase();
  return headers.filter((header) => header.toLowerCase().startsWith(prefix));
}

/** Each choice property the file has `variable__choice` columns for, in property order. */
export function choiceColumnGroups(
  headers: string[],
  properties: readonly AudienceProperty[],
): ChoiceColumnGroup[] {
  return properties
    .filter(isChoiceProperty)
    .map((property) => ({
      property,
      columns: choiceColumnsOf(property, headers),
    }))
    .filter((group) => group.columns.length > 0);
}

/** Columns the reader maps by hand: named, not the identifier, not read by a choice property. */
export function mappableColumns(
  headers: string[],
  identifierColumn: string,
  properties: readonly AudienceProperty[],
): string[] {
  const read = new Set(
    choiceColumnGroups(headers, properties).flatMap((group) => group.columns),
  );
  return headers.filter(
    (header) => header && header !== identifierColumn && !read.has(header),
  );
}

/** The column whose name says it holds the match key; `""` when none does. */
export function suggestIdentifierColumn(
  headers: string[],
  kind: AudienceIdentifierKind,
): string {
  const keys = IDENTIFIER_KEYS[kind] ?? [];
  return (
    headers.find((header) => keys.includes(variableNameFromName(header))) ?? ""
  );
}

/**
 * Each column mapped to the property whose variable name its header would produce, so
 * `Family size` finds `family_size`; one column per property, the rest not imported.
 */
export function suggestColumnMap(
  columns: string[],
  properties: readonly AudienceProperty[],
): ColumnMap {
  const free = new Map(
    importableProperties(properties).map((p) => [p.variableName, p]),
  );
  const map: ColumnMap = {};
  for (const column of columns) {
    const match = free.get(variableNameFromName(column));
    map[column] = match?.variableName ?? SKIP_COLUMN;
    if (match) free.delete(match.variableName);
  }
  return map;
}

/** The API's `propertyColumns`: property variable name → the column it is read from. */
export function propertyColumnMap(map: ColumnMap): Record<string, string> {
  return Object.fromEntries(
    Object.entries(map)
      .filter(([, variableName]) => variableName !== SKIP_COLUMN)
      .map(([column, variableName]) => [variableName, column]),
  );
}

/** The suggested identifier column and the suggested property for every other column. */
export function suggestColumnChoices(
  headers: string[],
  setup: {
    identifierKind: AudienceIdentifierKind;
    properties: readonly AudienceProperty[];
  },
): { identifier: string; columns: ColumnMap } {
  const identifier = suggestIdentifierColumn(headers, setup.identifierKind);
  const mappable = mappableColumns(headers, identifier, setup.properties);
  return { identifier, columns: suggestColumnMap(mappable, setup.properties) };
}
