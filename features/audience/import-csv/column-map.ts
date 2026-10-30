import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { variableNameFromName } from "../property-types";

/** Not a variable name, so a property or header called `skip` stays selectable. */
export const SKIP_COLUMN = ":skip";

/** A column queued to become a new property, created on the New properties step. */
export const CREATE_COLUMN = ":create";

/** What each file column feeds: a property's variable name, `CREATE_COLUMN` or `SKIP_COLUMN`. */
export type ColumnMap = Record<string, string>;

/** How many columns are mapped to a property, queued to create one, or left out. */
export type ColumnTally = { mapped: number; toCreate: number; ignored: number };

/** A choice property and its `variable__choice` columns, which the API reads by name. */
export type ChoiceColumnGroup = {
  property: AudienceProperty;
  columns: string[];
};

/**
 * `variable__choice` columns no property has the variable of, read as one multiple-choice
 * property: its choices are the suffixes in file order, and `__other` / `__other_text` allow Other.
 */
export type NewChoiceGroup = {
  /** The group's row in a `ColumnMap`: `variable__*`. */
  key: string;
  variable: string;
  columns: string[];
  choices: string[];
  allowsOther: boolean;
};

const CHOICE_SEPARATOR = "__";
const GROUP_KEY_SUFFIX = `${CHOICE_SEPARATOR}*`;
const OTHER_SUFFIXES = new Set(["other", "other_text"]);
/** The API's separator between a cell's choices, so a choice key cannot hold it. */
const CHOICE_VALUE_SEPARATOR = "|";

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
    .filter((property) => isChoiceProperty(property))
    .map((property) => ({
      property,
      columns: choiceColumnsOf(property, headers),
    }))
    .filter((group) => group.columns.length > 0);
}

export const isChoiceGroupKey = (key: string) => key.endsWith(GROUP_KEY_SUFFIX);

/** The header's variable and choice when the API would read it as a choice column; else `null`. */
function splitChoiceHeader(header: string) {
  const at = header.indexOf(CHOICE_SEPARATOR);
  if (at <= 0) return null;
  const variable = header.slice(0, at);
  if (variableNameFromName(variable) !== variable.toLowerCase()) return null;
  return {
    variable: variable.toLowerCase(),
    choice: header.slice(at + CHOICE_SEPARATOR.length),
  };
}

function headersByVariable(headers: string[]) {
  const byVariable = new Map<string, { column: string; choice: string }[]>();
  for (const column of headers) {
    const split = splitChoiceHeader(column);
    if (!split) continue;
    const group = byVariable.get(split.variable) ?? [];
    group.push({ column, choice: split.choice });
    byVariable.set(split.variable, group);
  }
  return byVariable;
}

/** Keys the API takes: one or more, none blank, none with `|`, none repeated in any case. */
function validChoices(choices: string[]): boolean {
  const lower = new Set(choices.map((choice) => choice.toLowerCase()));
  return (
    choices.length > 0 &&
    lower.size === choices.length &&
    choices.every(
      (choice) => choice.trim() && !choice.includes(CHOICE_VALUE_SEPARATOR),
    )
  );
}

function groupOf(
  variable: string,
  members: { column: string; choice: string }[],
): NewChoiceGroup | null {
  const isOther = (choice: string) => OTHER_SUFFIXES.has(choice.toLowerCase());
  const choices = members.map((m) => m.choice).filter((c) => !isOther(c));
  if (members.length < 2 || !validChoices(choices)) return null;
  return {
    key: `${variable}${GROUP_KEY_SUFFIX}`,
    variable,
    columns: members.map((member) => member.column),
    choices,
    allowsOther: members.some((member) => isOther(member.choice)),
  };
}

/**
 * Each set of two or more `variable__choice` columns whose variable no property has, as a new
 * multiple-choice property. Columns that could not make one (a blank, repeated or `|` choice, or
 * only Other) stay ordinary columns, as the API reads them.
 */
