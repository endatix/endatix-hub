import { ItemValue, Serializer, type PanelModel, type Question } from "survey-core";
import type { AudienceVariablePreset } from "@/lib/endatix-api/audience/types";

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
 * The participants' values for `variable` that no choice of `question` has, each once, in the
 * order the participants hold them. A choice is selected only when its value equals the prefill,
 * compared as SurveyJS compares them (`1` matches `"1"`).
 */
export function unmatchedChoiceValues(
  question: Question,
  variable: string,
  participants: readonly AudienceVariablePreset[],
): string[] {
  const choices = ownChoices(question);
  if (!choices) return [];
  const unmatched = new Set<string>();
  for (const participant of participants) {
    for (const value of heldValues(participant.variables[variable])) {
      if (!ItemValue.getItemByValue(choices, value)) unmatched.add(String(value));
    }
  }
  return [...unmatched];
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
