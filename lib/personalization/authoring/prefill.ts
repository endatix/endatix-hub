import { Serializer, type Question } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { LOCAL_DATE_TIME_FUNCTION } from "@/lib/survey-features/local-date-time";

/** A question shape the API lists on `prefillTargets`, or the question being edited. */
export type PrefillShape = {
  type: string;
  inputType?: string;
};

/** One Property as the variables definition describes it, including its `prefillTargets`. */
export type PrefillSource = PrefillShape & {
  variable: string;
  title: string;
  prefillTargets?: PrefillShape[];
};

const PREFILL_FROM = "edxPrefillFrom";
const PREFILL_EDITABLE = "edxPrefillEditable";
const VARIABLE = "[A-Za-z0-9_]+";
const PLAIN_PREFILL = new RegExp(`^\\{(${VARIABLE})\\}$`);
const LOCAL_PREFILL = new RegExp(
  `^${LOCAL_DATE_TIME_FUNCTION}\\(\\{(${VARIABLE})\\}\\)$`,
);
const VARIABLE_NAME = new RegExp(`^${VARIABLE}$`);

const bindings = new WeakMap<object, () => PrefillSource[]>();
let propertiesRegistered = false;

/** Omitted, blank, and SurveyJS's default `text` are the same plain text input. */
function plainInput(inputType: string | undefined): string {
  if (inputType === undefined || inputType === "" || inputType === "text") {
    return "text";
  }
  return inputType;
}

function sameShape(question: PrefillShape, target: PrefillShape): boolean {
  return (
    question.type === target.type &&
    plainInput(question.inputType) === plainInput(target.inputType)
  );
}

/** A question fits a Property when its type and input type equal one `prefillTargets` entry. */
export function isPrefillCompatible(
  question: PrefillShape,
  targets: readonly PrefillShape[],
): boolean {
  return targets.some((target) => sameShape(question, target));
}

/**
 * `{age}` and `edxLocalDateTime({renews_at})` name a Property. A calculation, another function,
 * or any extra text does not.
 */
export function prefillVariableOf(
  expression: string | undefined,
): string | undefined {
  if (!expression) return undefined;
  return PLAIN_PREFILL.exec(expression)?.[1] ?? LOCAL_PREFILL.exec(expression)?.[1];
}

/**
 * The Property's type, in the words the definition already uses: a dropdown element is a single
 * choice, a date-time stays plain text and is recognized by the datetime-local target the API sends.
 */
function namedChoice(type: string): string | undefined {
  if (type === "dropdown") return "single choice";
  if (type === "checkbox" || type === "tagbox") return "multiple choice";
  return undefined;
}

function isDateTimeProperty(source: PrefillSource): boolean {
  return (
    source.prefillTargets?.some(
      (target) => target.type === "text" && target.inputType === "datetime-local",
    ) === true
  );
}

function textLabel(source: PrefillSource): string {
  if (source.inputType === "number") return "number";
  if (source.inputType === "date") return "date";
  if (isDateTimeProperty(source)) return "date-time";
  return "text";
}

function propertyTypeLabel(source: PrefillSource): string {
  const named = namedChoice(source.type);
  if (named) return named;
  if (source.type === "text") return textLabel(source);
  if (source.type === "comment") return "text";
  return source.type;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function shapeOf(value: unknown): PrefillShape | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined;
  const inputType = typeof value.inputType === "string" ? value.inputType : undefined;
  return { type: value.type, inputType };
}

/** Properties from the variables definition. An element without `prefillTargets` still counts. */
export function prefillSources(variables: AudienceVariables): PrefillSource[] {
  const elements = variables.variablePresets?.definition?.["elements"];
  if (!Array.isArray(elements)) return [];
  const sources: PrefillSource[] = [];
  for (const element of elements) {
    const shape = shapeOf(element);
    if (!isRecord(element) || !shape || typeof element.name !== "string") continue;
    const title = typeof element.title === "string" && element.title.trim()
      ? element.title
      : element.name;
    const targets = Array.isArray(element.prefillTargets)
      ? element.prefillTargets.flatMap((target) => {
          const parsed = shapeOf(target);
          return parsed ? [parsed] : [];
        })
      : undefined;
    sources.push({ ...shape, variable: element.name, title, prefillTargets: targets });
  }
  return sources;
}

function sourcesOf(obj: object | undefined): PrefillSource[] | undefined {
  const survey = obj && "survey" in obj ? (obj.survey as object | undefined) : undefined;
  if (!survey) return undefined;
  return bindings.get(survey)?.();
}

function offersPrefill(obj: object | undefined): boolean {
  const sources = sourcesOf(obj);
  return !!sources?.some((source) => Array.isArray(source.prefillTargets));
}

function inputTypeOf(question: Question): string | undefined {
  const inputType = (question as Question & { inputType?: unknown }).inputType;
  return typeof inputType === "string" ? inputType : undefined;
}

function questionShape(question: Question): PrefillShape {
  return { type: question.getType(), inputType: inputTypeOf(question) };
}

function choiceText(source: PrefillSource, compatible: boolean): string {
  if (compatible) return source.title;
  return `${source.title} (${propertyTypeLabel(source)})`;
}

