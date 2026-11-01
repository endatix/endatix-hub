/**
 * The `variable__choice` rules here mirror the API's import reader (OSS):
 * `Endatix.Modules.Audience.Features.Import.CsvColumnMapper` (the first `__` splits a header,
 * the variable, the choice keys and the `other` / `other_text` suffixes match in any case). The
 * choice keys must also pass `choicesError` (`PropertyValueRules.ChoicesError`). Keep them
 * aligned; `__tests__/column-map.test.ts` pins the cases.
 */

import {
  AudienceIdentifierKind,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { choicesError, isChoiceType } from "../property-draft";
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
  /**
   * The group's row in a `ColumnMap`: `variable__`. No column of the file can be named that while
   * the group exists, since a blank choice breaks the group.
   */
  key: string;
  variable: string;
  columns: string[];
  choices: string[];
  allowsOther: boolean;
};

const CHOICE_SEPARATOR = "__";
const OTHER_SUFFIXES = new Set(["other", "other_text"]);

const IDENTIFIER_KEYS: Readonly<Record<AudienceIdentifierKind, string[]>> = {
  [AudienceIdentifierKind.Email]: ["email", "email_address", "e_mail"],
  [AudienceIdentifierKind.ExternalId]: ["external_id", "externalid", "id"],
};

/** A choice property: filled from `variable__choice` columns, never mapped by hand. */
export function isChoiceProperty(property: AudienceProperty): boolean {
  return isChoiceType(property.dataType);
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

/**
 * Keys the API takes as a Property's choices, none repeated in any case either: the import matches
 * a suffix to a choice key in any case, so `Nike` and `nike` would read as one.
 */
function validChoices(choices: string[]): boolean {
  const lower = new Set(choices.map((choice) => choice.toLowerCase()));
  return choicesError(choices) === null && lower.size === choices.length;
}

function groupOf(
  variable: string,
  members: { column: string; choice: string }[],
): NewChoiceGroup | null {
  const isOther = (choice: string) => OTHER_SUFFIXES.has(choice.toLowerCase());
  const choices = members.map((m) => m.choice).filter((c) => !isOther(c));
  if (members.length < 2 || !validChoices(choices)) return null;
  return {
    key: `${variable}${CHOICE_SEPARATOR}`,
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
 * and not read by a choice property, and each new choice group once, by its key; with the groups.
 */
export function columnRows(
  headers: string[],
  identifierColumn: string,
  properties: readonly AudienceProperty[],
) {
  const read = new Set(
    choiceColumnGroups(headers, properties).flatMap((group) => group.columns),
  );
  const groups = newChoiceGroups(headers, identifierColumn, properties);
  const rows = headers
    .filter(
      (header) => header && header !== identifierColumn && !read.has(header),
    )
    .map((header) => rowOf(header, groups))
    .filter((row): row is string => row !== null);
  return { rows, groups };
}

/** The rows of `columnRows`, without the groups. */
export function mappableColumns(
  headers: string[],
  identifierColumn: string,
  properties: readonly AudienceProperty[],
): string[] {
  return columnRows(headers, identifierColumn, properties).rows;
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
    map[column] = suggestionFor(column, { free, named });
    free.delete(map[column]);
  }
  return map;
}

/**
 * A free property named like the column, else created or skipped. A group's key `variable__`
 * gives its variable, which no property has, so a group is created.
 */
function suggestionFor(
  column: string,
  { free, named }: { free: Map<string, AudienceProperty>; named: Set<string> },
): string {
  const variableName = variableNameFromName(column);
  const match = free.get(variableName);
  if (match) return match.variableName;
  return named.has(variableName) ? SKIP_COLUMN : CREATE_COLUMN;
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

/** The rows queued to create a property, and the file's new choice groups for their drafts; none with no file. */
export function queuedRows(
  file: { headers: string[] } | undefined,
  choices: { identifierColumn: string; columns: ColumnMap },
  properties: readonly AudienceProperty[],
) {
  const headers = file?.headers ?? [];
  const { rows, groups } = columnRows(
    headers,
    choices.identifierColumn,
    properties,
  );
  return { queued: queuedColumns(rows, choices.columns), groups };
}

/**
 * The API's `propertyColumns`: property variable name → the column it is read from. A choice
 * group is never mapped: the API reads its `variable__choice` columns by name.
 */
export function propertyColumnMap(map: ColumnMap): Record<string, string> {
  return Object.fromEntries(
    Object.entries(map)
      .filter(([, decision]) => decisionKind(decision) === "mapped")
      .map(([column, variableName]) => [variableName, column]),
  );
}

/**
 * The map after the identifier moves to `identifier`, which is the participant. Only the rows
 * left keep their decisions, so a column a group the move forms takes in is never sent as its own;
 * every row with none (the column released, a formed group, a column a broken group leaves) gets
 * a suggestion, so Continue does not treat a missing entry as ignored.
 */
export function columnsAfterIdentifierChange(
  columns: ColumnMap,
  identifier: string,
  file: { headers: string[]; properties: readonly AudienceProperty[] },
): ColumnMap {
  const rows = mappableColumns(file.headers, identifier, file.properties);
  const kept = rows.filter((row) => columns[row] !== undefined);
  const missing = rows.filter((row) => columns[row] === undefined);
  return {
    ...Object.fromEntries(kept.map((row) => [row, columns[row]])),
    [identifier]: SKIP_COLUMN,
    ...suggestColumnMap(missing, file.properties),
  };
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
