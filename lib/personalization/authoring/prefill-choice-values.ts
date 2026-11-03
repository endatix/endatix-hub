import {
  ItemValue,
  Serializer,
  type PanelModel,
  type Question,
} from "survey-core";
import type { AudienceVariablePreset } from "@/lib/endatix-api/audience/types";
import {
  prefillSourceNamed,
  prefillVariableOf,
  type PrefillSource,
} from "../coverage/prefill-match";

export const WARNING_QUESTION = "edxPrefillFrom_values";

type ChoiceQuestion = Question & {
  choices: ItemValue[];
  choicesFromQuestion?: string;
  choicesByUrl?: { url?: string };
  choicesLazyLoadEnabled?: boolean;
  choicesMin?: number;
  choicesMax?: number;
  showOtherItem?: boolean;
  allowCustomChoices?: boolean;
  showNoneItem?: boolean;
  noneItem?: ItemValue;
  showRefuseItem?: boolean;
  refuseItem?: ItemValue;
  showDontKnowItem?: boolean;
  dontKnowItem?: ItemValue;
};

const SPECIAL_ITEMS = [
  ["showNoneItem", "noneItem"],
  ["showRefuseItem", "refuseItem"],
  ["showDontKnowItem", "dontKnowItem"],
] as const;

/** Copied, fetched, lazily loaded or generated choices are not known in the designer. */
function choicesKnown(select: ChoiceQuestion): boolean {
  return !(
    select.choicesFromQuestion ||
    select.choicesByUrl?.url ||
    select.choicesLazyLoadEnabled ||
    select.choicesMin ||
    select.choicesMax
  );
}

/**
 * The choices a select question's default can select: those the author typed, and None, Refuse to
 * answer and Don't know when shown. Undefined when they are not known, or when Other or custom
 * choices may take any value, so a mismatch is not certain.
 */
function ownChoices(question: Question): ItemValue[] | undefined {
  if (!Serializer.isDescendantOf(question.getType(), "selectbase"))
    return undefined;
  const select = question as ChoiceQuestion;
  if (
    !choicesKnown(select) ||
    select.showOtherItem ||
    select.allowCustomChoices
  )
    return undefined;
  const special = SPECIAL_ITEMS.flatMap(([shown, item]) => {
    const shownItem = select[shown] ? select[item] : undefined;
    return shownItem ? [shownItem] : [];
  });
  return [...select.choices, ...special];
}

function heldValues(value: unknown): unknown[] {
  const values = Array.isArray(value) ? value : [value];
  return values.filter(
    (item) => item !== undefined && item !== null && item !== "",
  );
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
  const held = participants.flatMap((participant) =>
    heldValues(participant.variables[variable]),
  );
  const unmatched = held
    .filter((value) => !ItemValue.getItemByValue(choices, value))
    .map(String);
  return [...new Set(unmatched)].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
}

const LISTED_VALUES = 5;

/** Six values are listed in full: "or 1 other value" would be no shorter. */
function listedValues(values: string[]): string {
  if (values.length === 1) return values[0];
  if (values.length > LISTED_VALUES + 1) {
    return `${values.slice(0, LISTED_VALUES).join(", ")} or ${values.length - LISTED_VALUES} other values`;
  }
  return `${values.slice(0, -1).join(", ")} or ${values.at(-1)}`;
}

/** The Properties, and the participants the designer knows with their values. */
export type ChoiceAudience = {
  sources: () => PrefillSource[];
  participants: () => AudienceVariablePreset[];
};

function warningText(unmatched: string[], title: string): string {
  return (
    `No choice has the value ${listedValues(unmatched)}. ` +
    `Participants with these ${title} values start with nothing selected. ` +
    "Add a choice for each value, or change the choice values to match."
  );
}

/**
 * What the panel says when a participant's value for the question's Prefill from Property has no
 * choice, so that participant starts with nothing selected; undefined when every value has one.
 */
function unmatchedChoiceWarning(
  question: Question,
  audience: ChoiceAudience | undefined,
): string | undefined {
  const variable = prefillVariableOf(question.defaultValueExpression);
  const choices = ownChoices(question);
  if (!audience || !variable || !choices) return undefined;
  const participants = audience.participants();
  const unmatched = unmatchedChoiceValues(choices, variable, participants);
  if (unmatched.length === 0) return undefined;
  const source = prefillSourceNamed(audience.sources(), variable);
  return warningText(unmatched, source?.title ?? variable);
}

/** Escaped for HTML, and `{` too: the html question would read `{x}` as a survey variable. */
function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("{", "&#123;");
}

type Warning = Question & { html: string };

function createWarning(
  parent: PanelModel,
  after: Question,
): Warning | undefined {
  const created = Serializer.createClass("html");
  if (!created) return undefined;
  const warning = created as Warning;
  warning.name = WARNING_QUESTION;
  warning.startWithNewLine = true;
  warning.onUpdateCssClassesCallback = (css: { questionWrapper?: string }) => {
    css.questionWrapper = "edx-prefill-values";
  };
  parent.addElement(warning, parent.elements.indexOf(after) + 1);
  return warning;
}

/** The warning under Prefill from: `text` shows it (escaped), undefined hides it. */
function showWarning(editor: Question, text: string | undefined): void {
  const parent = editor.parent as PanelModel | undefined;
  if (!parent) return;
  const existing = parent.getQuestionByName(WARNING_QUESTION) as Warning | null;
  if (!text) {
    if (existing) existing.visible = false;
    return;
  }
  const warning = existing ?? createWarning(parent, editor);
  if (!warning) return;
  warning.html = `<p role="status">${escapeHtml(text)}</p>`;
  warning.visible = true;
}

const refreshers = new WeakMap<Question, () => void>();
let refreshShown: (() => void) | undefined;

/** Checks the warning shown last against participants read again since. */
export function refreshChoiceWarning(): void {
  refreshShown?.();
}

/**
 * Shows or hides the warning under Prefill from, and again whenever a choice's value changes. The
 * choices matrix edits a value in place, which `dependsOn` on `choices` does not see. One listener
 * per question; it refreshes the editor shown last.
 */
export function warnOnUnmatchedChoices(
  question: Question,
  editor: Question,
  audience: ChoiceAudience | undefined,
): void {
  const refresh = () =>
    showWarning(editor, unmatchedChoiceWarning(question, audience));
  if (!refreshers.has(question)) {
    question.onItemValuePropertyChanged.add((_, options: { name?: string }) => {
      if (options.name === "value") refreshers.get(question)?.();
    });
  }
  refreshers.set(question, refresh);
  refreshShown = refresh;
  refresh();
}
