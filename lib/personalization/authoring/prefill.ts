import { Serializer, SvgRegistry, type Question } from "survey-core";
import { getLocaleStrings, type SurveyCreatorModel, type SurveyInstanceCreatedEvent } from "survey-creator-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { withBasePath } from "@/lib/hosting";
import { formRoutes } from "@/lib/routes/form-routes";
import { LOCAL_DATE_TIME_FUNCTION } from "@/lib/survey-features/local-date-time";
import { PREFILL_CHOICE, registerPrefillChoice } from "./prefill-choice";

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

const PREFILL_HEADER = "edxPrefillHeader";
const PREFILL_FROM = "edxPrefillFrom";
const PREFILL_EXPRESSION_LINK = "edxPrefillFrom_expression";
const CUSTOM_EXPRESSION = "edx-custom-expression";
const PREFILL_EDITABLE = "edxPrefillEditable";
const PREFILL_CATEGORY = "personalization";
const PREFILL_KIND = "edxPrefillKind";
const PERSONALIZATION_ICON = "icon-personalization";
const VARIABLE = "[A-Za-z0-9_]+";
const PLAIN_PREFILL = new RegExp(String.raw`^\{(${VARIABLE})\}$`);
const LOCAL_PREFILL = new RegExp(
  String.raw`^${LOCAL_DATE_TIME_FUNCTION}\(\{(${VARIABLE})\}\)$`,
);
const VARIABLE_NAME = new RegExp(String.raw`^${VARIABLE}$`);

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

