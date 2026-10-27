import type { AudienceDataType } from "@/lib/endatix-api/audience/types";
import { variableNameFromName } from "../property-types";
import { suggestDataType, type TypeSuggestion } from "./type-suggestion";

/** A property the New properties step will create from a column, as the scripter edits it. */
export type PropertyDraft = {
  column: string;
  name: string;
  dataType: AudienceDataType;
  suggestion: TypeSuggestion;
};

/** What already holds a variable name: the form's data, a property, or another queued column. */
export type VariableHolder =
  | "question"
  | "calculatedValue"
  | "property"
  | "column";

export type NameCheck = {
  variableName: string;
  /** The name has no ASCII letter or digit, so the API has no variable to give it. */
  invalid: boolean;
  /** What holds the variable already; a warning, never a block. */
  holder: VariableHolder | null;
  /** The first `Name 2`, `Name 3`… whose variable nothing holds, when one was checked. */
  suggestedName: string | null;
};

/** The suffixes a suggested name may take, so the form check can be asked about them at once. */
const SUGGESTED_SUFFIXES = 9;

/** `region_code` → `Region code`: separators become spaces, and the first letter a capital. */
function tidyHeading(heading: string): string {
  const words = heading.replace(/[_\-.\s]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A draft for a queued column: its tidied heading and the type its values suggest. */
export function draftOf(
  column: string,
  values: readonly string[],
): PropertyDraft {
  const suggestion = suggestDataType(values);
  return {
    column,
    name: tidyHeading(column),
    dataType: suggestion.dataType,
    suggestion,
  };
}

const suffixedName = (name: string, suffix: number) =>
  `${name.trim()} ${suffix}`;

const suffixes = () =>
  Array.from({ length: SUGGESTED_SUFFIXES - 1 }, (_, i) => i + 2);

/** The name's variable and each suffixed one a suggestion could take, for the form check. */
export function candidateVariables(name: string): string[] {
  const variableName = variableNameFromName(name);
  if (!variableName) return [];
  return [
    variableName,
    ...suffixes().map((n) => variableNameFromName(suffixedName(name, n))),
  ];
}

function freeName(
  name: string,
  holderOf: (variable: string) => VariableHolder | null,
): string | null {
  const free = suffixes().find(
    (n) => !holderOf(variableNameFromName(suffixedName(name, n))),
  );
  return free === undefined ? null : suffixedName(name, free);
}

/** The variable a draft's name gets, and what already holds it with a free name instead. */
export function checkDraftName(
  name: string,
  holderOf: (variable: string) => VariableHolder | null,
): NameCheck {
  const variableName = variableNameFromName(name);
  const holder = variableName ? holderOf(variableName) : null;
  return {
    variableName,
    invalid: variableName === "",
    holder,
    suggestedName: holder ? freeName(name, holderOf) : null,
  };
}
