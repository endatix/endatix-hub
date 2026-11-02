import { Serializer, SvgRegistry, type ItemValue, type PanelModel, type Question } from "survey-core";
import { getLocaleStrings, type SurveyCreatorModel, type SurveyInstanceCreatedEvent } from "survey-creator-core";
import { withBasePath } from "@/lib/hosting";
import { formRoutes } from "@/lib/routes/form-routes";
import { LOCAL_DATE_TIME_FUNCTION } from "@/lib/survey-features/local-date-time";
import {
  isPrefillCompatible,
  prefillVariableOf,
  type PrefillShape,
  type PrefillSource,
} from "../coverage/prefill-match";
import { PREFILL_CHOICE, registerPrefillChoice } from "./prefill-choice";

export type { PrefillShape, PrefillSource };
export { isPrefillCompatible, prefillVariableOf };
export { prefillSources } from "../coverage/prefill-match";

const PREFILL_FROM = "edxPrefillFrom";
const PREFILL_EXPRESSION_LINK = "edxPrefillFrom_expression";
const CUSTOM_EXPRESSION = "edx-custom-expression";
const PREFILL_EDITABLE = "edxPrefillEditable";
const PREFILL_CATEGORY = "personalization";
const PREFILL_KIND = "edxPrefillKind";
const PERSONALIZATION_ICON = "icon-personalization";
const VARIABLE_NAME = /^\w+$/;

type PrefillBinding = {
  sources: () => PrefillSource[];
  formId?: string;
};

const bindings = new WeakMap<object, PrefillBinding>();
let propertiesRegistered = false;

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

export function propertyTypeLabel(source: PrefillSource): string {
  const named = namedChoice(source.type);
  if (named) return named;
  if (source.type === "text") return textLabel(source);
  if (source.type === "comment") return "text";
  return source.type;
}

export function targetQuestion(target: PrefillShape): string {
  if (target.type === "text") {
    if (target.inputType === "number") return "Number";
    if (target.inputType === "date") return "Date";
    if (target.inputType === "datetime-local") return "Date and Time";
    return "Single-Line Input";
  }
  if (target.type === "comment") return "Long Text";
  if (target.type === "boolean") return "Yes/No (Boolean)";
  if (target.type === "dropdown") return "Dropdown";
  if (target.type === "radiogroup") return "Radio";
  if (target.type === "buttongroup") return "Button group";
  if (target.type === "tagbox") return "Multi-Select Dropdown";
  return target.type;
}

export function englishList(items: string[]): string {
  const unique = [...new Set(items)];
  if (unique.length <= 1) return unique[0] ?? "";
  if (unique.length === 2) return `${unique[0]} or ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")} or ${unique.at(-1)}`;
}