/** An expression the dropdown did not write, such as `{age} * 12`. Shown, and left unchanged. */
function customExpression(expression: string | undefined): string | undefined {
  const trimmed = expression?.trim();
  if (!trimmed || prefillVariableOf(trimmed) !== undefined) return undefined;
  return trimmed;
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

/** Bound only while personalization is on: the designer skips the bind when the flag is off. */
function prefillBound(obj: object | undefined): boolean {
  return sourcesOf(obj) !== undefined;
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

function prefillChoices(question: Question | undefined): Array<{ value?: string; text: string }> {
  const sources = sourcesOf(question) ?? [];
  const shape = question ? questionShape(question) : undefined;
  const choices: Array<{ value?: string; text: string }> = [{ value: "", text: "" }];
  if (question && customExpression(question.defaultValueExpression)) {
    choices.push({ value: CUSTOM_EXPRESSION, text: "Custom expression" });
  }
  if (!shape) return choices;
  for (const source of sources) {
    if (!Array.isArray(source.prefillTargets)) continue;
    if (!isPrefillCompatible(shape, source.prefillTargets)) continue;
    choices.push({ value: source.variable, text: source.title });
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
  editable.visible = prefillBound(question) && hasPrefillExpression(question);
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

function greyIncompatible(question: Question | undefined, editor: Question): void {
  if (!question || !editor.choices) return;
  editor.itemComponent = PREFILL_CHOICE;
  const shape = questionShape(question);
  const sources = sourcesOf(question) ?? [];
  for (const choice of editor.choices) {
    if (choice.value === CUSTOM_EXPRESSION) {
      choice.text = "Custom expression";
      continue;
    }
    const source = sources.find((item) => item.variable === choice.value);
    if (!source || !Array.isArray(source.prefillTargets)) continue;
    choice.text = source.title;
    choice.component = PREFILL_CHOICE;
    choice.setPropertyValue(PREFILL_KIND, propertyTypeLabel(source));
    if (!isPrefillCompatible(shape, source.prefillTargets)) choice.setIsEnabled(false);
  }
}

type ExpressionLink = Question & {
  linkValueText: string;
  showValueInLink: boolean;
  allowClear: boolean;
  linkClickCallback: () => void;
  onUpdateCssClassesCallback: (css: { questionWrapper?: string }) => void;
};

/**
 * A custom expression is not a Property. The dropdown stays on "Custom expression" so a
 * Property can replace it, and the expression is a link on the next line. The link focuses
 * `defaultValueExpression`, as Visible does for `visibleIf`.
 */
function linkToExpression(question: Question | undefined, editor: Question): void {
  const parent = editor.parent;
  if (!question || !parent) return;
  const custom = customExpression(question.defaultValueExpression);
  const existing = parent.getQuestionByName(PREFILL_EXPRESSION_LINK) as ExpressionLink | null;
  if (!custom) {
    if (existing) existing.visible = false;
    return;
  }
  const link = existing ?? createExpressionLink(editor);
  if (!link) return;
  link.visible = true;
  link.startWithNewLine = true;
  link.showValueInLink = false;
  link.allowClear = false;
  link.linkValueText = custom;
  link.linkClickCallback = () => {
    editor.survey?.getQuestionByName("defaultValueExpression")?.focus(false, true);
  };
}

function createExpressionLink(editor: Question): ExpressionLink | undefined {
  const parent = editor.parent;
  if (!parent) return undefined;
  const created = Serializer.createClass("linkvalue");
  if (!created) return undefined;
  const link = created as ExpressionLink;
  link.name = PREFILL_EXPRESSION_LINK;
  link.startWithNewLine = true;
  link.titleLocation = "hidden";
  link.onUpdateCssClassesCallback = (css) => {
    css.questionWrapper = "edx-prefill-expression";
  };
  const index = parent.elements.indexOf(editor);
  parent.addElement(link, index < 0 ? undefined : index + 1);
  return link;
}

function prefillValue(question: Question): string | undefined {
  if (customExpression(question.defaultValueExpression)) return CUSTOM_EXPRESSION;
  return prefillVariableOf(question.defaultValueExpression);
}

function hasPrefillExpression(question: Question): boolean {
  const expression = question.defaultValueExpression;
  return prefillVariableOf(expression) !== undefined || customExpression(expression) !== undefined;
}

function prefillFromProperty() {
  return {
    name: PREFILL_FROM,
    type: "dropdown" as const,
    displayName: "Prefill from",
    category: PREFILL_CATEGORY,
    isSerializable: false,
    visibleIf: (obj: Question) => prefillBound(obj),
    enableIf: (obj: Question) => offersPrefill(obj),
    dependsOn: ["defaultValueExpression"],
    choices: (obj: Question) => prefillChoices(obj),
    onGetValue: (obj: Question) => prefillValue(obj),
    onSetValue: (obj: Question, value: unknown) => applyPrefill(obj, value),
    onPropertyEditorUpdate: (obj: Question, editor: Question) => {
      greyIncompatible(obj, editor);
      linkToExpression(obj, editor);
    },
  };
}

function prefillEditableProperty() {
  return {
    name: PREFILL_EDITABLE,
    type: "boolean" as const,
    displayName: "Allow respondent to edit",
    category: PREFILL_CATEGORY,
    isSerializable: false,
    dependsOn: [PREFILL_FROM, "defaultValueExpression"],
    visibleIf: (obj: Question) => prefillBound(obj) && hasPrefillExpression(obj),
    onGetValue: (obj: Question) => !obj.readOnly,
    onSetValue: (obj: Question, value: unknown) => {
      if (!hasPrefillExpression(obj)) return;
      obj.readOnly = value !== true;
    },
  };
}

const FILLED_HELP =
  "Start this question with a participant Property. The form saves that as its default value expression. " +
  "Only a Property whose value fits this question is listed. " +
  "A date and time question keeps the stored clock and drops the time-zone offset. " +
  "An expression that is not a single Property, such as &#123;age&#125; * 12, is shown here and left as written until you pick a Property.";

const EDITABLE_HELP =
  "On by default, so the participant can change the prefilled answer. " +
  "Turn it off and the question stays read-only, with the prefilled value kept.";

function participantsLink(formId: string | undefined): string {
  if (!formId) return "Participants";
  const href = withBasePath(formRoutes.audience(formId));
  return `<a target="_blank" rel="noopener noreferrer" href="${href}">Participants</a>`;
}

function emptyHelp(formId: string | undefined): string {
  return (
    `Add Properties on the ${participantsLink(formId)} page to enable this list. ` +
    "A Property is a participant value this question can start with."
  );
}

function registerPrefillHelp(formId: string | undefined, hasTargets: boolean): void {
  const help = getLocaleStrings("en").pehelp;
  help[PREFILL_FROM] = hasTargets ? FILLED_HELP : emptyHelp(formId);
  help[PREFILL_EDITABLE] = EDITABLE_HELP;
}

/**
 * A person drawn as rings, so the rail paints it with `fill: currentColor` the way the
 * SurveyJS tab icons are painted. A filled silhouette reads heavier than those line icons.
 */
const PERSONALIZATION_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
  '<path fill-rule="evenodd" d="M12 3.8a3.2 3.2 0 1 0 .02 0zM12 5.5a1.5 1.5 0 1 1-.02 0z"/>' +
  '<path d="M4.6 20.4V18c0-3.2 3.3-5.2 7.4-5.2s7.4 2 7.4 5.2v2.4h-1.7V18c0-2.2-2.5-3.5-5.7-3.5S6.3 15.8 6.3 18v2.4H4.6z"/>' +
  "</svg>";

function registerPersonalizationIcon(): void {
  SvgRegistry.registerIcon(PERSONALIZATION_ICON, PERSONALIZATION_ICON_SVG);
}

function namePersonalization(survey: { getPageByName: (name: string) => { title: string; iconName?: string } | null }): void {
  const page = survey.getPageByName(PREFILL_CATEGORY);
  if (!page) return;
  page.title = "Personalization";
  page.iconName = PERSONALIZATION_ICON;
}

function placeInCategory(
  name: string,
  visibleIf: (obj: Question) => boolean,
  enableIf?: (obj: Question) => boolean,
): void {
  const property = Serializer.findProperty("question", name);
  if (!property) return;
  property.category = PREFILL_CATEGORY;
  property.visibleIf = visibleIf;
  if (enableIf) property.enableIf = enableIf;
  if (name === PREFILL_FROM) property.dependsOn = ["defaultValueExpression"];
}

function registerProperties(): void {
  registerPrefillChoice();
  registerPrefillHelp(undefined, true);
  registerPersonalizationIcon();
  if (!Serializer.findProperty("itemvalue", PREFILL_KIND)) {
    Serializer.addProperty("itemvalue", { name: PREFILL_KIND, type: "string", visible: false });
  }
  const staleHeader = Serializer.findProperty("question", PREFILL_HEADER);
  if (staleHeader) staleHeader.visibleIf = () => false;
  const existing = Serializer.findProperty("question", PREFILL_FROM);
  if (propertiesRegistered || existing) {
    placeInCategory(PREFILL_FROM, prefillBound, offersPrefill);
    placeInCategory(PREFILL_EDITABLE, (obj) => prefillBound(obj) && hasPrefillExpression(obj));
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

function attachSurvey(
  survey: object,
  creator: SurveyCreatorModel,
  sources: () => PrefillSource[],
): void {
  bindings.set(survey, sources);
  creators.set(survey, creator);
}

function detachSurvey(survey: object, sources: () => PrefillSource[]): void {
  if (bindings.get(survey) !== sources) return;
  bindings.delete(survey);
  creators.delete(survey);
}

/**
 * Designer-only Prefill from and Allow respondent to edit, on their own Personalization
 * tab. The saved JSON keeps `defaultValueExpression` and `readOnly`. Shown only after
 * this survey is bound, which the designer does when personalization is on. With no
 * Properties the list stays visible and disabled, and its help points at Participants.
 * A custom expression is shown in the list and is not rewritten until a Property is picked.
 *
 * `creator.JSON =` builds a new designer survey after bind, so the sources follow every
 * `onSurveyInstanceCreated` with reason `designer` (fired before `setSurvey`).
 */
export function installPrefill(
  creator: SurveyCreatorModel,
  sources: () => PrefillSource[],
  formId?: string,
): () => void {
  registerProperties();
  const read = () => {
    const list = sources();
    registerPrefillHelp(
      formId,
      list.some((source) => Array.isArray(source.prefillTargets)),
    );
    return list;
  };
  read();
  namePersonalization(creator.propertyGrid);
  let attached: object | undefined = creator.survey;
  if (attached) attachSurvey(attached, creator, read);

  const onDesignerSurvey = (
    _: unknown,
    options: SurveyInstanceCreatedEvent,
  ): void => {
    if (options.area === "property-grid") {
      namePersonalization(options.survey);
      return;
    }
    if (options.reason !== "designer") return;
    if (attached) detachSurvey(attached, read);
    attached = options.survey;
    attachSurvey(attached, creator, read);
  };
  creator.onSurveyInstanceCreated.add(onDesignerSurvey);

  return () => {
    creator.onSurveyInstanceCreated.remove(onDesignerSurvey);
    if (attached) detachSurvey(attached, read);
    hideOpenEditors(creator);
  };
}

/** The open property grid keeps its last visibility until the selection changes. */
function hideOpenEditors(creator: SurveyCreatorModel): void {
  const grid = creator.propertyGrid;
  for (const name of [PREFILL_HEADER, PREFILL_FROM, PREFILL_EDITABLE]) {
    const editor = grid.getQuestionByName(name);
    if (editor) editor.visible = false;
  }
}
