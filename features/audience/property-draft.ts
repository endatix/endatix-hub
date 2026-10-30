import { AudienceDataType } from "@/lib/endatix-api/audience/types";
import type { CreateAudiencePropertyInput } from "./create-property/create-audience-property.action";

/** A property about to be created, from Add property or the import wizard. */
export type NewPropertyDraft = {
  name: string;
  dataType: AudienceDataType;
  /** Choice keys in the order given; only a choice type sends them. */
  choices: readonly string[];
  /** Whether a choice property takes values outside its choices; only a choice type sends it. */
  allowsOther: boolean;
};

/** SurveyJS reads a choice written as `value|text`, so a key containing it never matches. */
const CHOICE_VALUE_SEPARATOR = "|";

export function isChoiceType(dataType: AudienceDataType): boolean {
  return (
    dataType === AudienceDataType.SingleChoice ||
    dataType === AudienceDataType.MultipleChoice
  );
}

function firstRepeated(choices: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const key of choices) {
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return undefined;
}

/**
 * Why the API would refuse these choice keys (`PropertyValueRules.ChoicesError` in OSS), or
 * `null`: at least one key, none blank, none containing `|`, all distinct (case counts).
 */
export function choicesError(choices: readonly string[]): string | null {
  if (choices.length === 0) return "Add at least one choice.";
  if (choices.some((key) => !key.trim())) return "Choices can't be blank.";
  if (choices.some((key) => key.includes(CHOICE_VALUE_SEPARATOR)))
    return `A choice can't contain "${CHOICE_VALUE_SEPARATOR}".`;
  const repeated = firstRepeated(choices);
  return repeated === undefined ? null : `"${repeated}" is listed twice.`;
}

/** One trimmed key per line; blank lines around the list are ignored, a blank line inside it kept. */
export function choicesFromText(text: string): string[] {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\r\n|\r|\n/).map((line) => line.trim()) : [];
}

/** The create request for a draft: only a choice type sends choices and Other. */
export function toCreateInput(
  formId: string,
  draft: NewPropertyDraft,
): CreateAudiencePropertyInput {
  const choice = isChoiceType(draft.dataType);
  return {
    formId,
    name: draft.name,
    dataType: draft.dataType,
    choicesJson: choice ? JSON.stringify(draft.choices) : null,
    allowsOther: choice && draft.allowsOther,
  };
}