function prefillChoices(question: Question | undefined): Array<{ value?: string; text: string }> {
  const sources = sourcesOf(question) ?? [];
  const shape = question ? questionShape(question) : undefined;
  const choices: Array<{ value?: string; text: string }> = [{ value: "", text: "" }];
  if (!shape) return choices;
  for (const source of sources) {
    if (!Array.isArray(source.prefillTargets)) continue;
    const compatible = isPrefillCompatible(shape, source.prefillTargets);
    choices.push({ value: source.variable, text: choiceText(source, compatible) });
  }
  return choices;
}

/** `datetime-local` keeps the wall clock via `edxLocalDateTime`; every other question uses `{var}`. */
function expressionFor(question: Question, variable: string): string {
  if (question.getType() === "text" && inputTypeOf(question) === "datetime-local") {
    return `${LOCAL_DATE_TIME_FUNCTION}({${variable}})`;
  }
  return `{${variable}}`;
}

const creators = new WeakMap<object, SurveyCreatorModel>();
let applyingPrefill = false;

function revealEditable(question: Question): void {
  const creator = question.survey ? creators.get(question.survey) : undefined;
  const editable = creator?.propertyGrid.getQuestionByName(PREFILL_EDITABLE);
  if (!editable) return;
  editable.visible =
    offersPrefill(question) && prefillVariableOf(question.defaultValueExpression) !== undefined;
}

function writePrefill(question: Question, variable: string | undefined, current: string | undefined): boolean {
  if (!variable) {
    if (prefillVariableOf(current) === undefined) return false;
    question.defaultValueExpression = undefined;
    question.readOnly = false;
    return true;
  }
  question.defaultValueExpression = expressionFor(question, variable);
  return true;
}

function commitPrefill(question: Question, value: unknown): void {
  const variable = typeof value === "string" && VARIABLE_NAME.test(value) ? value : undefined;
  const wrote = writePrefill(question, variable, question.defaultValueExpression);
  if (wrote) revealEditable(question);
}

function applyPrefill(question: Question, value: unknown): void {
  if (applyingPrefill) return;
  applyingPrefill = true;
  try {
    commitPrefill(question, value);
  } finally {
    applyingPrefill = false;
  }
}

function greyIncompatible(question: Question | undefined, editor: { choices?: Array<{ value?: unknown; text: string; setIsEnabled: (enabled: boolean) => void }> }): void {
  if (!question || !editor.choices) return;
  const shape = questionShape(question);
  const sources = sourcesOf(question) ?? [];
  for (const choice of editor.choices) {
    const source = sources.find((item) => item.variable === choice.value);
    if (!source || !Array.isArray(source.prefillTargets)) continue;
    const compatible = isPrefillCompatible(shape, source.prefillTargets);
    choice.text = choiceText(source, compatible);
    if (!compatible) choice.setIsEnabled(false);
  }
}

function prefillFromProperty() {
  return {
    name: PREFILL_FROM,
    type: "dropdown" as const,
    displayName: "Prefill from",
    category: "data",
    isSerializable: false,
    visibleIf: (obj: Question) => offersPrefill(obj),
    choices: (obj: Question) => prefillChoices(obj),
    onGetValue: (obj: Question) => prefillVariableOf(obj.defaultValueExpression),
    onSetValue: (obj: Question, value: unknown) => applyPrefill(obj, value),
    onPropertyEditorUpdate: greyIncompatible,
  };
}

function prefillEditableProperty() {
  return {
    name: PREFILL_EDITABLE,
    type: "boolean" as const,
    displayName: "Allow respondent to edit",
    category: "data",
    isSerializable: false,
    dependsOn: [PREFILL_FROM],
    visibleIf: (obj: Question) =>
      offersPrefill(obj) && prefillVariableOf(obj.defaultValueExpression) !== undefined,
    onGetValue: (obj: Question) => !obj.readOnly,
    onSetValue: (obj: Question, value: unknown) => {
      if (prefillVariableOf(obj.defaultValueExpression) === undefined) return;
      obj.readOnly = value !== true;
    },
  };
}

function registerProperties(): void {
  if (propertiesRegistered || Serializer.findProperty("question", PREFILL_FROM)) {
    propertiesRegistered = true;
    return;
  }
  Serializer.addProperty("question", prefillFromProperty());
  Serializer.addProperty("question", prefillEditableProperty());
  propertiesRegistered = true;
}

// SurveyJS attaches a custom property's setter only while the question is constructed.
// Registering here, on import, is what makes a question loaded before bind still write
// `defaultValueExpression`. `CustomPropertiesCollection` is not a public export.
registerProperties();

/**
 * Designer-only Prefill from and Allow respondent to edit. The saved JSON keeps
 * `defaultValueExpression` and `readOnly`. Nothing is shown until this survey is bound
 * and the variables definition carries `prefillTargets`.
 */
export function installPrefill(
  creator: SurveyCreatorModel,
  sources: () => PrefillSource[],
): () => void {
  registerProperties();
  const survey = creator.survey;
  bindings.set(survey, sources);
  creators.set(survey, creator);
  return () => {
    if (bindings.get(survey) !== sources) return;
    bindings.delete(survey);
    creators.delete(survey);
    hideOpenEditors(creator);
  };
}

/** The open property grid keeps its last visibility until the selection changes. */
function hideOpenEditors(creator: SurveyCreatorModel): void {
  const grid = creator.propertyGrid;
  for (const name of [PREFILL_FROM, PREFILL_EDITABLE]) {
    const editor = grid.getQuestionByName(name);
    if (editor) editor.visible = false;
  }
}