export function newChoiceGroups(
  headers: string[],
  identifierColumn: string,
  properties: readonly AudienceProperty[],
): NewChoiceGroup[] {
  const known = new Set(properties.map((p) => p.variableName.toLowerCase()));
  const candidates = headers.filter((header) => header !== identifierColumn);
  return [...headersByVariable(candidates)]
    .filter(([variable]) => !known.has(variable))
    .map(([variable, members]) => groupOf(variable, members))
    .filter((group): group is NewChoiceGroup => group !== null);
}

/** A group's key where its first column was, and its other columns left out. */
function rowOf(header: string, groups: readonly NewChoiceGroup[]) {
  const group = groups.find((g) => g.columns.includes(header));
  if (!group) return header;
  return group.columns[0] === header ? group.key : null;
}

/**
 * The rows the reader maps by hand, in file order: each named column that is not the identifier
 * and not read by a choice property, and each new choice group once, by its key.
 */
export function mappableColumns(
  headers: string[],
  identifierColumn: string,
  properties: readonly AudienceProperty[],
): string[] {
  const read = new Set(
    choiceColumnGroups(headers, properties).flatMap((group) => group.columns),
  );
  const groups = newChoiceGroups(headers, identifierColumn, properties);
  return headers
    .filter(
      (header) => header && header !== identifierColumn && !read.has(header),
    )
    .map((header) => rowOf(header, groups))
    .filter((row): row is string => row !== null);
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
 * `Family size` finds `family_size`; one column per property. A column named like no property
 * is queued to create one; a column named like a property another column already feeds (or a
 * choice property) is not imported.
 */
export function suggestColumnMap(
  columns: string[],
  properties: readonly AudienceProperty[],
): ColumnMap {
  const free = new Map(
    importableProperties(properties).map((p) => [p.variableName, p]),
  );
  const named = new Set(properties.map((p) => p.variableName));
  const map: ColumnMap = {};
  for (const column of columns) {
    if (isChoiceGroupKey(column)) {
      map[column] = CREATE_COLUMN;
      continue;
    }
    const variableName = variableNameFromName(column);
    const match = free.get(variableName);
    map[column] =
      match?.variableName ??
      (named.has(variableName) ? SKIP_COLUMN : CREATE_COLUMN);
    if (match) free.delete(match.variableName);
  }
  return map;
}

/** What a column's decision does; a decision kind added later is counted by name, never as mapped. */
type DecisionKind = keyof ColumnTally;

/** The one place a decision is read: `SKIP_COLUMN`, `CREATE_COLUMN`, or a property's variable name. */
function decisionKind(decision: string | undefined): DecisionKind {
  if (decision === undefined || decision === SKIP_COLUMN) return "ignored";
  if (decision === CREATE_COLUMN) return "toCreate";
  return "mapped";
}

/** The columns queued to become new properties, in file order. */
export function queuedColumns(columns: string[], map: ColumnMap): string[] {
  return columns.filter((column) => decisionKind(map[column]) === "toCreate");
}

/** The running tally the Columns step shows, so a column left unhandled is seen at a glance. */
export function columnTally(columns: string[], map: ColumnMap): ColumnTally {
  const tally: ColumnTally = { mapped: 0, toCreate: 0, ignored: 0 };
  for (const column of columns) tally[decisionKind(map[column])] += 1;
  return tally;
}

/**
 * The API's `propertyColumns`: property variable name → the column it is read from. A choice
 * group is left out: the API reads its `variable__choice` columns by name.
 */
export function propertyColumnMap(map: ColumnMap): Record<string, string> {
  return Object.fromEntries(
    Object.entries(map)
      .filter(
        ([column, decision]) =>
          !isChoiceGroupKey(column) && decisionKind(decision) === "mapped",
      )
      .map(([column, variableName]) => [variableName, column]),
  );
}

/**
 * The map after the identifier moves. The new column is the participant. The one it releases
 * gets a suggestion when it had no decision of its own, so Continue does not treat a missing
 * entry as ignored.
 */
export function columnsAfterIdentifierChange(
  columns: ColumnMap,
  move: { readonly from: string; readonly to: string },
  properties: readonly AudienceProperty[],
): ColumnMap {
  const chosen = { ...columns, [move.to]: SKIP_COLUMN };
  if (!move.from || move.from === move.to || chosen[move.from] !== undefined)
    return chosen;
  return { ...chosen, ...suggestColumnMap([move.from], properties) };
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
