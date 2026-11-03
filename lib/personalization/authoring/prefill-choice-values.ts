import { ItemValue, Serializer, type PanelModel, type Question } from "survey-core";
import type { AudienceVariablePreset } from "@/lib/endatix-api/audience/types";
import { prefillSourceNamed, prefillVariableOf, type PrefillSource } from "../coverage/prefill-match";

const WARNING = "edxPrefillFrom_values";

type ChoiceQuestion = Question & {
  choices: ItemValue[];
  choicesFromQuestion?: string;
  choicesByUrl?: { url?: string };
};

/** A select question whose choices the author typed: copied or fetched choices are not known here. */
function ownChoices(question: Question): ItemValue[] | undefined {
  if (!Serializer.isDescendantOf(question.getType(), "selectbase")) return undefined;
  const select = question as ChoiceQuestion;
  if (select.choicesFromQuestion || select.choicesByUrl?.url) return undefined;
  return select.choices;
}

function heldValues(value: unknown): unknown[] {
  const values = Array.isArray(value) ? value : [value];
  return values.filter((item) => item !== undefined && item !== null && item !== "");
}

/**
 * The participants' values for `variable` that no choice of `question` has, each once, sorted so
 * `2` comes before `10`. A choice is selected only when its value equals the prefill,
 * compared as SurveyJS compares them (`1` matches `"1"`).
 */
function unmatchedChoiceValues(
  choices: ItemValue[],
  variable: string,
  participants: readonly AudienceVariablePreset[],
): string[] {
  const held = participants.flatMap((participant) => heldValues(participant.variables[variable]));
  const unmatched = held.filter((value) => !ItemValue.getItemByValue(choices, value)).map(String);
  return [...new Set(unmatched)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

const LISTED_VALUES = 5;

function listedValues(values: string[]): string {
  if (values.length === 1) return values[0];
  if (values.length > LISTED_VALUES) {
    return `${values.slice(0, LISTED_VALUES).join(", ")} or ${values.length - LISTED_VALUES} other values`;
  }
  return `${values.slice(0, -1).join(", ")} or ${values.at(-1)}`;
}

/** The Properties, and the participants the designer knows with their values. */
export type ChoiceAudience = {
  sources: () => PrefillSource[];
  participants: () => AudienceVariablePreset[];
};

/**
 * What the panel says when a participant's value for the question's Prefill from Property has no
 * choice, so that participant starts with nothing selected; undefined when every value has one.
 */
export function unmatchedChoiceWarning(
  question: Question,
  audience: ChoiceAudience | undefined,
): string | undefined {
  const variable = prefillVariableOf(question.defaultValueExpression);
  const choices = ownChoices(question);
  if (!audience || !variable || !choices) return undefined;
  const unmatched = unmatchedChoiceValues(choices, variable, audience.participants());
  if (unmatched.length === 0) return undefined;
  const title = prefillSourceNamed(audience.sources(), variable)?.title ?? variable;
  return (
    `No choice has the value ${listedValues(unmatched)}. ` +
    `Participants with these ${title} values start with nothing selected. ` +
    "Add a choice for each value, or change the choice values to match."
  );
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

type Warning = Question & { html: string };

function createWarning(parent: PanelModel, after: Question): Warning | undefined {
  const created = Serializer.createClass("html");
  if (!created) return undefined;
  const warning = created as Warning;
  warning.name = WARNING;
  warning.startWithNewLine = true;
  warning.onUpdateCssClassesCallback = (css: { questionWrapper?: string }) => {
    css.questionWrapper = "edx-prefill-values";
  };
  parent.addElement(warning, parent.elements.indexOf(after) + 1);
  return warning;
}

/** The warning under Prefill from: `text` shows it (escaped), undefined hides it. */
export function showChoiceWarning(editor: Question, text: string | undefined): void {
  const parent = editor.parent as PanelModel | undefined;
  if (!parent) return;
  const existing = parent.getQuestionByName(WARNING) as Warning | null;
  if (!text) {
    if (existing) existing.visible = false;
    return;
  }
  const warning = existing ?? createWarning(parent, editor);
  if (!warning) return;
  warning.html = `<p role="status">${escapeHtml(text)}</p>`;
  warning.visible = true;
}