/** A disabled row names the Property and the questions that can take it. */
function disabledHint(source: PrefillSource): string {
  const type = propertyTypeLabel(source);
  const fitting = englishList((source.prefillTargets ?? []).map((target) => targetQuestion(target)));
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}. Use a ${fitting} question.`;
}

function bindingOf(obj: object | undefined): PrefillBinding | undefined {
  const survey = obj && "survey" in obj ? (obj.survey as object | undefined) : undefined;
  if (!survey) return undefined;
  return bindings.get(survey);
}

function sourcesOf(obj: object | undefined): PrefillSource[] | undefined {
  return bindingOf(obj)?.sources();
}

/** Bound only while personalization is on: the designer skips the bind when the flag is off. */
function prefillBound(obj: object | undefined): boolean {
  return sourcesOf(obj) !== undefined;
}

function offersPrefill(obj: object | undefined): boolean {
  const sources = sourcesOf(obj);
  return !!sources?.some((source) => Array.isArray(source.prefillTargets));
}

/** Properties from an API that does not send `prefillTargets`. The tab stays hidden. */
function legacyCatalog(obj: object | undefined): boolean {
  const sources = sourcesOf(obj);
  return !!sources?.length && !offersPrefill(obj);
}

/**
 * The question type exposes `defaultValueExpression`. A nonvalue question (html, image) inherits
 * the property and still has no answer to prefill, so it does not count.
 */
function hasDefaultValueExpression(question: Question): boolean {
  const property = Serializer.findProperty(question.getType(), "defaultValueExpression");
  if (!property?.isVisible("")) return false;
  return !Serializer.isDescendantOf(question.getType(), "nonvalue");
}

/**
 * Some Property lists this question's type among its `prefillTargets` (any `inputType`), so a
 * matrix or a file question, which no Property can fill, has no Personalization tab. With no
 * Properties yet the tab stays, to point at Participants.
 */
function takesSomeProperty(question: Question): boolean {
  const sources = sourcesOf(question) ?? [];
  if (sources.length === 0) return true;
  const type = question.getType();
  return sources.some((source) => source.prefillTargets?.some((target) => target.type === type));
}

function showPrefill(question: Question): boolean {
  return (
    prefillBound(question) &&
    hasDefaultValueExpression(question) &&
    !legacyCatalog(question) &&
    takesSomeProperty(question)
  );
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
  editable.visible = showPrefill(question) && hasPrefillExpression(question);
}

function writePrefill(question: Question, variable: string | undefined, current: string | undefined): boolean {
  if (!variable) {
    if (prefillVariableOf(current) === undefined) return false;
    question.defaultValueExpression = undefined;
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

const NO_FIT = "No Property fits this question type.";

/**
 * The popup renders `visibleChoices`, which SurveyJS rebuilds from `choices` whenever they are
 * reassigned. Creator copies only `value` and `text` into `choices`, so the type and the
 * disabled state are stamped on each rebuilt row, including its component (not question.itemComponent, which the closed dropdown also renders).
 */
function greyRows(question: Question, editor: Question): boolean {
  const shape = questionShape(question);
  const sources = sourcesOf(question) ?? [];
  let anyFit = false;
  for (const choice of editor.visibleChoices as ItemValue[]) {
    const source = sources.find((item) => item.variable === choice.value);
    if (!source || !Array.isArray(source.prefillTargets)) continue;
    const fits = isPrefillCompatible(shape, source.prefillTargets);
    choice.setPropertyValue(PREFILL_KIND, fits ? propertyTypeLabel(source) : disabledHint(source));
    choice.setIsEnabled(fits);
    choice.component = PREFILL_CHOICE;
    if (fits) anyFit = true;
  }
  return anyFit;
}

const greyedEditors = new WeakMap<Question, Question>();

function greyIncompatible(question: Question | undefined, editor: Question): void {
  if (!question) return;
  if (!greyedEditors.has(editor)) {
    editor.registerFunctionOnPropertyValueChanged("visibleChoices", () => {
      const current = greyedEditors.get(editor);
      if (current) greyRows(current, editor);
    });
  }
  greyedEditors.set(editor, question);
  const anyFit = greyRows(question, editor);
  editor.placeholder = offersPrefill(question) && !anyFit ? NO_FIT : "Select...";
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
  const parent = editor.parent as PanelModel | undefined;
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
  link.linkValueText = CUSTOM_EXPRESSION_TEXT;
  link.linkClickCallback = () => {
    const target = editor.survey?.getQuestionByName("defaultValueExpression") as Question | undefined;
    target?.focus(false, true);
  };
}

function createExpressionLink(editor: Question): ExpressionLink | undefined {
  const parent = editor.parent as PanelModel | undefined;
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
  if (index < 0) parent.addElement(link);
  else parent.addElement(link, index + 1);
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
    visibleIf: (obj: Question) => showPrefill(obj),
    enableIf: (obj: Question) => offersPrefill(obj),
    dependsOn: ["defaultValueExpression", "inputType"],
    choices: (obj: Question) => prefillChoices(obj),
    onGetValue: (obj: Question) => prefillValue(obj),
    onSetValue: (obj: Question, value: unknown) => applyPrefill(obj, value),
    onPropertyEditorUpdate: (obj: Question, editor: Question) => {
      editor.description = prefillHelp(obj);
      greyIncompatible(obj, editor);
      linkToExpression(obj, editor);
      // Clearing a custom expression would do nothing: only a Property replaces it.
      editor.allowClear = customExpression(obj.defaultValueExpression) === undefined;
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
    visibleIf: (obj: Question) => showPrefill(obj) && hasPrefillExpression(obj),
    onGetValue: (obj: Question) => !obj.readOnly,
    onSetValue: (obj: Question, value: unknown) => {
      if (!hasPrefillExpression(obj)) return;
      obj.readOnly = value !== true;
    },
    onPropertyEditorUpdate: (_obj: Question, editor: Question) => {
      editor.description = EDITABLE_HELP;
    },
  };
}

const FILLED_HELP =
  "Start this answer with the participant's Property value. Only Properties that fit this question can be picked; the others show their type. A date-time Property fills a date-and-time question with the time as stored, without the time zone.";

const CUSTOM_EXPRESSION_TEXT =
  "This question's default is a calculation. It stays as written unless you pick a Property. Edit it in Default value expression.";

const EDITABLE_HELP =
  "Off makes the answer read-only in the form. It is not a security control: the value can still be changed outside the form.";

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

function prefillHelp(question: Question): string {
  return offersPrefill(question) ? FILLED_HELP : emptyHelp(bindingOf(question)?.formId);
}

/**
 * A person drawn as rings, so the rail paints it with `fill: currentColor` the way the
 * SurveyJS tab icons are painted. A filled silhouette reads heavier than those line icons.
 */
export const PERSONALIZATION_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
  '<path fill-rule="evenodd" d="M12 3.8a3.2 3.2 0 1 0 .02 0zM12 5.5a1.5 1.5 0 1 1-.02 0z"/>' +
  '<path d="M4.6 20.4V18c0-3.2 3.3-5.2 7.4-5.2s7.4 2 7.4 5.2v2.4h-1.7V18c0-2.2-2.5-3.5-5.7-3.5S6.3 15.8 6.3 18v2.4H4.6z"/>' +
  "</svg>";

function registerPersonalizationIcon(): void {
  SvgRegistry.registerIcon(PERSONALIZATION_ICON, PERSONALIZATION_ICON_SVG);
}

function namePersonalization(survey: { getPageByName: (name: string) => unknown }): void {
  const page = survey.getPageByName(PREFILL_CATEGORY) as { iconName?: string } | null;
  if (page) page.iconName = PERSONALIZATION_ICON;
}

function registerPersonalizationLocale(): void {
  const tabs = getLocaleStrings("en").pe?.tabs as Record<string, string> | undefined;
  if (tabs) tabs.personalization = "Personalization";
}

function registerProperties(): void {
  registerPrefillChoice();
  registerPersonalizationLocale();
  registerPersonalizationIcon();
  const kind = Serializer.findProperty("itemvalue", PREFILL_KIND);
  if (!kind) {
    Serializer.addProperty("itemvalue", {
      name: PREFILL_KIND,
      type: "string",
      visible: false,
      isSerializable: false,
    });
  } else {
    kind.isSerializable = false;
  }
  if (propertiesRegistered || Serializer.findProperty("question", PREFILL_FROM)) {
    propertiesRegistered = true;
    return;
  }
  const prefillFrom = prefillFromProperty();
  Serializer.addProperty("question", {
    ...prefillFrom,
    // `inputType` lives on the text question class; wire it after register (see below).
    dependsOn: ["defaultValueExpression"],
  });
  Serializer.findProperty("text", "inputType")?.addDependedProperty(PREFILL_FROM);
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
  formId?: string,
): void {
  bindings.set(survey, { sources, formId });
  creators.set(survey, creator);
}

function detachSurvey(survey: object, sources: () => PrefillSource[]): void {
  if (bindings.get(survey)?.sources !== sources) return;
  bindings.delete(survey);
  creators.delete(survey);
}

/**
 * Designer-only Prefill from and Allow respondent to edit, on their own Personalization
 * tab. The saved JSON keeps `defaultValueExpression` and `readOnly`. Shown only after
 * this survey is bound, which the designer does when personalization is on. With no
 * Properties the list stays visible and disabled, and its help points at Participants.
 * Properties from an API without `prefillTargets` hide the tab. A custom expression is
 * shown in the list and is not rewritten until a Property is picked. Clearing a Property
 * leaves `readOnly` as the author set it.
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
  const read = () => sources();
  namePersonalization(creator.propertyGrid);
  let attached: object | undefined = creator.survey;
  if (attached) attachSurvey(attached, creator, read, formId);

  const onDesignerSurvey = (
    _: unknown,
    options: SurveyInstanceCreatedEvent,
  ): void => {
    if (options.area === "property-grid") {
      namePersonalization(options.survey);
      return;
    }
    if (options.area !== "designer-tab") return;
    if (attached) detachSurvey(attached, read);
    attached = options.survey;
    attachSurvey(attached, creator, read, formId);
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
  for (const name of [PREFILL_FROM, PREFILL_EDITABLE]) {
    const editor = grid.getQuestionByName(name);
    if (editor) editor.visible = false;
  }
}
